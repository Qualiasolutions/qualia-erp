/**
 * Chat API Route
 * Uses OpenRouter with Gemini 3 Flash
 */

import { processStreamingAI, getUserInfo, getWorkspaceId } from '@/lib/ai/ai-core';
import { chatRateLimiter } from '@/lib/rate-limit';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    // Check API key first
    if (!process.env.OPENROUTER_API_KEY) {
      console.error('OPENROUTER_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured. Contact support.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get authenticated user
    const user = await getUserInfo();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Please sign in to use the AI assistant' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Rate limiting
    const rateLimitResult = chatRateLimiter(user.id);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.reset - Date.now()) / 1000);
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.', retryAfter }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': retryAfter.toString(),
          },
        }
      );
    }

    // Parse request
    const body = await req.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Invalid request: messages array required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get workspace
    const workspaceId = await getWorkspaceId(user.id);

    // Process with AI
    const result = await processStreamingAI({
      messages,
      user,
      workspaceId,
      mode: 'chat',
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Chat API error:', error);

    // Extract error message
    const errorMessage = error instanceof Error ? error.message : 'Failed to process chat request';

    // Check for specific error types
    if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      return new Response(
        JSON.stringify({ error: 'AI service rate limited. Please try again in a moment.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (errorMessage.includes('API key') || errorMessage.includes('401')) {
      return new Response(
        JSON.stringify({ error: 'AI service authentication failed. Contact support.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
