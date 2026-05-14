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
    <div className="flex h-full flex-col bg-[hsl(var(--surface-2))]/30 dark:bg-transparent">
      {/* Search (header lives in the widget container now) */}
      <div className="shrink-0 px-3 pb-3 pt-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search projects…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              'h-10 w-full rounded-xl border border-border bg-card pl-9 pr-3',
              'text-sm text-foreground placeholder:text-muted-foreground',
              'focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/30',
              'transition-colors duration-150'
            )}
            aria-label="Search conversations"
          />
        </div>
      </div>

      {/* Channel list */}
      <div
        className="flex-1 overflow-y-auto px-2 pb-3"
        role="listbox"
        aria-label="Message channels"
      >
        {isLoading ? (
          <ChannelListSkeleton />
        ) : filteredChannels.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="mt-4 text-sm font-semibold tracking-tight text-foreground">
              {searchQuery.trim() ? 'No matches' : 'No conversations yet'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {searchQuery.trim()
                ? 'Try a different search term.'
                : 'Start a thread on any of your projects.'}
            </p>
            {!searchQuery.trim() && (
              <button
                type="button"
                onClick={onNewConversation}
                className={cn(
                  'mt-4 inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/[0.08] px-3 py-2',
                  'text-xs font-medium text-primary transition-colors duration-150',
                  'hover:bg-primary/15',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30'
                )}
              >
                <Plus className="h-3.5 w-3.5" />
                New conversation
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-0.5">
            {filteredChannels.map((channel) => {
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
                    'flex w-full cursor-pointer items-start gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors duration-150',
                    isActive ? 'bg-primary/[0.1] text-foreground' : 'hover:bg-card'
                  )}
                >
                  <ProjectInitial name={projectName} hasUnread={channel.unreadCount > 0} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={cn(
                          'truncate text-[13.5px]',
                          channel.unreadCount > 0
                            ? 'font-semibold text-foreground'
                            : 'font-medium text-foreground'
                        )}
                      >
                        {projectName}
                      </p>
                      {timeAgo && (
                        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                          {timeAgo}
                        </span>
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
                    <span className="mt-0.5 flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-primary px-1 font-mono text-[10px] font-bold text-primary-foreground">
                      {channel.unreadCount > 99 ? '99+' : channel.unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectInitial({ name, hasUnread }: { name: string; hasUnread: boolean }) {
  const initial = (name.trim()[0] ?? '?').toUpperCase();
  return (
    <div
      className={cn(
        'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-mono text-[11px] font-semibold uppercase tracking-tight transition-colors',
        hasUnread
          ? 'bg-primary/15 text-primary ring-1 ring-primary/20'
          : 'bg-muted/50 text-muted-foreground'
      )}
      aria-hidden="true"
    >
      {initial}
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
