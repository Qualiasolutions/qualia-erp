/**
 * AI Core Orchestration
 * Shared AI processing for both chat and voice interfaces
 */

import { streamText, generateText, stepCountIs } from 'ai';
import { geminiModel } from './gemini-client';
import { createAgentTools, type UserInfo } from './tools';
import { buildSystemPrompt, type EnrichedContext } from './system-prompt';
import { createClient } from '@/lib/supabase/server';
import type { UserContext } from '@/lib/voice-assistant-intelligence';

export interface ProcessOptions {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  user: UserInfo;
  workspaceId: string | null;
  mode: 'chat' | 'voice';
  userContext?: UserContext;
  enrichedContext?: EnrichedContext;
}

/**
 * Get user info from Supabase auth
 */
export async function getUserInfo(): Promise<UserInfo | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, skill_level')
    .eq('id', user.id)
    .single();

  return profile;
}

/**
 * Get user's workspace ID
 */
export async function getWorkspaceId(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('profile_id', userId)
    .eq('is_default', true)
    .single();

  return membership?.workspace_id || null;
}

/**
 * Process AI request with streaming (for chat)
 */
export async function processStreamingAI(options: ProcessOptions) {
  const supabase = await createClient();

  const systemPrompt = buildSystemPrompt({
    user: options.user,
    mode: options.mode,
    userContext: options.userContext,
    enrichedContext: options.enrichedContext,
  });

  const tools = createAgentTools(supabase, options.workspaceId, options.user);

  // Convert to CoreMessage format
  const coreMessages = options.messages.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  // Cap conversation history to prevent context overflow and cost spikes
  const trimmedMessages = coreMessages.length > 40 ? coreMessages.slice(-40) : coreMessages;

  return streamText({
    model: geminiModel,
    system: systemPrompt,
    messages: trimmedMessages,
    tools,
    maxOutputTokens: 4096,
    stopWhen: stepCountIs(10),
  });
}

/**
 * Process AI request without streaming (for voice)
 * Returns complete response faster for TTS
 */
export async function processNonStreamingAI(options: ProcessOptions) {
  const supabase = await createClient();

  const systemPrompt = buildSystemPrompt({
    user: options.user,
    mode: options.mode,
    userContext: options.userContext,
  });

  const tools = createAgentTools(supabase, options.workspaceId, options.user);

  // Convert to CoreMessage format
  const coreMessages = options.messages.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  // Cap conversation history for voice (shorter window — voice sessions are brief)
  const trimmedMessages = coreMessages.length > 20 ? coreMessages.slice(-20) : coreMessages;

  return generateText({
    model: geminiModel,
    system: systemPrompt,
    messages: trimmedMessages,
    tools,
    maxOutputTokens: 2048,
    stopWhen: stepCountIs(5),
  });
}

/**
 * Simple text generation without tools
 * Used for quick responses or when tools aren't needed
 */
export async function generateSimpleResponse(
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  const result = await generateText({
    model: geminiModel,
    system: systemPrompt || 'You are a helpful assistant. Be brief and clear.',
    prompt,
  });

  return result.text;
}
