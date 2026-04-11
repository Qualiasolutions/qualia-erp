'use client';

import { cn } from '@/lib/utils';
import { Lock } from 'lucide-react';

interface MessageBubbleProps {
  content: string;
  contentHtml?: string | null;
  isInternal: boolean;
  senderName: string;
  senderRole: string;
  isOwn: boolean;
  showSender: boolean;
  timestamp: string;
}

export function MessageBubble({
  content,
  isInternal,
  senderName,
  senderRole,
  isOwn,
  showSender,
  timestamp,
}: MessageBubbleProps) {
  const formattedTime = formatTime(timestamp);

  // Internal note styling
  if (isInternal) {
    return (
      <div className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}>
        <div className="max-w-[75%] sm:max-w-[65%]">
          {showSender && (
            <p className="mb-1 px-1 text-xs font-medium text-foreground">
              {senderName}
              <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">
                {formatRoleLabel(senderRole)}
              </span>
            </p>
          )}
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/20 dark:bg-amber-500/10">
            <div className="mb-1 flex items-center gap-1">
              <Lock className="h-3 w-3 text-amber-600 dark:text-amber-400" />
              <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                Internal note
              </span>
            </div>
            <p className="whitespace-pre-wrap text-sm text-foreground">{content}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">{formattedTime}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}>
      <div className="max-w-[75%] sm:max-w-[65%]">
        {showSender && (
          <p className={cn('mb-1 px-1 text-xs font-medium text-foreground', isOwn && 'text-right')}>
            {senderName}
            <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">
              {formatRoleLabel(senderRole)}
            </span>
          </p>
        )}
        <div
          className={cn(
            'p-3',
            isOwn
              ? 'rounded-2xl rounded-br-sm bg-primary/[0.08]'
              : 'rounded-2xl rounded-bl-sm bg-muted/50'
          )}
        >
          <p className="whitespace-pre-wrap text-sm text-foreground">{content}</p>
          <p className={cn('mt-1 text-[10px] text-muted-foreground', isOwn && 'text-right')}>
            {formattedTime}
          </p>
        </div>
      </div>
    </div>
  );
}

function formatTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function formatRoleLabel(role: string): string {
  switch (role) {
    case 'admin':
      return 'Admin';
    case 'manager':
      return 'Manager';
    case 'employee':
      return 'Team';
    case 'client':
      return 'Client';
    default:
      return '';
  }
}
