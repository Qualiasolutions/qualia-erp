'use server';

import { createAdminClient, createClient } from '@/lib/supabase/server';
import { isUserAdmin } from './shared';
import { getCurrentWorkspaceId } from './workspace';

export interface AIPromptConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  userName: string;
  userEmail: string | null;
  messageCount: number;
  userMessageCount: number;
  firstPrompt: string | null;
  lastActivityAt: string;
}

export interface AIPromptMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  createdAt: string;
  toolCalls: unknown;
  toolResults: unknown;
}

export interface AIPromptConversationDetail extends AIPromptConversation {
  messages: AIPromptMessage[];
}

async function requireAdmin(): Promise<{ workspaceId: string } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  if (!(await isUserAdmin(user.id))) return null;
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return null;
  return { workspaceId };
}

/**
 * List AI assistant conversations across the workspace, with the first user
 * prompt and message counts. Admin only.
 */
export async function getAIPromptConversations(opts: {
  from?: string;
  to?: string;
  profileId?: string;
  limit?: number;
}): Promise<AIPromptConversation[]> {
  const ctx = await requireAdmin();
  if (!ctx) return [];

  const admin = createAdminClient();
  const limit = Math.min(opts.limit ?? 200, 500);

  let query = admin
    .from('ai_conversations')
    .select('id, title, created_at, updated_at, user_id')
    .eq('workspace_id', ctx.workspaceId)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (opts.from) query = query.gte('updated_at', opts.from);
  if (opts.to) query = query.lte('updated_at', opts.to);
  if (opts.profileId) query = query.eq('user_id', opts.profileId);

  const { data: conversations, error } = await query;
  if (error || !conversations || conversations.length === 0) return [];

  const userIds = Array.from(new Set(conversations.map((c) => c.user_id)));
  const conversationIds = conversations.map((c) => c.id);

  const [{ data: profiles }, { data: messages }] = await Promise.all([
    admin.from('profiles').select('id, full_name, email').in('id', userIds),
    admin
      .from('ai_messages')
      .select('id, conversation_id, role, content, created_at')
      .in('conversation_id', conversationIds)
      .order('created_at', { ascending: true }),
  ]);

  const profileById = new Map<string, { full_name: string | null; email: string | null }>();
  (profiles ?? []).forEach((p) => profileById.set(p.id, p));

  const messagesByConversation = new Map<
    string,
    { count: number; userCount: number; firstPrompt: string | null; lastAt: string }
  >();
  (messages ?? []).forEach((m) => {
    const entry = messagesByConversation.get(m.conversation_id) ?? {
      count: 0,
      userCount: 0,
      firstPrompt: null,
      lastAt: m.created_at,
    };
    entry.count += 1;
    if (m.role === 'user') {
      entry.userCount += 1;
      if (!entry.firstPrompt) entry.firstPrompt = m.content;
    }
    if (m.created_at > entry.lastAt) entry.lastAt = m.created_at;
    messagesByConversation.set(m.conversation_id, entry);
  });

  return conversations.map((c) => {
    const profile = profileById.get(c.user_id);
    const stats = messagesByConversation.get(c.id) ?? {
      count: 0,
      userCount: 0,
      firstPrompt: null,
      lastAt: c.updated_at,
    };
    return {
      id: c.id,
      title: c.title,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      userId: c.user_id,
      userName: profile?.full_name ?? profile?.email ?? 'Unknown',
      userEmail: profile?.email ?? null,
      messageCount: stats.count,
      userMessageCount: stats.userCount,
      firstPrompt: stats.firstPrompt,
      lastActivityAt: stats.lastAt,
    };
  });
}

/**
 * Get a single conversation with its full message thread. Admin only.
 */
export async function getAIPromptConversationDetail(
  conversationId: string
): Promise<AIPromptConversationDetail | null> {
  const ctx = await requireAdmin();
  if (!ctx) return null;

  const admin = createAdminClient();

  const { data: conversation } = await admin
    .from('ai_conversations')
    .select('id, title, created_at, updated_at, user_id, workspace_id')
    .eq('id', conversationId)
    .eq('workspace_id', ctx.workspaceId)
    .maybeSingle();

  if (!conversation) return null;

  const [{ data: profile }, { data: messages }] = await Promise.all([
    admin
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', conversation.user_id)
      .maybeSingle(),
    admin
      .from('ai_messages')
      .select('id, role, content, tool_calls, tool_results, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true }),
  ]);

  const rows = (messages ?? []) as Array<{
    id: string;
    role: 'user' | 'assistant' | 'tool';
    content: string;
    tool_calls: unknown;
    tool_results: unknown;
    created_at: string;
  }>;
  const userCount = rows.filter((m) => m.role === 'user').length;
  const firstPrompt = rows.find((m) => m.role === 'user')?.content ?? null;
  const lastAt = rows.length ? rows[rows.length - 1].created_at : conversation.updated_at;

  return {
    id: conversation.id,
    title: conversation.title,
    createdAt: conversation.created_at,
    updatedAt: conversation.updated_at,
    userId: conversation.user_id,
    userName: profile?.full_name ?? profile?.email ?? 'Unknown',
    userEmail: profile?.email ?? null,
    messageCount: rows.length,
    userMessageCount: userCount,
    firstPrompt,
    lastActivityAt: lastAt,
    messages: rows.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.created_at,
      toolCalls: m.tool_calls ?? null,
      toolResults: m.tool_results ?? null,
    })),
  };
}

export interface AIPromptUserOption {
  profileId: string;
  fullName: string;
  email: string | null;
  conversationCount: number;
}

/**
 * List the employees who have any AI conversations in the workspace.
 * Admin only.
 */
export async function getAIPromptUsers(): Promise<AIPromptUserOption[]> {
  const ctx = await requireAdmin();
  if (!ctx) return [];

  const admin = createAdminClient();
  const { data: conversations } = await admin
    .from('ai_conversations')
    .select('user_id')
    .eq('workspace_id', ctx.workspaceId);

  if (!conversations || conversations.length === 0) return [];

  const counts = new Map<string, number>();
  conversations.forEach((c) => {
    counts.set(c.user_id, (counts.get(c.user_id) ?? 0) + 1);
  });

  const userIds = Array.from(counts.keys());
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, full_name, email')
    .in('id', userIds);

  return (profiles ?? [])
    .map((p) => ({
      profileId: p.id,
      fullName: p.full_name ?? p.email ?? 'Unknown',
      email: p.email,
      conversationCount: counts.get(p.id) ?? 0,
    }))
    .sort((a, b) => b.conversationCount - a.conversationCount);
}
