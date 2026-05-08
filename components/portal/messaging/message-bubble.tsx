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
  contentHtml,
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
              <span className="ml-1.5 font-mono text-[10px] font-normal uppercase tracking-[0.06em] text-muted-foreground">
                {formatRoleLabel(senderRole)}
              </span>
            </p>
          )}
          <div className="rounded-2xl border border-amber-500/25 bg-amber-50 px-4 py-3 dark:bg-amber-500/[0.08]">
            <div className="mb-1 flex items-center gap-1.5">
              <Lock className="h-3 w-3 text-amber-600 dark:text-amber-400" />
              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-amber-700 dark:text-amber-400">
                Internal note
              </span>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {renderMarkdown(contentHtml || content)}
            </p>
            <p className="mt-1.5 font-mono text-[10px] tabular-nums text-muted-foreground">
              {formattedTime}
            </p>
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
            <span className="ml-1.5 font-mono text-[10px] font-normal uppercase tracking-[0.06em] text-muted-foreground">
              {formatRoleLabel(senderRole)}
            </span>
          </p>
        )}
        <div
          className={cn(
            'px-4 py-3',
            isOwn
              ? 'rounded-2xl rounded-br-md bg-primary/[0.1] text-foreground'
              : 'rounded-2xl rounded-bl-md border border-border bg-card'
          )}
        >
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {renderMarkdown(contentHtml || content)}
          </p>
          <p
            className={cn(
              'mt-1.5 font-mono text-[10px] tabular-nums text-muted-foreground',
              isOwn && 'text-right'
            )}
          >
            {formattedTime}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Renders simple inline markdown: **bold**, *italic*, [text](url)
 * Builds React elements safely instead of injecting HTML.
 */
function renderMarkdown(text: string): React.ReactNode[] {
  // Process bold, italic, and links via regex replacement
  const parts: React.ReactNode[] = [];
  // Pattern matches: **bold**, *italic*, [text](url)
  const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(\[(.+?)\]\((.+?)\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Add text before this match
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    if (match[1]) {
      // **bold**
      parts.push(
        <strong key={match.index} className="font-semibold">
          {match[2]}
        </strong>
      );
    } else if (match[3]) {
      // *italic*
      parts.push(<em key={match.index}>{match[4]}</em>);
    } else if (match[5]) {
      // [text](url)
      parts.push(
        <a
          key={match.index}
          href={match[7]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-2 hover:text-primary/80"
        >
          {match[6]}
        </a>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
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
    case 'employee':
      return 'Team';
    case 'client':
      return 'Client';
    default:
      return '';
  }
}
