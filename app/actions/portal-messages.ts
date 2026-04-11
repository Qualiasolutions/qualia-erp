'use server';

import { createClient } from '@/lib/supabase/server';
import { sendMessageSchema, markChannelReadSchema, validateData } from '@/lib/validation';
import type { ActionResult } from '@/app/actions/shared';
import { getUserRole } from '@/app/actions/shared';
import { getClientProjectIds } from '@/lib/portal-utils';

// ============ RESULT TYPES ============
// More specific return types so SWR hooks can access nested data properties

export type ChannelMessagesData = {
  messages: Array<{
    id: string;
    channelId: string;
    projectId: string;
    senderId: string;
    content: string;
    contentHtml: string | null;
    isInternal: boolean;
    createdAt: string;
    updatedAt: string | null;
    sender: {
      id: string;
      full_name: string | null;
      email: string | null;
      role: string | null;
    } | null;
  }>;
  nextCursor: string | null;
  hasMore: boolean;
};

export type UnreadCountsData = {
  counts: Record<string, number>;
  total: number;
};

// ============ INTERNAL HELPERS ============

/**
 * Get or create a message channel for a project.
 * Internal helper — not exported as a server action.
 */
async function getOrCreateChannel(
  projectId: string
): Promise<{ id: string; project_id: string } | null> {
  const supabase = await createClient();

  // Check if channel already exists
  const { data: existing, error: selectError } = await supabase
    .from('portal_message_channels')
    .select('id, project_id')
    .eq('project_id', projectId)
    .single();

  if (existing) {
    return existing;
  }

  // PGRST116 = "no rows returned" — expected when channel doesn't exist yet
  if (selectError && selectError.code !== 'PGRST116') {
    console.error('[getOrCreateChannel] Select error:', selectError);
    return null;
  }

  // Create new channel
  const { data: newChannel, error: insertError } = await supabase
    .from('portal_message_channels')
    .insert({ project_id: projectId })
    .select('id, project_id')
    .single();

  if (insertError) {
    console.error('[getOrCreateChannel] Insert error:', insertError);
    return null;
  }

  return newChannel;
}

/**
 * Check if a user has access to a project for messaging purposes.
 * Admin/manager/employee have access to all projects.
 * Client users must have a client_projects row.
 */
async function hasMessageAccess(
  userId: string,
  role: string | null,
  projectId: string
): Promise<boolean> {
  if (role === 'admin' || role === 'manager' || role === 'employee') {
    return true;
  }

  if (role === 'client') {
    const clientProjectIds = await getClientProjectIds(userId);
    return clientProjectIds.includes(projectId);
  }

  return false;
}

// ============ SERVER ACTIONS ============

/**
 * Get all message channels the user has access to.
 * For clients: only channels for projects they are linked to.
 * For admins/managers/employees: all channels.
 * Sorted by last_message_at DESC.
 */
