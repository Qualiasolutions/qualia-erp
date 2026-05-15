'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { MessageSquare, X, ChevronLeft } from 'lucide-react';
import { AnimatePresence, m } from '@/lib/lazy-motion';
import {
  useMessageChannels,
  useChannelMessages,
  invalidateChannelMessages,
  invalidateMessageChannels,
} from '@/lib/swr';
import { useRealtimeMessages } from '@/lib/hooks/use-realtime-messages';
import { markChannelRead } from '@/app/actions/portal-messages';
import { ChannelList } from '@/components/portal/messaging/channel-list';
import { MessageThread } from '@/components/portal/messaging/message-thread';
import { NewConversationDialog } from '@/components/portal/messaging/new-conversation-dialog';
import { usePresence } from '@/components/portal/presence-broadcaster';
import { cn } from '@/lib/utils';

interface ClientChatWidgetProps {
  userId: string;
  userName: string;
  userRole: string;
}

export function ClientChatWidget({ userId, userName, userRole }: ClientChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [newConversationOpen, setNewConversationOpen] = useState(false);

  // Workspace presence — drives the "who's online" strip in the channel list.
  // PresenceProvider lives one level up in the portal layout; outside that tree
  // (e.g. for users without a workspaceId) usePresence falls back to an empty
  // array, so the strip simply doesn't render.
  const presenceEntries = usePresence();
  const onlineUsers = useMemo(
    () =>
      presenceEntries
        .filter((p) => p.user_id !== userId)
        .map((p) => ({
          userId: p.user_id,
          fullName: p.full_name,
          avatarUrl: p.avatar_url,
          role: p.role,
        })),
    [presenceEntries, userId]
  );

  // Hydrate open state from sessionStorage after mount to avoid SSR mismatch
  /* eslint-disable react-hooks/set-state-in-effect -- mount-once sessionStorage hydration; SSR-safe via useEffect */
  useEffect(() => {
    const stored = sessionStorage.getItem('qualia-chat-open');
    if (stored === 'true') {
      setIsOpen(true);
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => {
      const next = !prev;
      sessionStorage.setItem('qualia-chat-open', String(next));
      return next;
    });
  }, []);

  // Fetch channels
  const { channels, isLoading: channelsLoading } = useMessageChannels(userId);

  // Fetch messages for the selected channel
  const { messages, isLoading: messagesLoading } = useChannelMessages(selectedProjectId);

  // Subscribe to realtime updates for the active channel
  useRealtimeMessages(selectedProjectId, userId);

  // Compute total unread across all channels
  const totalUnread = useMemo(() => {
    return (channels as ChannelShape[]).reduce(
      (sum: number, ch: ChannelShape) => sum + (ch.unreadCount || 0),
      0
    );
  }, [channels]);

  // Normalize channels for ChannelList component
  const normalizedChannels = useMemo(() => {
    return (channels as ChannelShape[]).map((ch) => ({
      id: ch.id,
      projectId: ch.projectId,
      project: ch.project,
      lastMessagePreview: ch.lastMessagePreview,
      lastMessageAt: ch.lastMessageAt,
      lastMessageSender: ch.lastMessageSender,
      unreadCount: ch.unreadCount,
    }));
  }, [channels]);

  // Normalize messages for MessageThread component
  const normalizedMessages = useMemo(() => {
    return (messages as MessageShape[]).map((msg) => ({
      id: msg.id,
      content: msg.content,
      contentHtml: msg.contentHtml,
      isInternal: msg.isInternal,
      createdAt: msg.createdAt,
      senderId: msg.senderId,
      sender: msg.sender,
    }));
  }, [messages]);

  // Find selected project name for thread header
  const selectedProject = useMemo(() => {
    if (!selectedProjectId) return null;
    const ch = (channels as ChannelShape[]).find((c) => c.projectId === selectedProjectId);
    return ch?.project ?? null;
  }, [channels, selectedProjectId]);

  // Handle channel selection
  const handleSelectChannel = useCallback(
    async (projectId: string, channelId: string) => {
      setSelectedProjectId(projectId);
      setSelectedChannelId(channelId);

      // Mark channel as read in the background
      try {
        await markChannelRead(channelId);
        invalidateMessageChannels(userId, true);
      } catch (error) {
        console.error('[ClientChatWidget] Failed to mark channel read:', error);
      }
    },
    [userId]
  );

  // Handle back from thread to channel list
  const handleBack = useCallback(() => {
    setSelectedProjectId(null);
    setSelectedChannelId(null);
  }, []);

  // Handle message sent — refresh caches
  const handleMessageSent = useCallback(() => {
    if (selectedProjectId) {
      invalidateChannelMessages(selectedProjectId, true);
    }
    invalidateMessageChannels(userId, true);
  }, [selectedProjectId, userId]);

  // After NewConversationDialog creates a channel, drop the user straight into it.
  const handleConversationStarted = useCallback(
    (projectId: string, channelId: string) => {
      setSelectedProjectId(projectId);
      setSelectedChannelId(channelId);
      // Marking read is harmless on a brand-new empty channel.
      markChannelRead(channelId).catch(() => {});
      invalidateMessageChannels(userId, true);
    },
    [userId]
  );

  // Suppress unused — selectedChannelId is tracked for markChannelRead calls
  void selectedChannelId;

  return (
    <>
      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <m.div
            key="chat-panel"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'fixed z-assistant flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/85 shadow-elevation-4 ring-1 ring-primary/10 backdrop-blur-xl',
              // Mobile: near full-screen
              'inset-x-3 bottom-3 top-16',
              // Desktop: floating panel — slightly bigger, anchored bottom-right
              'sm:inset-auto sm:bottom-24 sm:right-6 sm:h-[600px] sm:w-[400px]'
            )}
            style={{ transformOrigin: 'bottom right' }}
          >
            {/* Panel header — single, replaces the duplicate header in MessageThread */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/60 bg-gradient-to-b from-card/60 to-transparent px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                {selectedProjectId && (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="-ml-1 flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                    aria-label="Back to channels"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                )}
                <div className="min-w-0">
                  <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">
                    {selectedProjectId ? 'Project thread' : 'Channels'}
                  </div>
                  <h3 className="mt-0.5 truncate text-[14px] font-semibold tracking-tight text-foreground">
                    {selectedProjectId ? (selectedProject?.name ?? 'Project') : 'Messages'}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggle}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                aria-label="Close messages"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Panel body */}
            <div className="min-h-0 flex-1 overflow-hidden">
              {!selectedProjectId ? (
                <ChannelList
                  channels={normalizedChannels}
                  selectedProjectId={selectedProjectId}
                  onSelectChannel={handleSelectChannel}
                  onNewConversation={() => setNewConversationOpen(true)}
                  isLoading={channelsLoading}
                  onlineUsers={userRole === 'admin' || userRole === 'employee' ? onlineUsers : []}
                />
              ) : (
                <MessageThread
                  messages={normalizedMessages}
                  projectName={selectedProject?.name ?? 'Project'}
                  projectId={selectedProjectId}
                  userId={userId}
                  userRole={userRole}
                  isLoading={messagesLoading}
                  onMessageSent={handleMessageSent}
                  onBack={handleBack}
                />
              )}
            </div>
          </m.div>
        )}
      </AnimatePresence>

      {/* New conversation dialog (wired to the + button in the channel list header) */}
      <NewConversationDialog
        open={newConversationOpen}
        onClose={() => setNewConversationOpen(false)}
        userId={userId}
        onConversationStarted={handleConversationStarted}
      />

      {/* Bubble button */}
      <button
        type="button"
        onClick={handleToggle}
        className={cn(
          'group fixed bottom-6 right-6 z-assistant',
          'flex h-14 w-14 items-center justify-center rounded-full',
          'bg-primary text-primary-foreground shadow-lg shadow-primary/25',
          'ring-1 ring-primary/30 ring-offset-2 ring-offset-background',
          'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/35',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2'
        )}
        aria-label={isOpen ? 'Close messages' : 'Open messages'}
      >
        {isOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <MessageSquare className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
        )}
        {/* Unread badge */}
        {totalUnread > 0 && !isOpen && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-background bg-destructive px-1 text-[10px] font-bold tabular-nums text-destructive-foreground shadow-sm">
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}
      </button>
    </>
  );
}

// ============ Type helpers matching SWR hook return shapes ============

interface ChannelShape {
  id: string;
  projectId: string;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  lastMessageSender: { id: string; full_name: string | null } | null;
  project: { id: string; name: string; project_type: string; status: string | null } | null;
  unreadCount: number;
}

interface MessageShape {
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
}
