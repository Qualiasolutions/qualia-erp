/**
 * Voice API Route
 * Non-streaming endpoint optimized for voice interactions
 * Uses Gemini 2.5 Flash (FREE) with shared AI core
 */

import { processNonStreamingAI, getUserInfo, getWorkspaceId } from '@/lib/ai/ai-core';
import { chatRateLimiter } from '@/lib/rate-limit';
import type { UserContext } from '@/lib/voice-assistant-intelligence';

export const maxDuration = 15; // Faster timeout for voice

interface VoiceRequest {
  transcript: string;
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  userContext?: UserContext;
}

export async function POST(req: Request) {
  try {
    const user = await getUserInfo();

    if (!user) {
      return Response.json(
        { error: 'Please sign in to use voice assistant', text: 'Please sign in first.' },
        { status: 401 }
      );
    }

    // Rate limiting
    const rateLimitResult = chatRateLimiter(user.id);
    if (!rateLimitResult.success) {
      return Response.json(
        { error: 'Rate limit exceeded', text: 'Too many requests. Please wait a moment.' },
        { status: 429 }
      );
    }

    const { transcript, conversationHistory = [], userContext }: VoiceRequest = await req.json();

    if (!transcript?.trim()) {
      return Response.json(
        { error: 'No transcript provided', text: "I didn't catch that. Could you repeat?" },
        { status: 400 }
      );
    }

    const workspaceId = await getWorkspaceId(user.id);

    // Check for API key
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      console.error('Google AI API key not found');
      return Response.json(
        { error: 'AI not configured', text: 'Voice assistant is not configured.' },
        { status: 500 }
      );
    }

    // Build messages from conversation history with proper UIMessage format
    const messages = [
      ...conversationHistory.map((msg, idx) => ({
        id: `voice-${idx}`,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        parts: [{ type: 'text' as const, text: msg.content }],
      })),
      {
        id: `voice-${conversationHistory.length}`,
        role: 'user' as const,
        content: transcript,
        parts: [{ type: 'text' as const, text: transcript }],
      },
    ];

    // Process with shared AI core (non-streaming for faster voice response)
    const result = await processNonStreamingAI({
      messages: messages as Parameters<typeof processNonStreamingAI>[0]['messages'],
      user,
      workspaceId,
      mode: 'voice',
      userContext: userContext || {
        name: user.full_name || undefined,
        role: user.role || undefined,
        location: 'jordan', // Default to Jordan timezone
        preferences: {
          language: 'mixed',
          formality: 'casual',
        },
      },
    });

    return Response.json({
      text: result.text,
      toolResults: result.toolResults,
      finishReason: result.finishReason,
    });
  } catch (error) {
    console.error('Voice API error:', error);
    return Response.json(
      {
        error: 'Failed to process voice request',
        text: 'Sorry, something went wrong. Please try again.',
      },
      { status: 500 }
    );
  }
}