export async function getMessageChannels(userId: string): Promise<ActionResult> {
  // userId passed by SWR for cache keying; auth derived server-side
  void userId;

  try {
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const role = await getUserRole(user.id);
    const isClient = role === 'client';

    // Get client project IDs if needed
    let clientProjectIds: string[] = [];
    if (isClient) {
      clientProjectIds = await getClientProjectIds(user.id);
      if (clientProjectIds.length === 0) {
        return { success: true, data: [] };
      }
    }

    // Query channels with project info and last message sender
    let query = supabase
      .from('portal_message_channels')
      .select(
        `
        id,
        project_id,
        last_message_at,
        last_message_preview,
        last_message_sender_id,
        created_at,
        project:projects(id, name, project_type, status),
        last_message_sender:profiles!portal_message_channels_last_message_sender_id_fkey(id, full_name)
      `
      )
      .order('last_message_at', { ascending: false, nullsFirst: false });

    // Filter for client users
    if (isClient) {
      query = query.in('project_id', clientProjectIds);
    }

    const { data: channels, error: channelsError } = await query;

    if (channelsError) {
      console.error('[getMessageChannels] Query error:', channelsError);
      return { success: false, error: 'Failed to fetch message channels' };
    }

    if (!channels || channels.length === 0) {
      return { success: true, data: [] };
    }

    // Get read status for all channels for this user
    const channelIds = channels.map((c) => c.id);
    const { data: readStatuses } = await supabase
      .from('portal_message_read_status')
      .select('channel_id, last_read_at')
      .eq('user_id', user.id)
      .in('channel_id', channelIds);

    const readStatusMap = new Map<string, string>();
    if (readStatuses) {
      for (const rs of readStatuses) {
        readStatusMap.set(rs.channel_id, rs.last_read_at);
      }
    }

    // Batch-fetch unread counts: get all messages created after last_read_at per channel
    // Instead of N queries (one per channel), we use a single query to count
    // messages grouped by channel_id, filtered by the earliest possible last_read_at.
    const earliestReadAt = Math.min(
      ...channels.map((c) => {
        const lastRead = readStatusMap.get(c.id);
        return lastRead ? new Date(lastRead).getTime() : 0;
      })
    );
    const earliestReadAtISO =
      earliestReadAt > 0 ? new Date(earliestReadAt).toISOString() : '1970-01-01T00:00:00Z';

    // Fetch all recent messages (after the earliest read timestamp) for all channels at once
    let messagesQuery = supabase
      .from('portal_messages')
      .select('id, channel_id, created_at')
      .in('channel_id', channelIds)
      .gt('created_at', earliestReadAtISO);

    if (isClient) {
      messagesQuery = messagesQuery.eq('is_internal', false);
    }

    const { data: recentMessages } = await messagesQuery;

    // Compute unread counts in memory by comparing each message against per-channel last_read_at
    const unreadCountMap = new Map<string, number>();
    if (recentMessages) {
      for (const msg of recentMessages) {
        const channelLastRead = readStatusMap.get(msg.channel_id) || '1970-01-01T00:00:00Z';
        if (msg.created_at > channelLastRead) {
          unreadCountMap.set(msg.channel_id, (unreadCountMap.get(msg.channel_id) || 0) + 1);
        }
      }
    }

    const channelsWithUnread = channels.map((channel) => {
      // Normalize FK arrays (Supabase returns FKs as arrays in some join scenarios)
      const project = Array.isArray(channel.project) ? channel.project[0] || null : channel.project;
      const lastMessageSender = Array.isArray(channel.last_message_sender)
        ? channel.last_message_sender[0] || null
        : channel.last_message_sender;

      return {
        id: channel.id,
        projectId: channel.project_id,
        lastMessageAt: channel.last_message_at,
        lastMessagePreview: channel.last_message_preview,
        lastMessageSenderId: channel.last_message_sender_id,
        createdAt: channel.created_at,
        project,
        lastMessageSender,
        unreadCount: unreadCountMap.get(channel.id) || 0,
      };
    });

    return { success: true, data: channelsWithUnread };
  } catch (error) {
    console.error('[getMessageChannels] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch channels',
    };
  }
}

/**
 * Get messages for a project channel with cursor-based pagination.
 * Returns messages oldest-first (reversed from the DESC query) for display.
 * Clients will not see internal messages (filtered server-side).
 */
