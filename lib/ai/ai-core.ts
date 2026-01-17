/**
 * AI Core Orchestration
 * Shared AI processing for both chat and voice interfaces
 */

import { streamText, generateText, stepCountIs, type UIMessage, convertToModelMessages } from 'ai';
import { geminiModel } from './gemini-client';
import { createAllTools, type UserInfo } from './tools';
import { buildSystemPrompt } from './system-prompt';
import { createClient } from '@/lib/supabase/server';
import type { UserContext } from '@/lib/voice-assistant-intelligence';

export interface ProcessOptions {
  messages: UIMessage[];
  user: UserInfo;
  workspaceId: string | null;
  mode: 'chat' | 'voice';
  userContext?: UserContext;
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
    .select('id, full_name, email, role')
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
  });

  const tools = createAllTools(supabase, options.workspaceId, options.user);

  return streamText({
    model: geminiModel,
    system: systemPrompt,
    messages: convertToModelMessages(options.messages),
    tools,
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

  const tools = createAllTools(supabase, options.workspaceId, options.user);

  return generateText({
    model: geminiModel,
    system: systemPrompt,
    messages: convertToModelMessages(options.messages),
    tools,
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
