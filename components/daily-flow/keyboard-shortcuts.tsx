'use client';

import { memo, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface KeyboardShortcutsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ShortcutAction {
  onNavigateUp?: () => void;
  onNavigateDown?: () => void;
  onSelect?: () => void;
  onComplete?: () => void;
  onPriorityCycle?: () => void;
  onSnooze?: () => void;
  onToggleFocus?: () => void;
  onOpenCommandPalette?: () => void;
  onOpenShortcuts?: () => void;
  onRefresh?: () => void;
}

const SHORTCUTS = [
  { keys: ['j'], description: 'Navigate to next task' },
  { keys: ['k'], description: 'Navigate to previous task' },
  { keys: ['Enter'], description: 'Open selected task' },
  { keys: ['x', 'c'], description: 'Complete selected task' },
  { keys: ['p'], description: 'Cycle priority (P1 > P2 > P3 > None)' },
  { keys: ['s'], description: 'Snooze task' },
  { keys: ['f'], description: 'Toggle focus mode' },
  { keys: ['\u2318K', 'Ctrl+K'], description: 'Open command palette' },
  { keys: ['r'], description: 'Refresh data' },
  { keys: ['?'], description: 'Show keyboard shortcuts' },
];

/**
 * Keyboard Shortcuts Help Dialog
 */
export const KeyboardShortcutsDialog = memo(function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: KeyboardShortcutsProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-3">
          {SHORTCUTS.map((shortcut, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{shortcut.description}</span>
              <div className="flex items-center gap-1">
                {shortcut.keys.map((key, keyIndex) => (
                  <span key={keyIndex} className="flex items-center gap-1">
                    {keyIndex > 0 && <span className="text-xs text-muted-foreground">or</span>}
                    <kbd className="rounded border border-border bg-muted px-2 py-1 font-mono text-xs">
                      {key}
                    </kbd>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
});

/**
 * Keyboard shortcuts handler hook
 */
export function useKeyboardShortcuts({
  onNavigateUp,
  onNavigateDown,
  onSelect,
  onComplete,
  onPriorityCycle,
  onSnooze,
  onToggleFocus,
  onOpenCommandPalette,
  onOpenShortcuts,
  onRefresh,
}: ShortcutAction) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Command/Ctrl + K for command palette
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        onOpenCommandPalette?.();
        return;
      }

      // Single key shortcuts
      switch (event.key.toLowerCase()) {
        case 'j':
          event.preventDefault();
          onNavigateDown?.();
          break;
        case 'k':
          event.preventDefault();
          onNavigateUp?.();
          break;
        case 'enter':
          event.preventDefault();
          onSelect?.();
          break;
        case 'x':
        case 'c':
          if (!event.metaKey && !event.ctrlKey) {
            event.preventDefault();
            onComplete?.();
          }
          break;
        case 'p':
          event.preventDefault();
          onPriorityCycle?.();
          break;
        case 's':
          if (!event.metaKey && !event.ctrlKey) {
            event.preventDefault();
            onSnooze?.();
          }
          break;
        case 'f':
          event.preventDefault();
          onToggleFocus?.();
          break;
        case 'r':
          event.preventDefault();
          onRefresh?.();
          break;
        case '?':
          event.preventDefault();
          onOpenShortcuts?.();
          break;
      }
    },
    [
      onNavigateUp,
      onNavigateDown,
      onSelect,
      onComplete,
      onPriorityCycle,
      onSnooze,
      onToggleFocus,
      onOpenCommandPalette,
      onOpenShortcuts,
      onRefresh,
    ]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export default KeyboardShortcutsDialog;
