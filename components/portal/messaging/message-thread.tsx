'use client';

import { useEffect, useRef, useMemo } from 'react';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { parseISO, format, isToday, isYesterday } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageBubble } from './message-bubble';
import { MessageComposer } from './message-composer';

interface MessageData {
  id: string;
  content: string;
  contentHtml?: string | null;
  isInternal: boolean;
  createdAt: string;
  senderId: string;
  sender: {
    id: string;
    full_name: string | null;
    email: string | null;
    role: string | null;
  } | null;
}

interface MessageThreadProps {
  messages: MessageData[];
  projectName: string;
  projectId: string;
  userId: string;
  userRole: string;
  isLoading: boolean;
  onMessageSent: () => void;
  onBack?: () => void;
}

export function MessageThread({
  messages,
  projectName,
  projectId,
  userId,
  userRole,
  isLoading,
  onMessageSent,
  onBack,
}: MessageThreadProps) {
  const scrollEndRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current || prevMessageCountRef.current === 0) {
      scrollEndRef.current?.scrollIntoView({
        behavior: prevMessageCountRef.current === 0 ? 'auto' : 'smooth',
      });
    }
    prevMessageCountRef.current = messages.length;
  }, [messages.length]);

  // Group messages by date (memoized to avoid recalculating on every render)
  const groupedMessages = useMemo(() => groupMessagesByDate(messages), [messages]);

  return (
    <div className="flex h-full flex-1 flex-col">
      {/* Thread header */}
      <header className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3">
        {onBack && (
          <button
            onClick={onBack}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-muted/50 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 md:hidden"
            aria-label="Back to channels"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <h2 className="truncate text-sm font-semibold text-foreground">{projectName}</h2>
      </header>

      {/* Messages area */}
      {isLoading ? (
        <div className="flex-1 p-4">
          <MessagesSkeleton />
        </div>
      ) : messages.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
          <MessageSquare className="mb-3 h-12 w-12 text-muted-foreground/30" />
          <p className="text-base font-medium text-foreground">Start a conversation</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Send a message about <span className="font-medium text-foreground">{projectName}</span>
          </p>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="space-y-1 p-4">
            {groupedMessages.map((group) => (
              <div key={group.dateLabel}>
                {/* Date separator */}
                <div className="py-4 text-center">
                  <span className="rounded-full bg-muted/50 px-3 py-1 text-[10px] font-medium text-muted-foreground">
                    {group.dateLabel}
                  </span>
                </div>

                {/* Messages for this date */}
                <div className="space-y-1">
                  {group.messages.map((msg, idx) => {
                    const prevMsg = idx > 0 ? group.messages[idx - 1] : null;
                    const showSender = !prevMsg || prevMsg.senderId !== msg.senderId;
                    const senderName = msg.sender?.full_name || msg.sender?.email || 'Unknown';
                    const senderRole = msg.sender?.role || 'client';

                    return (
                      <div key={msg.id} className={showSender && idx > 0 ? 'pt-2' : ''}>
                        <MessageBubble
                          content={msg.content}
                          contentHtml={msg.contentHtml}
                          isInternal={msg.isInternal}
                          senderName={senderName}
                          senderRole={senderRole}
                          isOwn={msg.senderId === userId}
                          showSender={showSender}
                          timestamp={msg.createdAt}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <div ref={scrollEndRef} aria-hidden="true" />
          </div>
        </ScrollArea>
      )}

      {/* Composer */}
      <MessageComposer projectId={projectId} userRole={userRole} onMessageSent={onMessageSent} />
    </div>
  );
}

// ============ Helpers ============

interface MessageGroup {
  dateLabel: string;
  messages: MessageData[];
}

function groupMessagesByDate(messages: MessageData[]): MessageGroup[] {
  const groups: MessageGroup[] = [];
  let currentLabel = '';
  let currentGroup: MessageData[] = [];

  for (const msg of messages) {
    const label = getDateLabel(msg.createdAt);
    if (label !== currentLabel) {
      if (currentGroup.length > 0) {
        groups.push({ dateLabel: currentLabel, messages: currentGroup });
      }
      currentLabel = label;
      currentGroup = [msg];
    } else {
      currentGroup.push(msg);
    }
  }

  if (currentGroup.length > 0) {
    groups.push({ dateLabel: currentLabel, messages: currentGroup });
  }

  return groups;
}

function getDateLabel(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMMM d, yyyy');
  } catch {
    return 'Unknown';
  }
}

function MessagesSkeleton() {
  return (
    <div className="space-y-4">
      {/* Left-aligned message */}
      <div className="flex justify-start">
        <div className="max-w-[60%] space-y-1">
          <Skeleton className="h-3 w-20 bg-muted/50" />
          <Skeleton className="h-16 w-64 rounded-2xl rounded-bl-sm bg-muted/50" />
        </div>
      </div>
      {/* Right-aligned message */}
      <div className="flex justify-end">
        <div className="max-w-[60%] space-y-1">
          <Skeleton className="ml-auto h-3 w-16 bg-muted/50" />
          <Skeleton className="h-12 w-48 rounded-2xl rounded-br-sm bg-muted/50" />
        </div>
      </div>
      {/* Left-aligned message */}
      <div className="flex justify-start">
        <div className="max-w-[60%] space-y-1">
          <Skeleton className="h-3 w-24 bg-muted/50" />
          <Skeleton className="h-20 w-56 rounded-2xl rounded-bl-sm bg-muted/50" />
        </div>
      </div>
    </div>
  );
}
