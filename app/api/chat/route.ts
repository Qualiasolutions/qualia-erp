/**
 * Chat API Route
 * Uses OpenRouter with Gemini 3 Flash
 * Supports conversation persistence via conversationId
 * Enriched with cross-session context (admin notes, summaries, work context)
 */

import { getAssistantRequestContext, processStreamingAI } from '@/lib/ai/ai-core';
import { chatRateLimiter } from '@/lib/rate-limit';
import { generateSimpleResponse } from '@/lib/ai/ai-core';
import {
  getOrCreateUserAIContext,
  markNotesDelivered,
  updateConversationSummaries,
} from '@/app/actions/ai-context';
import { loadFullMemoryContext, updateInteractionCount } from '@/lib/ai/memory';
import type { EnrichedContext } from '@/lib/ai/system-prompt';
import { z } from 'zod';

export const maxDuration = 60;

const MAX_CHAT_MESSAGES = 40;
const MAX_CHAT_MESSAGE_CHARS = 12000;
const MAX_CHAT_TOTAL_CHARS = 80000;

const chatMessageSchema = z
  .object({
    role: z.enum(['user', 'assistant']),
    content: z.string().optional(),
    parts: z
      .array(
        z
          .object({
            type: z.string(),
            text: z.string().optional(),
          })
          .passthrough()
      )
      .optional(),
  })
  .passthrough();

const chatRequestSchema = z
  .object({
    conversationId: z.string().uuid().optional().nullable(),
    messages: z.array(chatMessageSchema).min(1).max(MAX_CHAT_MESSAGES),
  })
  .passthrough();

type ChatMessage = { role: 'user' | 'assistant'; content: string };

function jsonError(error: string, status: number) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function extractMessageContent(message: z.infer<typeof chatMessageSchema>): string {
  if (typeof message.content === 'string') return message.content;
  if (!message.parts?.length) return '';
  return message.parts
    .filter((part) => part.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text)
    .join('');
}

