'use client';

import Image from 'next/image';
import { type HubMessage as HubMessageType } from '@/app/actions';
import { formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface HubMessageProps {
  message: HubMessageType;
  showAuthor: boolean;
}

export function HubMessage({ message, showAuthor }: HubMessageProps) {
  const authorName = message.author?.full_name || message.author?.email || 'Unknown';
  const initials = authorName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={cn('group', showAuthor ? 'mt-4' : 'mt-0.5')}>
      {showAuthor && (
        <div className="mb-1 flex items-center gap-2">
          {/* Avatar */}
          {message.author?.avatar_url ? (
            <Image
              src={message.author.avatar_url}
              alt={authorName}
              width={24}
              height={24}
              className="h-6 w-6 rounded-full"
            />
          ) : (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-qualia-600/20">
              <span className="text-[10px] font-medium text-qualia-500">{initials}</span>
            </div>
          )}
          <span className="text-sm font-medium">{authorName}</span>
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(new Date(message.created_at))}
          </span>
        </div>
      )}

      <div className={cn('relative', showAuthor ? 'ml-8' : 'ml-8')}>
        <p className="whitespace-pre-wrap break-words text-sm text-foreground/90">
          {message.content}
        </p>

        {/* Linked Issue */}
        {message.linked_issue && (
          <a
            href={`/issues/${message.linked_issue.id}`}
            className="mt-2 inline-flex items-center gap-2 rounded-md bg-secondary/50 px-2.5 py-1.5 text-xs transition-colors hover:bg-secondary"
          >
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                message.linked_issue.status === 'Done'
                  ? 'bg-emerald-500'
                  : message.linked_issue.status === 'In Progress'
                    ? 'bg-amber-500'
                    : 'bg-blue-500'
              )}
            />
            <span className="font-medium">{message.linked_issue.title}</span>
          </a>
        )}

        {/* Timestamp on hover for non-author messages */}
        {!showAuthor && (
          <span className="absolute -left-14 top-0 text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
            {new Date(message.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        )}
      </div>
    </div>
  );
}
