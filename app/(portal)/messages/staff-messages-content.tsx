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
import { ContactList } from '@/components/portal/messaging/contact-list';
import dynamic from 'next/dynamic';

const MessageThread = dynamic(
  () =>
    import('@/components/portal/messaging/message-thread').then((m) => ({
      default: m.MessageThread,
    })),
  { ssr: false }
);

import { cn } from '@/lib/utils';

interface StaffMessagesContentProps {
  userId: string;
  userName: string;
  userRole: string;
}

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

export function StaffMessagesContent({ userId, userName, userRole }: StaffMessagesContentProps) {
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'contacts' | 'thread'>('contacts');

  void userName;

  const { channels, isLoading: channelsLoading } = useMessageChannels(userId);
  const { messages, isLoading: messagesLoading } = useChannelMessages(selectedProjectId);
  useRealtimeMessages(selectedProjectId, userId);

  const selectedChannel = useMemo(() => {
    if (!selectedProjectId) return null;
    return (channels as ChannelFromHook[]).find((ch) => ch.projectId === selectedProjectId) || null;
  }, [channels, selectedProjectId]);

  const selectedProject = useMemo(() => {
    if (!selectedChannel?.project) return null;
    return selectedChannel.project;
  }, [selectedChannel]);

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

  const handleSelectContact = useCallback(
    async (contactId: string, projectId: string, channelId: string) => {
      setSelectedContactId(contactId);
      setSelectedProjectId(projectId);
      setSelectedChannelId(channelId);
      setMobileView('thread');

      try {
        await markChannelRead(channelId);
        invalidateMessageChannels(userId, true);
      } catch (error) {
        console.error('[StaffMessagesContent] Failed to mark channel read:', error);
      }
    },
    [userId]
  );

  const handleMessageSent = useCallback(() => {
    if (selectedProjectId) {
      invalidateChannelMessages(selectedProjectId, true);
    }
    invalidateMessageChannels(userId, true);
  }, [selectedProjectId, userId]);

  const handleMobileBack = useCallback(() => {
    setMobileView('contacts');
  }, []);

  void selectedChannelId;

  return (
    <div className="flex h-[100dvh]">
      {/* Contact list — left panel */}
      <div
        className={cn(
          'h-full w-full shrink-0 border-r border-border md:w-[320px]',
          mobileView === 'contacts' ? 'block' : 'hidden md:block'
        )}
      >
        {channelsLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <ContactList
            userId={userId}
            channels={normalizedChannels}
            onSelectContact={handleSelectContact}
            selectedContactId={selectedContactId}
          />
        )}
      </div>

      {/* Message thread — right panel */}
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
          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50">
              <MessageSquare className="h-12 w-12 text-muted-foreground/40" />
            </div>
            <p className="mt-5 text-base font-semibold tracking-tight text-foreground">
              Select a contact to start chatting
            </p>
            <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
              Choose someone from the list to view your conversation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