export async function getChannelMessages(
  projectId: string,
  cursor?: string,
  limit: number = 50
): Promise<ActionResult & { data?: ChannelMessagesData }> {
  try {
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const role = await getUserRole(user.id);

    // Verify access
    const hasAccess = await hasMessageAccess(user.id, role, projectId);
    if (!hasAccess) {
      return { success: false, error: 'You do not have access to this project' };
    }

    const isClient = role === 'client';

    // Build query — fetch one extra row to determine hasMore
    let query = supabase
      .from('portal_messages')
      .select(
        `
        id,
        channel_id,
        project_id,
        sender_id,
        content,
        content_html,
        is_internal,
        created_at,
        updated_at,
        sender:profiles!portal_messages_sender_id_fkey(id, full_name, email, role)
      `
      )
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(limit + 1);

    // Cursor-based pagination: get messages older than cursor
    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    // Clients should not see internal messages
    if (isClient) {
      query = query.eq('is_internal', false);
    }

    const { data: messages, error: messagesError } = await query;

    if (messagesError) {
      console.error('[getChannelMessages] Query error:', messagesError);
      return { success: false, error: 'Failed to fetch messages' };
    }

    if (!messages) {
      return {
        success: true,
        data: { messages: [], nextCursor: null, hasMore: false },
      };
    }

    const hasMore = messages.length > limit;
    const trimmedMessages = hasMore ? messages.slice(0, limit) : messages;

    // Determine next cursor (the oldest message in this batch, before reversing)
    const nextCursor = hasMore
      ? trimmedMessages[trimmedMessages.length - 1]?.created_at || null
      : null;

    // Normalize FK arrays and reverse for oldest-first display
    const normalizedMessages = trimmedMessages
      .map((msg) => ({
        id: msg.id,
        channelId: msg.channel_id,
        projectId: msg.project_id,
        senderId: msg.sender_id,
        content: msg.content,
        contentHtml: msg.content_html,
        isInternal: msg.is_internal,
        createdAt: msg.created_at,
        updatedAt: msg.updated_at,
        sender: Array.isArray(msg.sender) ? msg.sender[0] || null : msg.sender,
      }))
      .reverse(); // Reverse so messages display oldest-first in the thread

    return {
      success: true,
      data: {
        messages: normalizedMessages,
        nextCursor,
        hasMore,
      },
    };
  } catch (error) {
    console.error('[getChannelMessages] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch messages',
    };
  }
}

/**
 * Send a message in a project channel.
 * Creates the channel if it doesn't exist.
 * Clients cannot send internal messages.
 */
export async function sendMessage(input: {
  projectId: string;
  content: string;
  contentHtml?: string | null;
  isInternal?: boolean;
}): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Validate input with Zod
    const validation = validateData(sendMessageSchema, input);
    if (!validation.success) {
      return { success: false, error: validation.error };
    }

    const { projectId, content, contentHtml, isInternal } = validation.data;

    const role = await getUserRole(user.id);

    // Verify access
    const hasAccess = await hasMessageAccess(user.id, role, projectId);
    if (!hasAccess) {
      return { success: false, error: 'You do not have access to this project' };
    }

    // Clients cannot send internal messages
    if (isInternal && role === 'client') {
      return { success: false, error: 'Clients cannot send internal messages' };
    }

    // Ensure channel exists
    const channel = await getOrCreateChannel(projectId);
    if (!channel) {
      return { success: false, error: 'Failed to create or find message channel' };
    }

    // Insert the message
    const { data: newMessage, error: insertError } = await supabase
      .from('portal_messages')
      .insert({
        channel_id: channel.id,
        project_id: projectId,
        sender_id: user.id,
        content,
        content_html: contentHtml || null,
        is_internal: isInternal || false,
      })
      .select(
        `
        id,
        channel_id,
        project_id,
        sender_id,
        content,
        content_html,
        is_internal,
        created_at,
        updated_at,
        sender:profiles!portal_messages_sender_id_fkey(id, full_name, email, role)
      `
      )
      .single();

    if (insertError) {
      console.error('[sendMessage] Insert error:', insertError);
      return { success: false, error: 'Failed to send message' };
    }

    // Update channel metadata (last message info)
    const { error: updateError } = await supabase
      .from('portal_message_channels')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: content.substring(0, 120),
        last_message_sender_id: user.id,
      })
      .eq('id', channel.id);

    if (updateError) {
      // Non-fatal — message was already sent successfully
      console.error('[sendMessage] Channel update error:', updateError);
    }

    // Normalize the sender FK
    const normalizedMessage = newMessage
      ? {
          id: newMessage.id,
          channelId: newMessage.channel_id,
          projectId: newMessage.project_id,
          senderId: newMessage.sender_id,
          content: newMessage.content,
          contentHtml: newMessage.content_html,
          isInternal: newMessage.is_internal,
          createdAt: newMessage.created_at,
          updatedAt: newMessage.updated_at,
          sender: Array.isArray(newMessage.sender)
            ? newMessage.sender[0] || null
            : newMessage.sender,
        }
      : null;

    return { success: true, data: normalizedMessage };
  } catch (error) {
    console.error('[sendMessage] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send message',
    };
  }
}

