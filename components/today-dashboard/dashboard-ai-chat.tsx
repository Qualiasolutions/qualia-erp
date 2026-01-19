'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Send, Bot, User, Sparkles, Loader2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAIAssistant } from '@/components/ai-assistant';
import { motion, AnimatePresence } from 'framer-motion';

const quickActions = ['Show my tasks', 'Create a task', 'Project status', 'Schedule a meeting'];

export function DashboardAIChat() {
  const { messages, isStreaming, sendMessage, clearConversation } = useAIAssistant();

  const [input, setInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Expand when there are messages
  useEffect(() => {
    if (messages.length > 0) {
      setIsExpanded(true);
    }
  }, [messages.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const text = input.trim();
    setInput('');
    setIsExpanded(true);
    await sendMessage(text);
  };

  const handleQuickAction = useCallback(
    (action: string) => {
      setIsExpanded(true);
      sendMessage(action);
    },
    [sendMessage]
  );

  const handleClear = useCallback(() => {
    clearConversation();
    setIsExpanded(false);
  }, [clearConversation]);

  const hasMessages = messages.length > 0;

  return (
    <div className="widget flex flex-col">
      {/* Header */}
      <div className="widget-header">
        <div className="widget-title">
          <div className="widget-icon bg-gradient-to-br from-qualia-500/20 to-qualia-700/20">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Qualia AI</h3>
            <p className="text-xs text-muted-foreground">
              {isStreaming ? 'Thinking...' : 'Ask anything'}
            </p>
          </div>
        </div>
        {hasMessages && (
          <button
            onClick={handleClear}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Trash2 className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>

      {/* Content Area */}
      <div className="flex min-h-0 flex-1 flex-col">
        <AnimatePresence mode="wait">
          {!hasMessages && !isExpanded ? (
            // Collapsed: Quick actions grid
            <motion.div
              key="quick-actions"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-1 flex-col p-3"
            >
              <div className="mb-3 flex items-center justify-center">
                <div className="rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 p-3 ring-1 ring-primary/10">
                  <Sparkles className="h-5 w-5 text-primary/70" />
                </div>
              </div>
              <p className="mb-3 text-center text-xs text-muted-foreground">
                How can I help you today?
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickAction(action)}
                    className={cn(
                      'rounded-lg border border-border/50 bg-card/50 px-2.5 py-2 text-left text-xs transition-all',
                      'hover:border-border hover:bg-muted/50'
                    )}
                  >
                    {action}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            // Expanded: Chat messages
            <motion.div
              key="chat-messages"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3"
            >
              <div className="space-y-3">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn('flex gap-2', message.role === 'user' ? 'flex-row-reverse' : '')}
                  >
                    <div
                      className={cn(
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-md',
                        message.role === 'user' ? 'bg-primary' : 'bg-secondary'
                      )}
                    >
                      {message.role === 'user' ? (
                        <User className="h-3 w-3 text-primary-foreground" />
                      ) : (
                        <Bot className="h-3 w-3 text-primary" />
                      )}
                    </div>
                    <div
                      className={cn(
                        'max-w-[85%] rounded-lg px-2.5 py-1.5 text-xs',
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-foreground'
                      )}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    </div>
                  </motion.div>
                ))}

                {isStreaming && messages[messages.length - 1]?.role === 'user' && (
                  <div className="flex gap-2">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-secondary">
                      <Bot className="h-3 w-3 text-primary" />
                    </div>
                    <div className="rounded-lg bg-secondary px-2.5 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Area */}
        <form onSubmit={handleSubmit} className="border-t border-border bg-background p-2">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything..."
              disabled={isStreaming}
              className={cn(
                'h-8 flex-1 rounded-md border border-border bg-background px-2.5 text-xs',
                'placeholder:text-muted-foreground/60',
                'focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/20',
                'disabled:opacity-50'
              )}
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-md',
                'bg-primary text-primary-foreground',
                'hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50',
                'transition-colors'
              )}
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
