import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { chatRateLimiter } from '@/lib/rate-limit';
import { processNonStreamingAI, getUserInfo, getWorkspaceId } from '@/lib/ai/ai-core';
import {
  getOrCreateUserAIContext,
  markNotesDelivered,
  updateConversationSummaries,
} from '@/app/actions/ai-context';
import { loadFullMemoryContext, updateInteractionCount } from '@/lib/ai/memory';
import { generateSimpleResponse } from '@/lib/ai/ai-core';
import type { EnrichedContext } from '@/lib/ai/system-prompt';

export const maxDuration = 30;

const MAX_VOICE_MESSAGES = 20;
const MAX_VOICE_MESSAGE_CHARS = 4000;
const MAX_VOICE_TOTAL_CHARS = 24000;

const voiceMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(MAX_VOICE_MESSAGE_CHARS),
});

const voiceRequestSchema = z.object({
  conversationId: z.string().uuid().optional().nullable(),
  messages: z.array(voiceMessageSchema).min(1).max(MAX_VOICE_MESSAGES),
});

function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, { status });
}

function logBackgroundError(label: string, error: unknown) {
  console.error(`[assistant/voice] ${label}:`, error);
}

async function buildEnrichedContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  workspaceId: string
): Promise<{ context: EnrichedContext | undefined; hasUndeliveredNotes: boolean }> {
  const [aiContext, projectsResult, tasksResult, memoryContext] = await Promise.all([
    getOrCreateUserAIContext(userId, workspaceId),
    supabase
      .from('projects')
      .select('name, status')
      .eq('lead_id', userId)
      .in('status', ['Active', 'Demos'])
      .limit(10),
    supabase
      .from('tasks')
      .select('title, due_date, priority')
      .eq('assignee_id', userId)
      .in('status', ['Todo', 'In Progress'])
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(5),
    loadFullMemoryContext(userId, workspaceId),
  ]);

  const undeliveredNotes = aiContext?.admin_notes?.filter((note) => !note.delivered) || [];
  const context: EnrichedContext = {
    adminNotes: undeliveredNotes.length > 0 ? undeliveredNotes : undefined,
    recentSummaries:
      aiContext?.recent_summaries && aiContext.recent_summaries.length > 0
        ? aiContext.recent_summaries
        : undefined,
    activeProjects:
      projectsResult.data && projectsResult.data.length > 0 ? projectsResult.data : undefined,
    pendingTasks: tasksResult.data && tasksResult.data.length > 0 ? tasksResult.data : undefined,
    memoryContext,
  };

  const hasContext =
    !!context.adminNotes ||
    !!context.recentSummaries ||
    !!context.activeProjects ||
    !!context.pendingTasks ||
    !!context.memoryContext?.memories.length ||
    !!context.memoryContext?.reminders.length;

  return {
    context: hasContext ? context : undefined,
    hasUndeliveredNotes: undeliveredNotes.length > 0,
  };
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return jsonResponse({ error: 'AI service not configured. Contact support.' }, 500);
    }

    const user = await getUserInfo();
    if (!user) {
      return jsonResponse({ error: 'Please sign in to use Qualia.' }, 401);
    }

    if (user.role === 'client') {
      return jsonResponse({ error: 'Qualia voice is not available for client accounts.' }, 403);
    }

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

    const body = await req.json().catch(() => null);
    const parsed = voiceRequestSchema.safeParse(body);
    if (!parsed.success) {
      return jsonResponse(
        { error: parsed.error.issues[0]?.message || 'Invalid voice request' },
        400
      );
    }

    const messages = parsed.data.messages.map((message) => ({
      role: message.role,
      content: message.content.trim(),
    }));

    const totalChars = messages.reduce((sum, message) => sum + message.content.length, 0);
    if (totalChars > MAX_VOICE_TOTAL_CHARS) {
      return jsonResponse(
        {
          error: `Voice context is too large. Keep it under ${MAX_VOICE_TOTAL_CHARS.toLocaleString()} characters.`,
        },
        400
      );
    }

    if (messages[messages.length - 1]?.role !== 'user') {
      return jsonResponse({ error: 'The latest voice message must come from the user.' }, 400);
    }

    const workspaceId = await getWorkspaceId(user.id);
    if (!workspaceId) {
      return jsonResponse({ error: 'No workspace is available for this account.' }, 403);
    }

    const supabase = await createClient();
    const { context: enrichedContext, hasUndeliveredNotes } = await buildEnrichedContext(
      supabase,
      user.id,
      workspaceId
    );

    let activeConversationId = parsed.data.conversationId || null;

    if (activeConversationId) {
      const { data: conversation, error: conversationError } = await supabase
        .from('ai_conversations')
        .select('id')
        .eq('id', activeConversationId)
        .eq('user_id', user.id)
        .eq('workspace_id', workspaceId)
        .maybeSingle();

      if (conversationError) {
        logBackgroundError('conversation verification failed', conversationError);
        return jsonResponse({ error: 'Failed to verify conversation. Please try again.' }, 500);
      }
      if (!conversation) {
        return jsonResponse({ error: 'Conversation not found or access denied.' }, 404);
      }
    } else {
      const { data: newConversation, error: conversationCreateError } = await supabase
        .from('ai_conversations')
        .insert({
          workspace_id: workspaceId,
          user_id: user.id,
          title: 'Voice conversation',
        })
        .select('id')
        .single();

      if (conversationCreateError || !newConversation) {
        logBackgroundError('conversation create failed', conversationCreateError);
        return jsonResponse({ error: 'Failed to start a voice conversation.' }, 500);
      }

      activeConversationId = newConversation.id;
    }

    const lastUserMessage = messages[messages.length - 1];
    const { error: userMessageError } = await supabase.from('ai_messages').insert({
      conversation_id: activeConversationId,
      role: 'user',
      content: lastUserMessage.content,
    });

    if (userMessageError) {
      logBackgroundError('user message insert failed', userMessageError);
      return jsonResponse({ error: 'Failed to save your voice message. Please try again.' }, 500);
    }

    const result = await processNonStreamingAI({
      messages,
      user,
      workspaceId,
      mode: 'voice',
      userContext: {
        name: user.full_name || user.email || 'Fawzi',
        role: user.role || undefined,
        location: 'cyprus',
        preferences: { language: 'mixed', formality: 'casual' },
      },
      enrichedContext,
    });

    const responseText =
      result.text.trim() || 'Done. I used the available tools and completed the request.';

    const { error: assistantMessageError } = await supabase.from('ai_messages').insert({
      conversation_id: activeConversationId,
      role: 'assistant',
      content: responseText,
    });

    if (assistantMessageError) {
      logBackgroundError('assistant message insert failed', assistantMessageError);
    }

    if (hasUndeliveredNotes) {
      markNotesDelivered(user.id, workspaceId).catch((error) =>
        logBackgroundError('mark notes delivered failed', error)
      );
    }

    updateInteractionCount(user.id, workspaceId).catch((error) =>
      logBackgroundError('interaction count update failed', error)
    );

    if (messages.length >= 3) {
      const recentMessages = messages
        .slice(-4)
        .map((message) => `${message.role}: ${message.content.slice(0, 120)}`)
        .join('\n');

      generateSimpleResponse(
        `Summarize this voice conversation in ONE short sentence (max 15 words):\n${recentMessages}\nAssistant: ${responseText.slice(0, 200)}`
      )
        .then(async (summary) => {
          const trimmed = summary.trim().replace(/^["']|["']$/g, '');
          if (!trimmed) return;

          const contextResult = await updateConversationSummaries(user.id, workspaceId, trimmed);
          if (!contextResult.success) {
            logBackgroundError('context summary update failed', contextResult.error);
          }

          const { error: conversationSummaryError } = await supabase
            .from('ai_conversations')
            .update({ summary: trimmed, updated_at: new Date().toISOString() })
            .eq('id', activeConversationId);
          if (conversationSummaryError) {
            logBackgroundError('conversation summary update failed', conversationSummaryError);
          }
        })
        .catch((error) => logBackgroundError('summary generation failed', error));
    }

    return jsonResponse({
      conversationId: activeConversationId,
      text: responseText,
    });
  } catch (error) {
    console.error('[assistant/voice] route error:', error);
    const message = error instanceof Error ? error.message : 'Failed to process voice request';
    return jsonResponse({ error: message }, 500);
  }
}
