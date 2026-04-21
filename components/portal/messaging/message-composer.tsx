'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Send, Loader2, Bold, Italic, Link2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { sendMessage } from '@/app/actions/portal-messages';
import { toast } from 'sonner';

interface MessageComposerProps {
  projectId: string;
  userRole: string;
  onMessageSent: () => void;
}

export function MessageComposer({ projectId, userRole, onMessageSent }: MessageComposerProps) {
  const [content, setContent] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSendInternal = userRole === 'admin' || userRole === 'employee';

  // Wrap selected text with markdown markers
  const wrapSelection = useCallback(
    (before: string, after: string) => {
      const el = textareaRef.current;
      if (!el) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const selected = content.substring(start, end);
      const newContent =
        content.substring(0, start) + before + selected + after + content.substring(end);
      setContent(newContent);
      // Restore cursor position after the wrapped text
      requestAnimationFrame(() => {
        el.focus();
        const cursorPos = start + before.length + selected.length + after.length;
        el.setSelectionRange(
          selected.length > 0 ? cursorPos : start + before.length,
          selected.length > 0 ? cursorPos : start + before.length
        );
      });
    },
    [content]
  );

  const handleBold = useCallback(() => wrapSelection('**', '**'), [wrapSelection]);
  const handleItalic = useCallback(() => wrapSelection('*', '*'), [wrapSelection]);
  const handleLink = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = content.substring(start, end);
    if (selected) {
      wrapSelection('[', '](url)');
    } else {
      wrapSelection('[text](', ')');
    }
  }, [content, wrapSelection]);

  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [content, adjustHeight]);

  const handleSend = useCallback(async () => {
    const trimmed = content.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    try {
      const result = await sendMessage({
        projectId,
        content: trimmed,
        isInternal: canSendInternal ? isInternal : false,
      });

      if (!result.success) {
        toast.error(result.error || 'Failed to send message');
        return;
      }

      setContent('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      onMessageSent();
    } catch {
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  }, [content, isSending, projectId, isInternal, canSendInternal, onMessageSent]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
        return;
      }
      // Formatting shortcuts
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'b') {
          e.preventDefault();
          handleBold();
        } else if (e.key === 'i') {
          e.preventDefault();
          handleItalic();
        } else if (e.key === 'k') {
          e.preventDefault();
          handleLink();
        }
      }
    },
    [handleSend, handleBold, handleItalic, handleLink]
  );

  const isEmpty = content.trim().length === 0;

  return (
    <div className="border-t border-border bg-card p-3">
      <div className="flex flex-col gap-2">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={isSending}
          rows={1}
          className={cn(
            'w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5',
            'text-sm text-foreground placeholder:text-muted-foreground',
            'focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/30',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'max-h-[120px] min-h-[44px]'
          )}
          aria-label="Message"
          aria-keyshortcuts="Enter"
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={handleBold}
                className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
                title="Bold (Ctrl+B)"
                aria-label="Bold"
              >
                <Bold className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleItalic}
                className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
                title="Italic (Ctrl+I)"
                aria-label="Italic"
              >
                <Italic className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleLink}
                className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
                title="Link (Ctrl+K)"
                aria-label="Insert link"
              >
                <Link2 className="h-3.5 w-3.5" />
              </button>
            </div>
            {canSendInternal && (
              <div className="flex items-center gap-2">
                <Switch
                  id="internal-toggle"
                  checked={isInternal}
                  onCheckedChange={setIsInternal}
                  aria-label="Send as internal note"
                />
                <label
                  htmlFor="internal-toggle"
                  className={cn(
                    'cursor-pointer text-xs transition-colors duration-150',
                    isInternal
                      ? 'font-medium text-amber-600 dark:text-amber-400'
                      : 'text-muted-foreground'
                  )}
                >
                  Internal note
                </label>
              </div>
            )}
            <p className="hidden text-[10px] text-muted-foreground sm:block">
              Enter to send, Shift+Enter for new line
            </p>
          </div>
          <button
            onClick={handleSend}
            disabled={isEmpty || isSending}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-150',
              'focus:outline-none focus:ring-2 focus:ring-primary/30',
              isEmpty || isSending
                ? 'cursor-not-allowed bg-muted text-muted-foreground opacity-50'
                : 'cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95'
            )}
            aria-label="Send message"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
