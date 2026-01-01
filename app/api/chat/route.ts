/**
 * Chat API Route
 * Uses Gemini 2.5 Flash (FREE) with shared AI core
 */

import { processStreamingAI, getUserInfo, getWorkspaceId } from '@/lib/ai/ai-core';
import { chatRateLimiter } from '@/lib/rate-limit';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const user = await getUserInfo();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Please sign in to use the AI assistant' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Rate limiting: 20 requests per minute per user
    const rateLimitResult = chatRateLimiter(user.id);
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.reset - Date.now()) / 1000);
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString(),
            'Retry-After': retryAfter.toString(),
          },
        }
      );
    }

    const { messages } = await req.json();
    const workspaceId = await getWorkspaceId(user.id);

    // Check for API key
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      console.error('Google AI API key not found. Please set GOOGLE_GENERATIVE_AI_API_KEY');
      return new Response(
        JSON.stringify({ error: 'AI service is not configured. Please contact support.' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Process with shared AI core (streaming)
    const result = await processStreamingAI({
      messages,
      user,
      workspaceId,
      mode: 'chat',
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(JSON.stringify({ error: 'Failed to process chat request' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
