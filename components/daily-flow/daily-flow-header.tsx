'use client';

import { memo } from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { RefreshCw, Video, Loader2, Command, Eye, EyeOff, Keyboard } from 'lucide-react';

interface DailyFlowHeaderProps {
  isValidating?: boolean;
  isPending?: boolean;
  focusMode?: boolean;
  onRefresh?: () => void;
  onStartMeeting?: () => void;
  onToggleFocus?: () => void;
  onOpenCommandPalette?: () => void;
  onOpenShortcuts?: () => void;
}

/**
 * Daily Flow Header - Things 3 inspired
 * Clean, minimal with prominent date and quick actions
 */
export const DailyFlowHeader = memo(function DailyFlowHeader({
  isValidating = false,
  isPending = false,
  focusMode = false,
  onRefresh,
  onStartMeeting,
  onToggleFocus,
  onOpenCommandPalette,
  onOpenShortcuts,
}: DailyFlowHeaderProps) {
  const today = new Date();
  const dateString = format(today, 'EEEE, MMMM d');

  return (
    <header className="flex items-center justify-between">
      {/* Left: Date */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Today</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{dateString}</p>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Command palette trigger */}
        <button
          onClick={onOpenCommandPalette}
          className="hidden items-center gap-1.5 rounded-lg border border-border/60 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground dark:border-border sm:flex"
          title="Command Palette (Cmd+K)"
        >
          <Command className="h-3 w-3" />
          <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">K</kbd>
        </button>

        {/* Keyboard shortcuts */}
        <button
          onClick={onOpenShortcuts}
          className="hidden rounded-lg border border-border/60 p-2 text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground dark:border-border sm:flex"
          title="Keyboard Shortcuts (?)"
        >
          <Keyboard className="h-3.5 w-3.5" />
        </button>

        {/* Focus mode toggle */}
        <button
          onClick={onToggleFocus}
          className={cn(
            'rounded-lg border p-2 transition-colors',
            focusMode
              ? 'border-qualia-500/30 bg-qualia-500/10 text-qualia-500'
              : 'border-border/60 text-muted-foreground hover:border-foreground/30 hover:text-foreground dark:border-border'
          )}
          title={focusMode ? 'Exit Focus Mode (F)' : 'Enter Focus Mode (F)'}
        >
          {focusMode ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>

        {/* Refresh */}
        <button
          onClick={onRefresh}
          disabled={isValidating}
          className={cn(
            'rounded-lg border border-border/60 p-2 transition-colors hover:border-foreground/30 hover:text-foreground dark:border-border',
            isValidating ? 'opacity-50' : 'text-muted-foreground'
          )}
          title="Refresh"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isValidating && 'animate-spin')} />
        </button>

        {/* Start meeting */}
        <button
          onClick={onStartMeeting}
          disabled={isPending}
          className="flex items-center gap-2 rounded-lg bg-foreground px-3.5 py-2 text-xs font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Video className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline">New Meeting</span>
        </button>
      </div>
    </header>
  );
});

export default DailyFlowHeader;
