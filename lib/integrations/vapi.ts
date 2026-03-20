'use server';

import { createClient } from '@/lib/supabase/server';
import type {
  IntegrationResult,
  VAPIAssistantConfig,
  VAPIAssistantResult,
  VAPIConfig,
} from './types';

// =====================================================
// Types
// =====================================================

type VAPIClient = {
  apiKey: string;
  phoneNumberId?: string;
};

// =====================================================
// Lazy Initialization
// =====================================================

const clientCache = new Map<string, VAPIClient>();

async function getVAPIClient(workspaceId: string): Promise<VAPIClient | null> {
  if (clientCache.has(workspaceId)) {
    return clientCache.get(workspaceId)!;
  }

  const supabase = await createClient();
  const { data: settings } = await supabase
    .from('workspace_integrations')
    .select('encrypted_token, config')
    .eq('workspace_id', workspaceId)
    .eq('provider', 'vapi')
    .single();

  if (!settings?.encrypted_token) {
    return null;
  }

  const config = settings.config as VAPIConfig | null;

  const client: VAPIClient = {
    apiKey: settings.encrypted_token,
    phoneNumberId: config?.defaultPhoneNumberId,
  };

  clientCache.set(workspaceId, client);
  return client;
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * Make authenticated request to VAPI API
 */
async function vapiFetch(
  client: VAPIClient,
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  return fetch(`https://api.vapi.ai${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${client.apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

/**
 * Build webhook URL for this project
 */
function getWebhookUrl(projectId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://portal.qualiasolutions.net';
  return `${baseUrl}/api/vapi/webhook?project=${projectId}`;
}

/**
 * Build system prompt for assistant
 */
function buildSystemPrompt(config: VAPIAssistantConfig, clientName?: string): string {
  const voiceConfigs: Record<
    'voice_agent' | 'ai_agent',
    { defaultVoice: string; defaultModel: string; basePrompt: string }
  > = {
    voice_agent: {
      defaultVoice: 'rachel',
      defaultModel: 'gpt-4-turbo-preview',
      basePrompt:
        'You are a helpful voice assistant for {company}. Be friendly, professional, and concise.',
    },
    ai_agent: {
      defaultVoice: 'adam',
      defaultModel: 'gpt-4-turbo-preview',
      basePrompt:
        'You are an AI agent assistant for {company}. Help users with their requests efficiently.',
    },
  };

  const baseConfig =
    voiceConfigs[config.projectType === 'voice_agent' ? 'voice_agent' : 'ai_agent'];

  if (config.customSystemPrompt) {
    return config.customSystemPrompt
      .replace('{company}', clientName || 'our company')
      .replace('{project}', config.name);
  }

  return baseConfig.basePrompt
    .replace('{company}', clientName || 'our company')
    .replace('{project}', config.name);
}

// =====================================================
// Main Functions
// =====================================================

/**
 * Check if an assistant with this name already exists
 */
export async function checkAssistantExists(
  workspaceId: string,
  name: string
): Promise<{ exists: boolean; assistantId?: string }> {
  const client = await getVAPIClient(workspaceId);
  if (!client) return { exists: false };

  try {
    const response = await vapiFetch(client, '/assistant');
    if (!response.ok) return { exists: false };

    const assistants = (await response.json()) as Array<{ name: string; id: string }>;
    const existing = assistants.find((a) => a.name === name);

    return {
      exists: !!existing,
      assistantId: existing?.id,
    };
  } catch {
    return { exists: false };
  }
}

/**
 * Create VAPI assistant from template
 */
export async function createVAPIAssistant(
  workspaceId: string,
  config: VAPIAssistantConfig,
  clientName?: string
): Promise<IntegrationResult<VAPIAssistantResult>> {
  const client = await getVAPIClient(workspaceId);

  if (!client) {
    return {
      success: false,
      error: 'VAPI integration not configured. Please add your VAPI API key in Settings.',
    };
  }

  // Only voice_agent and ai_agent support voice assistants
  if (config.projectType !== 'voice_agent' && config.projectType !== 'ai_agent') {
    return {
      success: false,
      error: 'VAPI assistants are only supported for Voice Agent and AI Agent projects.',
    };
  }

  const webhookUrl = getWebhookUrl(config.projectId);

  const voiceConfigs: Record<
    'voice_agent' | 'ai_agent',
    { defaultVoice: string; defaultModel: string; basePrompt: string }
  > = {
    voice_agent: {
      defaultVoice: 'rachel',
      defaultModel: 'gpt-4-turbo-preview',
      basePrompt:
        'You are a helpful voice assistant for {company}. Be friendly, professional, and concise.',
    },
    ai_agent: {
      defaultVoice: 'adam',
      defaultModel: 'gpt-4-turbo-preview',
      basePrompt:
        'You are an AI agent assistant for {company}. Help users with their requests efficiently.',
    },
  };

  const voiceConfig =
    voiceConfigs[config.projectType === 'voice_agent' ? 'voice_agent' : 'ai_agent'];

  try {
    // 1. Check if assistant already exists (idempotency)
    const { exists, assistantId: existingId } = await checkAssistantExists(
      workspaceId,
      config.name
    );

    if (exists && existingId) {
      return {
        success: true,
        data: {
          assistantId: existingId,
          phoneNumberId: client.phoneNumberId,
          webhookUrl,
        },
      };
    }

    // 2. Create assistant
    const systemPrompt = buildSystemPrompt(config, clientName);

    const response = await vapiFetch(client, '/assistant', {
      method: 'POST',
      body: JSON.stringify({
        name: config.name,

        // Model configuration
        model: {
          provider: 'openai',
          model: config.model || voiceConfig.defaultModel,
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
          ],
        },

        // Voice configuration (ElevenLabs)
        voice: {
          provider: 'elevenlabs',
          voiceId: config.voiceId || voiceConfig.defaultVoice,
          stability: 0.5,
          similarityBoost: 0.75,
        },

        // Webhook for function calling
        serverUrl: webhookUrl,
        serverUrlSecret: process.env.VAPI_WEBHOOK_SECRET,

        // Behavior settings
        firstMessage: `Hello! How can I help you with ${config.name} today?`,
        endCallMessage: 'Goodbye! Thank you for calling.',
        silenceTimeoutSeconds: 30,
        maxDurationSeconds: 600, // 10 minutes max

        // Transcription
        transcriber: {
          provider: 'deepgram',
          model: 'nova-2',
          language: 'en',
        },

        // Function calling (tools will be handled by webhook)
        functions: [
          {
            name: 'search_knowledge_base',
            description: 'Search the project knowledge base for information',
            parameters: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'Search query' },
              },
              required: ['query'],
            },
          },
          {
            name: 'create_task',
            description: 'Create a new task or issue',
            parameters: {
              type: 'object',
              properties: {
                title: { type: 'string', description: 'Task title' },
                description: { type: 'string', description: 'Task description' },
                priority: {
                  type: 'string',
                  enum: ['low', 'medium', 'high', 'urgent'],
                },
              },
              required: ['title'],
            },
          },
          {
            name: 'get_project_status',
            description: 'Get the current status and progress of the project',
            parameters: {
              type: 'object',
              properties: {},
            },
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[VAPI] Create assistant error:', errorData);
      return {
        success: false,
        error: (errorData as { message?: string }).message || 'Failed to create VAPI assistant',
      };
    }

    const assistant = (await response.json()) as { id: string };

    // 3. Associate phone number if available
    let phoneNumberId = client.phoneNumberId;
    if (phoneNumberId) {
      try {
        await vapiFetch(client, `/phone-number/${phoneNumberId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            assistantId: assistant.id,
          }),
        });
      } catch {
        console.warn('[VAPI] Failed to associate phone number');
        phoneNumberId = undefined;
      }
    }

    return {
      success: true,
      data: {
        assistantId: assistant.id,
        phoneNumberId,
        webhookUrl,
      },
    };
  } catch (error: unknown) {
    console.error('[VAPI] createVAPIAssistant error:', error);
    const err = error as { message?: string };
    return { success: false, error: err.message || 'Failed to create VAPI assistant' };
  }
}

