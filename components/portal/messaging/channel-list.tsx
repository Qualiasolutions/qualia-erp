'use client';

import { useState } from 'react';
import { Search, MessageSquare, Plus } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ChannelData {
  id: string;
  projectId: string;
  project: { id: string; name: string; project_type: string; status?: string | null } | null;
  lastMessagePreview?: string | null;
  lastMessageAt?: string | null;
  lastMessageSender?: { id: string; full_name: string | null } | null;
  unreadCount: number;
}

interface ChannelListProps {
  channels: ChannelData[];
  selectedProjectId: string | null;
  onSelectChannel: (projectId: string, channelId: string) => void;
  onNewConversation: () => void;
  isLoading: boolean;
}

export function ChannelList({
  channels,
  selectedProjectId,
  onSelectChannel,
  onNewConversation,
  isLoading,
}: ChannelListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredChannels = searchQuery.trim()
    ? channels.filter((ch) => ch.project?.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : channels;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
            <MessageSquare className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-sm font-semibold text-foreground">Messages</h2>
        </div>
        <button
          type="button"
          onClick={onNewConversation}
          className={cn(
            'flex h-8 items-center gap-1.5 rounded-xl border border-border bg-background px-2.5',
            'text-xs font-medium text-foreground transition-colors duration-150',
            'hover:border-primary/30 hover:bg-primary/[0.06] hover:text-primary',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30'
          )}
          aria-label="Start a new conversation"
        >
          <Plus className="h-3.5 w-3.5" />
          New
        </button>
      </div>

      {/* Search */}
      <div className="shrink-0 px-3 py-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              'h-9 w-full rounded-xl border-transparent bg-muted/30 pl-8 pr-3',
              'text-sm text-foreground placeholder:text-muted-foreground',
              'focus:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/30',
              'transition-colors duration-150'
            )}
            aria-label="Search conversations"
          />
        </div>
      </div>

      {/* Channel list */}
      <div className="flex-1 overflow-y-auto" role="listbox" aria-label="Message channels">
        {isLoading ? (
          <ChannelListSkeleton />
        ) : filteredChannels.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
            <MessageSquare className="mb-3 h-12 w-12 text-muted-foreground/30" />
            <p className="text-sm font-medium text-foreground">
              {searchQuery.trim() ? 'No matching conversations' : 'No conversations yet'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {searchQuery.trim()
                ? 'Try a different search term'
                : 'Start a conversation about any of your projects'}
            </p>
            {!searchQuery.trim() && (
              <button
                type="button"
                onClick={onNewConversation}
                className={cn(
                  'mt-4 inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/[0.06] px-3 py-1.5',
                  'text-xs font-medium text-primary transition-colors duration-150',
                  'hover:bg-primary/10',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30'
                )}
              >
                <Plus className="h-3.5 w-3.5" />
                New conversation
              </button>
            )}
          </div>
        ) : (
          filteredChannels.map((channel) => {
            const isActive = channel.projectId === selectedProjectId;
            const projectName = channel.project?.name || 'Unknown Project';
            const senderName = channel.lastMessageSender?.full_name || null;
            const preview = channel.lastMessagePreview || null;
            const timeAgo = channel.lastMessageAt
              ? formatRelativeTime(channel.lastMessageAt)
              : null;

            return (
              <button
                key={channel.id}
                role="option"
                aria-selected={isActive}
                onClick={() => onSelectChannel(channel.projectId, channel.id)}
                className={cn(
                  'flex w-full cursor-pointer items-start gap-3 border-b border-border/30 px-3 py-3 text-left transition-colors duration-150',
                  isActive
                    ? 'border-l-2 border-l-primary bg-primary/[0.06]'
                    : 'border-l-2 border-l-transparent hover:bg-muted/50'
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={cn(
                        'truncate text-sm',
                        channel.unreadCount > 0
                          ? 'font-semibold text-foreground'
                          : 'font-medium text-foreground'
                      )}
                    >
                      {projectName}
                    </p>
                    {timeAgo && (
                      <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo}</span>
                    )}
                  </div>
                  {preview && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {senderName ? `${senderName}: ` : ''}
                      {preview}
                    </p>
                  )}
                </div>
                {channel.unreadCount > 0 && (
                  <span className="mt-0.5 flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                    {channel.unreadCount > 99 ? '99+' : channel.unreadCount}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function ChannelListSkeleton() {
  return (
    <div className="space-y-0">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="border-b border-border/30 px-3 py-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-32 bg-muted/50" />
            <Skeleton className="h-3 w-10 bg-muted/50" />
          </div>
          <Skeleton className="mt-1.5 h-3 w-48 bg-muted/50" />
        </div>
      ))}
    </div>
  );
}

function formatRelativeTime(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    return formatDistanceToNow(date, { addSuffix: false })
      .replace('about ', '')
      .replace('less than a minute', 'now')
      .replace(' minutes', 'm')
      .replace(' minute', 'm')
      .replace(' hours', 'h')
      .replace(' hour', 'h')
      .replace(' days', 'd')
      .replace(' day', 'd')
      .replace(' months', 'mo')
      .replace(' month', 'mo');
  } catch {
    return '';
  }
}
