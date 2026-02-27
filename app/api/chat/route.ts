/**
 * Chat API Route
 * Uses OpenRouter with Gemini 3 Flash
 * Supports conversation persistence via conversationId
 */

import { processStreamingAI, getUserInfo, getWorkspaceId } from '@/lib/ai/ai-core';
import { chatRateLimiter } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';
import { generateSimpleResponse } from '@/lib/ai/ai-core';

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
    const { messages, conversationId } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Invalid request: messages array required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get workspace
    const workspaceId = await getWorkspaceId(user.id);
    const supabase = await createClient();

    // Handle conversation persistence
    let activeConversationId = conversationId;

    if (conversationId) {
      // Save the latest user message
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.role === 'user') {
        await supabase.from('ai_messages').insert({
          conversation_id: conversationId,
          role: 'user',
          content: lastMessage.content,
        });
        await supabase
          .from('ai_conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', conversationId);
      }
    } else if (messages.length > 0) {
      // Create a new conversation if none provided
      const firstMessage = messages[0]?.content || '';
      const { data: newConv } = await supabase
        .from('ai_conversations')
        .insert({
          workspace_id: workspaceId,
          user_id: user.id,
          title: 'New Conversation',
        })
        .select('id')
        .single();

      if (newConv) {
        activeConversationId = newConv.id;

        // Save the user message
        const lastMessage = messages[messages.length - 1];
        if (lastMessage?.role === 'user') {
          await supabase.from('ai_messages').insert({
            conversation_id: newConv.id,
            role: 'user',
            content: lastMessage.content,
          });
        }

        // Auto-generate title from first user message (async, don't block)
        if (firstMessage) {
          generateSimpleResponse(
            `Generate a short title (max 6 words) for a conversation that starts with: "${firstMessage.slice(0, 200)}". Return ONLY the title, no quotes.`
          )
            .then(async (title) => {
              const trimmed = title.trim().replace(/^["']|["']$/g, '');
              if (trimmed) {
                await supabase
                  .from('ai_conversations')
                  .update({ title: trimmed })
                  .eq('id', newConv.id);
              }
            })
            .catch(() => {});
        }
      }
    }

    // Process with AI
    try {
      const result = await processStreamingAI({
        messages,
        user,
        workspaceId,
        mode: 'chat',
      });

      // Build response with conversation ID header
      const response = result.toTextStreamResponse();

      // Add conversationId to response headers so client can track it
      const headers = new Headers(response.headers);
      if (activeConversationId) {
        headers.set('X-Conversation-Id', activeConversationId);
      }

      // Save assistant response after stream completes (fire and forget)
      if (activeConversationId) {
        result.text
          .then(async (text) => {
            await supabase.from('ai_messages').insert({
              conversation_id: activeConversationId,
              role: 'assistant',
              content: text,
            });
          })
          .catch(() => {});
      }

      return new Response(response.body, {
        status: response.status,
        headers,
      });
    } catch (streamError) {
      console.error('AI streaming error:', streamError);
      throw streamError;
    }
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