/**
 * Mark a channel as read for the current user.
 * Upserts the read status with the current timestamp.
 */
export async function markChannelRead(channelId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Validate input
    const validation = validateData(markChannelReadSchema, { channelId });
    if (!validation.success) {
      return { success: false, error: validation.error };
    }

    // Upsert read status
    const { error: upsertError } = await supabase.from('portal_message_read_status').upsert(
      {
        channel_id: channelId,
        user_id: user.id,
        last_read_at: new Date().toISOString(),
      },
      { onConflict: 'channel_id,user_id' }
    );

    if (upsertError) {
      console.error('[markChannelRead] Upsert error:', upsertError);
      return { success: false, error: 'Failed to mark channel as read' };
    }

    return { success: true };
  } catch (error) {
    console.error('[markChannelRead] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to mark channel as read',
    };
  }
}

/**
 * Get unread message counts for all channels the user has access to.
 * Returns a map of channelId -> count, plus a total count.
 * For clients, internal messages are excluded from counts.
 */
export async function getUnreadCounts(
  userId: string
): Promise<ActionResult & { data?: UnreadCountsData }> {
  // userId passed by SWR for cache keying; auth derived server-side
  void userId;

  try {
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const role = await getUserRole(user.id);
    const isClient = role === 'client';

    // Get accessible channels
    let channelsQuery = supabase.from('portal_message_channels').select('id, project_id');

    if (isClient) {
      const clientProjectIds = await getClientProjectIds(user.id);
      if (clientProjectIds.length === 0) {
        return { success: true, data: { counts: {}, total: 0 } };
      }
      channelsQuery = channelsQuery.in('project_id', clientProjectIds);
    }

    const { data: channels, error: channelsError } = await channelsQuery;

    if (channelsError) {
      console.error('[getUnreadCounts] Channels query error:', channelsError);
      return { success: false, error: 'Failed to fetch channels' };
    }

    if (!channels || channels.length === 0) {
      return { success: true, data: { counts: {}, total: 0 } };
    }

    // Get read statuses for all channels in one query
    const channelIds = channels.map((c) => c.id);
    const { data: readStatuses } = await supabase
      .from('portal_message_read_status')
      .select('channel_id, last_read_at')
      .eq('user_id', user.id)
      .in('channel_id', channelIds);

    const readStatusMap = new Map<string, string>();
    if (readStatuses) {
      for (const rs of readStatuses) {
        readStatusMap.set(rs.channel_id, rs.last_read_at);
      }
    }

    // Batch-fetch unread counts with a single query instead of N queries
    const earliestReadAt = Math.min(
      ...channels.map((c) => {
        const lastRead = readStatusMap.get(c.id);
        return lastRead ? new Date(lastRead).getTime() : 0;
      })
    );
    const earliestReadAtISO =
      earliestReadAt > 0 ? new Date(earliestReadAt).toISOString() : '1970-01-01T00:00:00Z';

    let messagesQuery = supabase
      .from('portal_messages')
      .select('id, channel_id, created_at')
      .in('channel_id', channelIds)
      .gt('created_at', earliestReadAtISO);

    if (isClient) {
      messagesQuery = messagesQuery.eq('is_internal', false);
    }

    const { data: recentMessages } = await messagesQuery;

    // Compute unread counts in memory
    const counts: Record<string, number> = {};
    let total = 0;

    if (recentMessages) {
      for (const msg of recentMessages) {
        const channelLastRead = readStatusMap.get(msg.channel_id) || '1970-01-01T00:00:00Z';
        if (msg.created_at > channelLastRead) {
          counts[msg.channel_id] = (counts[msg.channel_id] || 0) + 1;
        }
      }
      for (const count of Object.values(counts)) {
        total += count;
      }
    }

    return { success: true, data: { counts, total } };
  } catch (error) {
    console.error('[getUnreadCounts] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch unread counts',
    };
  }
}
