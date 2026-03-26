'use client';

import { useRef, useEffect, useState } from 'react';
import {
  Send,
  X,
  Bot,
  ListTodo,
  FolderKanban,
  Users,
  Calendar,
  GitBranch,
  Rocket,
  Database,
  Brain,
  Receipt,
  BarChart3,
} from 'lucide-react';
import { useAIAssistant } from '@/components/ai-assistant';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const AI_CAPABILITIES = [
  { icon: BarChart3, label: 'Daily briefing', prompt: 'Give me my daily briefing' },
  { icon: ListTodo, label: 'My tasks', prompt: 'What are my tasks?' },
  { icon: Calendar, label: 'Upcoming meetings', prompt: 'What meetings do I have coming up?' },
  { icon: FolderKanban, label: 'Project status', prompt: 'Show me active project statuses' },
  { icon: Users, label: 'Team workload', prompt: 'Show team members and their workload' },
  { icon: Receipt, label: 'Log a payment', prompt: 'I need to log a payment' },
  { icon: Brain, label: 'Remember something', prompt: 'Remember that ' },
  { icon: GitBranch, label: 'GitHub PRs', prompt: 'Show open pull requests' },
  { icon: Rocket, label: 'Deployments', prompt: 'Show latest Vercel deployments' },
  { icon: Database, label: 'DB tables', prompt: 'List database tables for a project' },
] as const;

export function DashboardAIChat() {
  const { messages, isStreaming, sendMessage, clearConversation } = useAIAssistant();

  const [input, setInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    const text = input.trim();
    setInput('');
    await sendMessage(text);
    inputRef.current?.focus();
  };

  const hasMessages = (messages?.length || 0) > 0;

  const getStatusText = () => {
    if (isStreaming) return 'Thinking...';
    return 'Ask anything';
  };

  return (
    <div
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-xl transition-all duration-200 ease-premium',
        'border border-border bg-card shadow-elevation-1',
        isFocused ? 'border-primary/30 shadow-glow-sm' : 'hover:border-border'
      )}
    >
      {/* Header */}
      <div className="relative flex items-center justify-between border-b border-border bg-muted/20 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="bg-primary/8 flex h-7 w-7 items-center justify-center rounded-lg text-primary">
              <Bot className="h-3.5 w-3.5" />
            </div>
            {isStreaming && (
              <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex h-3 w-3 rounded-full bg-primary"></span>
              </span>
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-medium text-foreground">Assistant</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                {getStatusText()}
              </span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={clearConversation}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
            title="Clear chat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="relative flex min-h-0 flex-1 flex-col">
        {/* Messages */}
        <div className="scrollbar-none flex-1 overflow-y-auto px-4 py-4">
          <AnimatePresence mode="popLayout" initial={false}>
            {!hasMessages ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex h-full flex-col justify-center gap-4 px-1"
              >
                <p className="text-center text-xs font-medium text-muted-foreground/60">
                  Try asking
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {AI_CAPABILITIES.map((cap, i) => (
                    <motion.button
                      key={cap.prompt}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03, duration: 0.25 }}
                      onClick={() => {
                        setInput('');
                        sendMessage(cap.prompt);
                      }}
                      className="group flex items-center gap-1.5 rounded-lg border border-border bg-background/60 px-2.5 py-1.5 text-left transition-all duration-200 ease-premium hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5 hover:shadow-sm"
                    >
                      <cap.icon className="h-3 w-3 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-primary" />
                      <span className="text-[11px] font-medium text-muted-foreground/70 transition-colors group-hover:text-foreground">
                        {cap.label}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <div className="space-y-4">
                {(messages || []).map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className={cn(
                      'flex w-full',
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[85%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed shadow-sm',
                        message.role === 'user'
                          ? 'rounded-tr-sm bg-primary text-primary-foreground'
                          : 'rounded-tl-sm border border-border bg-card/80 text-foreground'
                      )}
                    >
                      {message.content}
                    </div>
                  </motion.div>
                ))}

                {/* Thinking indicator */}
                {isStreaming && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3 px-2"
                  >
                    <div className="flex h-8 items-center gap-1.5 rounded-full border border-primary/10 bg-primary/5 px-3 py-1.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <motion.div
                          key={i}
                          animate={{
                            height: [4, 8, 4],
                            opacity: [0.5, 1, 0.5],
                          }}
                          transition={{
                            duration: 0.6,
                            repeat: Infinity,
                            delay: i * 0.1,
                          }}
                          className="w-1.5 rounded-full bg-muted-foreground/30"
                        />
                      ))}
                      <span className="ml-1 text-[11px] font-bold uppercase tracking-wider text-primary/60">
                        THINKING
                      </span>
                    </div>
                  </motion.div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Input Area */}
        <div className="relative mt-auto border-t border-border p-3">
          <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
            <div
              className={cn(
                'flex flex-1 items-center gap-2 rounded-xl border border-border bg-background/60 px-3 transition-all duration-200 ease-premium',
                isFocused ? 'border-primary/40 bg-background shadow-glow-sm' : 'hover:border-border'
              )}
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="Message assistant..."
                disabled={isStreaming}
                className={cn(
                  'h-11 flex-1 bg-transparent text-sm font-medium outline-none',
                  'placeholder:text-muted-foreground/50',
                  'disabled:cursor-not-allowed disabled:opacity-50'
                )}
              />

              <button
                type="submit"
                disabled={!input.trim() || isStreaming}
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all',
                  input.trim()
                    ? 'scale-110 bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                    : 'text-muted-foreground/30'
                )}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
