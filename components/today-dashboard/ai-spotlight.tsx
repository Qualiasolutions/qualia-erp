'use client';

import { useRef, useEffect, useState } from 'react';
import { Command, Send, X, Sparkles } from 'lucide-react';
import { useAIAssistant } from '@/components/ai-assistant';
import { cn } from '@/lib/utils';
import { m, AnimatePresence } from '@/lib/lazy-motion';

export function AISpotlight() {
  const { messages, isStreaming, sendMessage, clearConversation } = useAIAssistant();

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: Cmd/Ctrl + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    const text = input.trim();
    setInput('');
    await sendMessage(text);
  };

  const hasMessages = (messages?.length || 0) > 0;

  return (
    <>
      {/* Floating trigger button */}
      <m.button
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full px-4 py-2.5',
          'bg-foreground text-background shadow-lg',
          'transition-all hover:scale-105 hover:shadow-xl',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Sparkles className="h-4 w-4" />
        <span className="text-sm font-medium">Ask AI</span>
        <kbd className="ml-1 hidden rounded bg-background/20 px-1.5 py-0.5 text-[11px] font-medium sm:inline-block">
          <Command className="mr-0.5 inline h-2.5 w-2.5" />K
        </kbd>
      </m.button>

      {/* Spotlight overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
            />

            {/* Spotlight panel */}
            <m.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="fixed left-1/2 top-[15%] z-50 w-full max-w-2xl -translate-x-1/2"
            >
              <div className="mx-4 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
                {/* Input area */}
                <form onSubmit={handleSubmit} className="relative">
                  <div className="flex items-center border-b border-border px-4">
                    <Sparkles className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask anything about your projects, tasks, or team..."
                      disabled={isStreaming}
                      className="h-14 flex-1 bg-transparent px-3 text-base outline-none placeholder:text-muted-foreground/60"
                    />
                    <div className="flex items-center gap-1">
                      {input.trim() && (
                        <button
                          type="submit"
                          disabled={isStreaming}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="ml-1 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </form>

                {/* Messages area */}
                {hasMessages && (
                  <div className="max-h-[50vh] overflow-y-auto p-4">
                    <div className="space-y-4">
                      {(messages || []).map((message) => (
                        <m.div
                          key={message.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={cn(
                            'flex',
                            message.role === 'user' ? 'justify-end' : 'justify-start'
                          )}
                        >
                          <div
                            className={cn(
                              'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                              message.role === 'user'
                                ? 'bg-foreground text-background'
                                : 'bg-muted text-foreground'
                            )}
                          >
                            {message.content}
                          </div>
                        </m.div>
                      ))}

                      {/* Typing indicator */}
                      {isStreaming && (
                        <m.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex items-center gap-2 text-sm text-muted-foreground"
                        >
                          <div className="flex gap-1">
                            {[0, 1, 2].map((i) => (
                              <m.span
                                key={i}
                                animate={{ opacity: [0.4, 1, 0.4] }}
                                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                                className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
                              />
                            ))}
                          </div>
                          <span className="text-xs">Thinking...</span>
                        </m.div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </div>
                )}

                {/* Footer hints */}
                <div className="flex items-center justify-between border-t border-border px-4 py-2">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>
                      <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                        Enter
                      </kbd>{' '}
                      to send
                    </span>
                    <span>
                      <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                        Esc
                      </kbd>{' '}
                      to close
                    </span>
                  </div>
                  {hasMessages && (
                    <button
                      onClick={clearConversation}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Clear chat
                    </button>
                  )}
                </div>
              </div>
            </m.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