function logBackgroundError(label: string, error: unknown) {
  console.error(`[chat] ${label}:`, error);
}

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

    // Get authenticated user or the private owner-assistant session
    const assistantContext = await getAssistantRequestContext();
    if (!assistantContext) {
      return jsonError('Please sign in to use the AI assistant', 401);
    }

    const { user, workspaceId, supabase } = assistantContext;

    // Role guard — block client accounts from AI assistant
    if (user.role === 'client') {
      return jsonError('AI assistant is not available for client accounts', 403);
    }

    // Rate limiting
    const rateLimitResult = await chatRateLimiter(user.id);
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
    const body = await req.json().catch(() => null);
    const parsed = chatRequestSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message || 'Invalid chat request', 400);
    }

    const messages: ChatMessage[] = parsed.data.messages.map((message) => ({
      role: message.role,
      content: extractMessageContent(message).trim(),
    }));
    const conversationId = parsed.data.conversationId || null;

    const invalidMessage = messages.find(
      (message) => !message.content || message.content.length > MAX_CHAT_MESSAGE_CHARS
    );
    if (invalidMessage) {
      return jsonError(
        `Each message must include text and stay under ${MAX_CHAT_MESSAGE_CHARS.toLocaleString()} characters.`,
        400
      );
    }

    const totalChars = messages.reduce((sum, message) => sum + message.content.length, 0);
    if (totalChars > MAX_CHAT_TOTAL_CHARS) {
      return jsonError(
        `Chat context is too large. Keep the request under ${MAX_CHAT_TOTAL_CHARS.toLocaleString()} characters.`,
        400
      );
    }

    if (messages[messages.length - 1]?.role !== 'user') {
      return jsonError('The latest chat message must come from the user.', 400);
    }

    // Fetch enriched context (admin notes, summaries, work context)
    let enrichedContext: EnrichedContext | undefined;
    let hasUndeliveredNotes = false;

    if (workspaceId) {
      const [aiContext, projectsResult, tasksResult, memoryContext] = await Promise.all([
        getOrCreateUserAIContext(user.id, workspaceId),
        supabase
          .from('projects')
          .select('name, status')
          .eq('lead_id', user.id)
          .in('status', ['Active', 'Demos'])
          .limit(10),
        supabase
          .from('tasks')
          .select('title, due_date, priority')
          .eq('assignee_id', user.id)
          .in('status', ['Todo', 'In Progress'])
          .order('due_date', { ascending: true, nullsFirst: false })
          .limit(5),
        loadFullMemoryContext(user.id, workspaceId),
      ]);

      const undeliveredNotes = aiContext?.admin_notes?.filter((n) => !n.delivered) || [];
      hasUndeliveredNotes = undeliveredNotes.length > 0;

      enrichedContext = {
        adminNotes: undeliveredNotes.length > 0 ? undeliveredNotes : undefined,
        recentSummaries:
          aiContext?.recent_summaries && aiContext.recent_summaries.length > 0
            ? aiContext.recent_summaries
            : undefined,
        activeProjects:
          projectsResult.data && projectsResult.data.length > 0 ? projectsResult.data : undefined,
        pendingTasks:
          tasksResult.data && tasksResult.data.length > 0 ? tasksResult.data : undefined,
        memoryContext,
      };

      // Only pass enrichedContext if it has content
      if (
        !enrichedContext.adminNotes &&
        !enrichedContext.recentSummaries &&
        !enrichedContext.activeProjects &&
        !enrichedContext.pendingTasks &&
        !enrichedContext.memoryContext?.memories.length &&
        !enrichedContext.memoryContext?.reminders.length
      ) {
        enrichedContext = undefined;
      }
    }

    // Handle conversation persistence
    let activeConversationId: string | null = conversationId;

    if (conversationId) {
      const { data: conversation, error: conversationError } = await supabase
        .from('ai_conversations')
        .select('id')
        .eq('id', conversationId)
        .eq('user_id', user.id)
        .eq('workspace_id', workspaceId)
        .maybeSingle();

      if (conversationError) {
        console.error('[chat] conversation verification failed:', conversationError);
        return jsonError('Failed to verify conversation. Please try again.', 500);
      }

      if (!conversation) {
        return jsonError('Conversation not found or access denied.', 404);
      }

      // Save the latest user message and update conversation timestamp concurrently
      const lastMessage = messages[messages.length - 1];
      const [messageResult, timestampResult] = await Promise.all([
        supabase.from('ai_messages').insert({
          conversation_id: conversationId,
          role: 'user',
          content: lastMessage.content,
        }),
        supabase
          .from('ai_conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', conversationId),
      ]);

      if (messageResult.error || timestampResult.error) {
        console.error('[chat] failed to persist user message:', {
          messageError: messageResult.error,
          timestampError: timestampResult.error,
        });
        return jsonError('Failed to save your message. Please try again.', 500);
      }
    } else if (messages.length > 0) {
      // Create a new conversation if none provided
      const firstMessage = messages[0]?.content || '';
      const { data: newConv, error: conversationCreateError } = await supabase
        .from('ai_conversations')
        .insert({
          workspace_id: workspaceId,
          user_id: user.id,
          title: 'New Conversation',
        })
        .select('id')
        .single();

      if (conversationCreateError || !newConv) {
        console.error('[chat] conversation create failed:', conversationCreateError);
        return jsonError('Failed to start a new conversation. Please try again.', 500);
      }

      activeConversationId = newConv.id;

      const lastMessage = messages[messages.length - 1];
      const { error: messageInsertError } = await supabase.from('ai_messages').insert({
        conversation_id: newConv.id,
        role: 'user',
        content: lastMessage.content,
      });

      if (messageInsertError) {
        console.error('[chat] message insert failed:', messageInsertError);
        return jsonError('Failed to save your message. Please try again.', 500);
      }

      // Auto-generate title from first user message (async, don't block)
      if (firstMessage) {
        generateSimpleResponse(
          `Generate a short title (max 6 words) for a conversation that starts with: "${firstMessage.slice(0, 200)}". Return ONLY the title, no quotes.`
        )
          .then(async (title) => {
            const trimmed = title.trim().replace(/^["']|["']$/g, '');
            if (trimmed) {
              const { error: titleError } = await supabase
                .from('ai_conversations')
                .update({ title: trimmed })
                .eq('id', newConv.id);
              if (titleError) logBackgroundError('title update failed', titleError);
            }
          })
          .catch((error) => logBackgroundError('title generation failed', error));
      }
    }

    // Process with AI
    try {
      const result = await processStreamingAI({
        messages,
        user,
        workspaceId,
        mode: 'chat',
        enrichedContext,
        supabaseClient: supabase,
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
        Promise.resolve(result.text)
          .then(async (rawText) => {
            // If model only made tool calls without text, generate a summary
            const text =
              rawText.trim() ||
              'I processed your request using tools but had no additional response.';
            const { error: assistantMessageError } = await supabase.from('ai_messages').insert({
              conversation_id: activeConversationId,
              role: 'assistant',
              content: text,
            });
            if (assistantMessageError) {
              logBackgroundError('assistant message insert failed', assistantMessageError);
              return;
            }

            // Mark admin notes as delivered
            if (hasUndeliveredNotes && workspaceId) {
              markNotesDelivered(user.id, workspaceId)
                .then((result) => {
                  if (!result.success)
                    logBackgroundError('mark notes delivered failed', result.error);
                })
                .catch((error) => logBackgroundError('mark notes delivered failed', error));
            }

            // Increment interaction count for skill detection
            if (workspaceId) {
              updateInteractionCount(user.id, workspaceId).catch((error) =>
                logBackgroundError('interaction count update failed', error)
              );
            }

            // Generate conversation summary if 4+ messages
            if (workspaceId && messages.length >= 3) {
              const recentMessages = messages
                .slice(-4)
                .map(
                  (m: { role: string; content: string }) => `${m.role}: ${m.content.slice(0, 100)}`
                )
                .join('\n');

              generateSimpleResponse(
                `Summarize this conversation in ONE short sentence (max 15 words). Focus on the main topic/action:\n${recentMessages}\nAssistant: ${text.slice(0, 200)}`
              )
                .then(async (summary) => {
                  const trimmed = summary.trim().replace(/^["']|["']$/g, '');
                  if (trimmed) {
                    // Save to ai_user_context
                    const summaryResult = await updateConversationSummaries(
                      user.id,
                      workspaceId!,
                      trimmed
                    );
                    if (!summaryResult.success) {
                      logBackgroundError('context summary update failed', summaryResult.error);
                    }
                    // Save to conversation record
                    const { error: conversationSummaryError } = await supabase
                      .from('ai_conversations')
                      .update({ summary: trimmed })
                      .eq('id', activeConversationId);
                    if (conversationSummaryError) {
                      logBackgroundError(
                        'conversation summary update failed',
                        conversationSummaryError
                      );
                    }
                  }
                })
                .catch((error) => logBackgroundError('summary generation failed', error));
            }
          })
          .catch((error) => logBackgroundError('assistant persistence failed', error));
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
