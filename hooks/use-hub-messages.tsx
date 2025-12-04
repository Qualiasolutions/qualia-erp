'use client';

import { createClient } from '@/lib/supabase/client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getHubMessages, sendHubMessage, type HubMessage } from '@/app/actions';

interface UseHubMessagesProps {
  workspaceId: string;
  channelType?: 'workspace' | 'project';
  projectId?: string | null;
}

export function useHubMessages({
  workspaceId,
  channelType = 'workspace',
  projectId,
}: UseHubMessagesProps) {
  const supabase = createClient();
  const [messages, setMessages] = useState<HubMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const initialLoadRef = useRef(false);

  // Initial fetch
  useEffect(() => {
    if (!workspaceId || initialLoadRef.current) return;
    initialLoadRef.current = true;

    async function loadMessages() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getHubMessages(workspaceId, {
          channelType,
          projectId,
          limit: 50,
        });
        // Reverse to show oldest first (for chat order)
        setMessages(data.reverse());
        setHasMore(data.length >= 50);
      } catch (err) {
        setError('Failed to load messages');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    loadMessages();
  }, [workspaceId, channelType, projectId]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!workspaceId) return;

    const channel = supabase
      .channel(`hub-messages-${workspaceId}-${channelType}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        async (payload) => {
          // Fetch the full message with relations
          const { data: newMessage } = await supabase
            .from('messages')
            .select(
              `
              id,
              content,
              channel_type,
              project_id,
              linked_issue_id,
              created_at,
              author:profiles!messages_author_id_fkey (id, full_name, email, avatar_url),
              linked_issue:issues (id, title, status)
            `
            )
            .eq('id', payload.new.id)
            .single();

          if (newMessage) {
            const normalizedMessage: HubMessage = {
              ...newMessage,
              author: Array.isArray(newMessage.author)
                ? newMessage.author[0] || null
                : newMessage.author,
              linked_issue: Array.isArray(newMessage.linked_issue)
                ? newMessage.linked_issue[0] || null
                : newMessage.linked_issue,
            } as HubMessage;

            setMessages((current) => {
              // Avoid duplicates (in case we already added it optimistically)
              if (current.some((m) => m.id === normalizedMessage.id)) {
                return current;
              }
              return [...current, normalizedMessage];
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          // Handle soft deletes
          if (payload.new.deleted_at) {
            setMessages((current) => current.filter((m) => m.id !== payload.new.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId, channelType, supabase]);

  // Send message with optimistic update
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isSending) return { success: false };

      setIsSending(true);
      setError(null);

      const formData = new FormData();
      formData.set('content', content.trim());
      formData.set('workspace_id', workspaceId);
      formData.set('channel_type', channelType);
      if (projectId) {
        formData.set('project_id', projectId);
      }

      try {
        const result = await sendHubMessage(formData);
        if (!result.success) {
          setError(result.error || 'Failed to send message');
          return { success: false };
        }
        // Message will be added via realtime subscription
        return { success: true };
      } catch (err) {
        setError('Failed to send message');
        console.error(err);
        return { success: false };
      } finally {
        setIsSending(false);
      }
    },
    [workspaceId, channelType, projectId, isSending]
  );

  // Load more (older) messages
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading || messages.length === 0) return;

    setIsLoading(true);
    try {
      const oldestMessage = messages[0];
      const olderMessages = await getHubMessages(workspaceId, {
        channelType,
        projectId,
        limit: 50,
        before: oldestMessage.id,
      });

      if (olderMessages.length < 50) {
        setHasMore(false);
      }

      // Prepend older messages (reversed for chat order)
      setMessages((current) => [...olderMessages.reverse(), ...current]);
    } catch (err) {
      console.error('Failed to load more messages:', err);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, channelType, projectId, hasMore, isLoading, messages]);

  return {
    messages,
    isLoading,
    isSending,
    error,
    hasMore,
    sendMessage,
    loadMore,
  };
}