/**
 * Test VAPI connection
 */
export async function testVAPIConnection(
  apiKey: string
): Promise<IntegrationResult<{ assistantCount: number }>> {
  try {
    const client: VAPIClient = { apiKey };

    const response = await vapiFetch(client, '/assistant');

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: (errorData as { message?: string }).message || 'Invalid VAPI API key',
      };
    }

    const assistants = (await response.json()) as Array<unknown>;

    return {
      success: true,
      data: {
        assistantCount: assistants.length,
      },
    };
  } catch (error: unknown) {
    const err = error as { message?: string };
    return { success: false, error: err.message || 'Failed to connect to VAPI' };
  }
}

/**
 * Delete VAPI assistant
 */
export async function deleteVAPIAssistant(
  workspaceId: string,
  assistantId: string
): Promise<IntegrationResult<void>> {
  const client = await getVAPIClient(workspaceId);

  if (!client) {
    return { success: false, error: 'VAPI integration not configured' };
  }

  try {
    const response = await vapiFetch(client, `/assistant/${assistantId}`, {
      method: 'DELETE',
    });

    if (!response.ok && response.status !== 404) {
      const errorData = await response.json();
      return {
        success: false,
        error: (errorData as { message?: string }).message || 'Failed to delete assistant',
      };
    }

    return { success: true };
  } catch (error: unknown) {
    const err = error as { message?: string };
    return { success: false, error: err.message };
  }
}

/**
 * Clear cached client
 */
export async function clearVAPIClientCache(workspaceId?: string): Promise<void> {
  if (workspaceId) {
    clientCache.delete(workspaceId);
  } else {
    clientCache.clear();
  }
}
