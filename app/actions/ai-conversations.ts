'use server';

import { createClient } from '@/lib/supabase/server';

import type { ActionResult } from './shared';

// Conversation type
export type Conversation = {
  id: string;
  workspace_id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

// Message type
export type Message = {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls: unknown | null;
  tool_results: unknown | null;
  created_at: string;
};

/**
 * Get the current workspace ID for the authenticated user
 */
async function getCurrentWorkspaceId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('profile_id', user.id)
    .eq('is_default', true)
    .single();

  return data?.workspace_id || null;
}

/**
 * Get all conversations for the current user
 * Ordered by updated_at DESC, limited to 50
 */
export async function getConversations(): Promise<Conversation[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error('[getConversations] No authenticated user');
    return [];
  }

  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    console.error('[getConversations] No workspace ID available');
    return [];
  }

  // Item 16: List query only needs id + title + timestamps
  const { data: conversations, error } = await supabase
    .from('ai_conversations')
    .select('id, title, created_at, updated_at')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('[getConversations] Error fetching conversations:', error);
    return [];
  }

  return (conversations || []) as Conversation[];
}

/**
 * Get a single conversation by ID (with auth check that user owns it)
 */
export async function getConversation(id: string): Promise<Conversation | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error('[getConversation] No authenticated user');
    return null;
  }

  const { data: conversation, error } = await supabase
    .from('ai_conversations')
    .select('id, workspace_id, user_id, title, created_at, updated_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error) {
    console.error('[getConversation] Error fetching conversation:', error);
    return null;
  }

  return conversation as Conversation;
}

/**
 * Create a new conversation
 * Auto-generates title as 'New Conversation' if not provided.
 * Item 21: Title capped at 200 characters via Zod.
 */
export async function createConversation(title?: string): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Item 21: Validate title length
  if (title !== undefined) {
    const { z } = await import('zod');
    const result = z.string().max(200).safeParse(title);
    if (!result.success) {
      return { success: false, error: 'Title must be 200 characters or less' };
    }
  }

  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    return { success: false, error: 'No workspace found' };
  }

  const { data, error } = await supabase
    .from('ai_conversations')
    .insert({
      workspace_id: workspaceId,
      user_id: user.id,
      title: title?.trim() || 'New Conversation',
    })
    .select()
    .single();

  if (error) {
    console.error('[createConversation] Error creating conversation:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Delete a conversation (cascades to messages via FK)
 */
export async function deleteConversation(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Verify ownership before deleting
  const { data: conversation } = await supabase
    .from('ai_conversations')
    .select('user_id')
    .eq('id', id)
    .single();

  if (!conversation || conversation.user_id !== user.id) {
    return { success: false, error: 'Conversation not found or unauthorized' };
  }

  const { error } = await supabase.from('ai_conversations').delete().eq('id', id);

  if (error) {
    console.error('[deleteConversation] Error deleting conversation:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Save a message to a conversation
 * Also updates the conversation's updated_at timestamp
 */
export async function saveMessage(
  conversationId: string,
  message: {
    role: string;
    content: string;
    tool_calls?: unknown;
    tool_results?: unknown;
  }
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Verify conversation ownership
  const { data: conversation } = await supabase
    .from('ai_conversations')
    .select('user_id')
    .eq('id', conversationId)
    .single();

  if (!conversation || conversation.user_id !== user.id) {
    return { success: false, error: 'Conversation not found or unauthorized' };
  }

  // Insert the message
  const { data, error } = await supabase
    .from('ai_messages')
    .insert({
      conversation_id: conversationId,
      role: message.role,
      content: message.content,
      tool_calls: message.tool_calls || null,
      tool_results: message.tool_results || null,
    })
    .select()
    .single();

  if (error) {
    console.error('[saveMessage] Error saving message:', error);
    return { success: false, error: error.message };
  }

  // Update conversation's updated_at timestamp
  const { error: updateError } = await supabase
    .from('ai_conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  if (updateError) {
    console.error('[saveMessage] Error updating conversation timestamp:', updateError);
    // Don't fail - message was saved successfully
  }

  return { success: true, data };
}

/**
 * Get all messages for a conversation, ordered by created_at ASC
 */
export async function getMessages(conversationId: string): Promise<Message[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error('[getMessages] No authenticated user');
    return [];
  }

  // Verify conversation ownership
  const { data: conversation } = await supabase
    .from('ai_conversations')
    .select('user_id')
    .eq('id', conversationId)
    .single();

  if (!conversation || conversation.user_id !== user.id) {
    console.error('[getMessages] Conversation not found or unauthorized');
    return [];
  }

  const { data: messages, error } = await supabase
    .from('ai_messages')
    .select('id, conversation_id, role, content, tool_calls, tool_results, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[getMessages] Error fetching messages:', error);
    return [];
  }

  return (messages || []) as Message[];
}

/**
 * Update conversation title
 */
export async function updateConversationTitle(id: string, title: string): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    return { success: false, error: 'Title cannot be empty' };
  }

  // Verify ownership before updating
  const { data: conversation } = await supabase
    .from('ai_conversations')
    .select('user_id')
    .eq('id', id)
    .single();

  if (!conversation || conversation.user_id !== user.id) {
    return { success: false, error: 'Conversation not found or unauthorized' };
  }

  const { error } = await supabase
    .from('ai_conversations')
    .update({ title: trimmedTitle })
    .eq('id', id);

  if (error) {
    console.error('[updateConversationTitle] Error updating title:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
