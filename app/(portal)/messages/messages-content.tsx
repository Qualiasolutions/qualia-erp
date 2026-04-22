'use client';

import { useState, useCallback, useMemo } from 'react';
import { MessageSquare } from 'lucide-react';
import {
  useMessageChannels,
  useChannelMessages,
  invalidateChannelMessages,
  invalidateMessageChannels,
} from '@/lib/swr';
import { useRealtimeMessages } from '@/lib/hooks/use-realtime-messages';
import { markChannelRead } from '@/app/actions/portal-messages';
import { ChannelList } from '@/components/portal/messaging/channel-list';
import dynamic from 'next/dynamic';
const MessageThread = dynamic(
  () =>
    import('@/components/portal/messaging/message-thread').then((m) => ({
      default: m.MessageThread,
    })),
  { ssr: false }
);
import { ChannelDetails } from '@/components/portal/messaging/channel-details';
import { NewConversationDialog } from '@/components/portal/messaging/new-conversation-dialog';
import { cn } from '@/lib/utils';

interface MessagesContentProps {
  userId: string;
  userName: string;
  userRole: string;
}

export function MessagesContent({ userId, userName, userRole }: MessagesContentProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'channels' | 'thread'>('channels');
  const [showDetails] = useState(true);
  const [newConversationOpen, setNewConversationOpen] = useState(false);

  // Suppress unused variable warnings — userName is part of the interface contract,
  // selectedChannelId is tracked for markChannelRead calls
  void userName;
  void selectedChannelId;

  // Fetch channels
  const { channels, isLoading: channelsLoading } = useMessageChannels(userId);

  // Fetch messages for the selected channel
  const { messages, isLoading: messagesLoading } = useChannelMessages(selectedProjectId);

  // Subscribe to realtime updates
  useRealtimeMessages(selectedProjectId, userId);

  // Find the selected channel to get project details
  const selectedChannel = useMemo(() => {
    if (!selectedProjectId) return null;
    return (channels as ChannelFromHook[]).find((ch) => ch.projectId === selectedProjectId) || null;
  }, [channels, selectedProjectId]);

  const selectedProject = useMemo(() => {
    if (!selectedChannel?.project) return null;
    return selectedChannel.project;
  }, [selectedChannel]);

  // Handle channel selection
  const handleSelectChannel = useCallback(
    async (projectId: string, channelId: string) => {
      setSelectedProjectId(projectId);
      setSelectedChannelId(channelId);
      setMobileView('thread');

      // Mark channel as read in the background
      try {
        await markChannelRead(channelId);
        invalidateMessageChannels(userId, true);
      } catch (error) {
        console.error('[MessagesContent] Failed to mark channel read:', error);
      }
    },
    [userId]
  );

  // Handle back navigation on mobile
  const handleMobileBack = useCallback(() => {
    setMobileView('channels');
  }, []);

  // Handle "new conversation" — opens the project picker dialog
  const handleOpenNewConversation = useCallback(() => {
    setNewConversationOpen(true);
  }, []);

  // After the dialog successfully creates/opens a channel, select it
  const handleConversationStarted = useCallback((projectId: string, channelId: string) => {
    setSelectedProjectId(projectId);
    setSelectedChannelId(channelId);
    setMobileView('thread');
  }, []);

  // Handle message sent — refresh messages and channels
  const handleMessageSent = useCallback(() => {
    if (selectedProjectId) {
      invalidateChannelMessages(selectedProjectId, true);
    }
    invalidateMessageChannels(userId, true);
  }, [selectedProjectId, userId]);

  // Normalize messages to the shape expected by MessageThread
  const normalizedMessages = useMemo(() => {
    return (messages as MessageFromHook[]).map((msg) => ({
      id: msg.id,
      content: msg.content,
      contentHtml: msg.contentHtml,
      isInternal: msg.isInternal,
      createdAt: msg.createdAt,
      senderId: msg.senderId,
      sender: msg.sender,
    }));
  }, [messages]);

  // Normalize channels to the shape expected by ChannelList
  const normalizedChannels = useMemo(() => {
    return (channels as ChannelFromHook[]).map((ch) => ({
      id: ch.id,
      projectId: ch.projectId,
      project: ch.project,
      lastMessagePreview: ch.lastMessagePreview,
      lastMessageAt: ch.lastMessageAt,
      lastMessageSender: ch.lastMessageSender,
      unreadCount: ch.unreadCount,
    }));
  }, [channels]);

  return (
    <div className="flex h-[100dvh]">
      {/* Channel List — left panel */}
      <div
        className={cn(
          'h-full w-full shrink-0 border-r border-border bg-card md:w-[280px]',
          mobileView === 'channels' ? 'block' : 'hidden md:block'
        )}
      >
        <ChannelList
          channels={normalizedChannels}
          selectedProjectId={selectedProjectId}
          onSelectChannel={handleSelectChannel}
          onNewConversation={handleOpenNewConversation}
          isLoading={channelsLoading}
        />
      </div>

      {/* Message Thread — center panel */}
      <div
        className={cn(
          'h-full min-w-0 flex-1',
          mobileView === 'thread' ? 'block' : 'hidden md:block'
        )}
      >
        {selectedProjectId && selectedProject ? (
          <MessageThread
            messages={normalizedMessages}
            projectName={selectedProject.name}
            projectId={selectedProjectId}
            userId={userId}
            userRole={userRole}
            isLoading={messagesLoading}
            onMessageSent={handleMessageSent}
            onBack={handleMobileBack}
          />
        ) : (
          <EmptyThreadPlaceholder />
        )}
      </div>

      {/* Channel Details — right panel (lg+ only) */}
      {selectedProject && (
        <ChannelDetails
          project={{
            id: selectedProject.id,
            name: selectedProject.name,
            project_type: selectedProject.project_type,
            status: selectedProject.status ?? null,
          }}
          isVisible={showDetails}
        />
      )}

      {/* New Conversation Dialog */}
      <NewConversationDialog
        open={newConversationOpen}
        onClose={() => setNewConversationOpen(false)}
        userId={userId}
        onConversationStarted={handleConversationStarted}
      />
    </div>
  );
}

function EmptyThreadPlaceholder() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4 text-center">
      <MessageSquare className="mb-3 h-12 w-12 text-muted-foreground/30" />
      <p className="text-base font-medium text-foreground">Select a conversation</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Choose a project from the list to view messages
      </p>
    </div>
  );
}

// ============ Type helpers for SWR hook return data ============
// These match the shapes returned by the server actions and normalized by SWR hooks

interface ChannelFromHook {
  id: string;
  projectId: string;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  lastMessageSenderId: string | null;
  createdAt: string;
  project: {
    id: string;
    name: string;
    project_type: string;
    status: string | null;
  } | null;
  lastMessageSender: {
    id: string;
    full_name: string | null;
  } | null;
  unreadCount: number;
}

interface MessageFromHook {
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
