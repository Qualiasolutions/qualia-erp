'use server';

/**
 * Portal messaging server actions — type stub.
 *
 * This file provides the type signatures consumed by SWR hooks in lib/swr.ts.
 * The real implementation will be provided by the parallel portal-messages task.
 * If you are reading this comment, the real implementation should replace this file.
 */

import type { ActionResult } from './shared';

// ── Channel types ──────────────────────────────────────────────────────────

export interface MessageChannel {
  id: string;
  project_id: string;
  project_name: string;
  last_message: {
    content: string;
    sender_name: string;
    created_at: string;
  } | null;
  has_unread: boolean;
}

export interface ChannelMessage {
  id: string;
  project_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  content: string;
  created_at: string;
  attachments: string[];
}

// ── Server actions (stubs — real implementations built in parallel) ────────

export async function getMessageChannels(
  userId: string
): Promise<ActionResult & { data?: MessageChannel[] }> {
  void userId;
  return { success: true, data: [] };
}

export async function getChannelMessages(
  projectId: string,
  cursor?: string
): Promise<
  ActionResult & {
    data?: {
      messages: ChannelMessage[];
      nextCursor: string | null;
      hasMore: boolean;
    };
  }
> {
  void projectId;
  void cursor;
  return {
    success: true,
    data: { messages: [], nextCursor: null, hasMore: false },
  };
}

export async function sendMessage(
  projectId: string,
  content: string,
  attachments?: string[]
): Promise<ActionResult> {
  void projectId;
  void content;
  void attachments;
  return { success: false, error: 'Not implemented — stub only' };
}

export async function markChannelRead(projectId: string, userId: string): Promise<ActionResult> {
  void projectId;
  void userId;
  return { success: false, error: 'Not implemented — stub only' };
}

export async function getUnreadCounts(userId: string): Promise<
  ActionResult & {
    data?: {
      counts: Record<string, number>;
      total: number;
    };
  }
> {
  void userId;
  return { success: true, data: { counts: {}, total: 0 } };
}
