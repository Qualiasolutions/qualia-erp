'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import {
  Send,
  Bot,
  User,
  Sparkles,
  Trash2,
  ListTodo,
  Calendar,
  FolderKanban,
  Zap,
  MessageCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAIAssistant } from '@/components/ai-assistant';
import { motion, AnimatePresence } from 'framer-motion';

// Quick actions with icons and colors
const quickActions = [
  { text: 'Show my tasks', icon: ListTodo, color: 'text-amber-500' },
  { text: 'Create a task', icon: Zap, color: 'text-emerald-500' },
  { text: 'Project status', icon: FolderKanban, color: 'text-blue-500' },
  { text: 'Schedule meeting', icon: Calendar, color: 'text-purple-500' },
];

// Fun greetings for the AI
const greetings = [
  "What's on your mind?",
  'How can I help?',
  'Ready when you are',
  "Let's get things done",
  'Ask me anything',
];

// Fun placeholders
const placeholders = [
  'Ask me anything...',
  'What do you need?',
  'Type a message...',
  "I'm all ears...",
  'How can I help?',
];

// Typing indicator dots
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-primary"
          animate={{
            y: [0, -4, 0],
            opacity: [0.4, 1, 0.4],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

export function DashboardAIChat() {
  const { messages, isStreaming, sendMessage, clearConversation } = useAIAssistant();

  const [input, setInput] = useState('');
  const [greeting] = useState(() => greetings[Math.floor(Math.random() * greetings.length)]);
  const [placeholder] = useState(
    () => placeholders[Math.floor(Math.random() * placeholders.length)]
  );
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
  };

  const handleQuickAction = useCallback(
    (action: string) => {
      sendMessage(action);
    },
    [sendMessage]
  );

  const handleClear = useCallback(() => {
    clearConversation();
  }, [clearConversation]);

  const hasMessages = messages.length > 0;

  return (
    <div className="widget relative flex flex-col overflow-hidden">
      {/* Subtle gradient background */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-primary/[0.03]" />

      {/* Header */}
      <div className="relative flex items-center justify-between border-b border-border/50 bg-gradient-to-r from-card via-card to-primary/[0.02] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/10">
              <Bot className="h-4.5 w-4.5 text-primary" />
            </div>
            {/* Online indicator */}
            <motion.div
              className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-card"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Qualia AI</h3>
            <p className="text-[11px] text-muted-foreground">
              {isStreaming ? (
                <span className="flex items-center gap-1.5">
                  <span className="h-1 w-1 animate-pulse rounded-full bg-primary" />
                  Thinking...
                </span>
              ) : (
                'Online & ready'
              )}
            </p>
          </div>
        </div>
        {hasMessages && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={handleClear}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </motion.button>
        )}
      </div>

      {/* Content Area */}
      <div className="relative flex min-h-0 flex-1 flex-col">
        <AnimatePresence mode="wait">
          {!hasMessages ? (
            // Empty state with personality
            <motion.div
              key="empty-state"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="flex flex-1 flex-col p-4"
            >
              {/* Greeting section */}
              <div className="mb-4 flex flex-col items-center">
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                  className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/20"
                >
                  <Sparkles className="h-6 w-6 text-primary" />
                </motion.div>
                <p className="text-center text-sm font-medium text-foreground">{greeting}</p>
                <p className="mt-1 text-center text-xs text-muted-foreground">
                  I can help with tasks, projects & more
                </p>
              </div>

              {/* Quick actions grid */}
              <div className="grid grid-cols-2 gap-2">
                {quickActions.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <motion.button
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleQuickAction(action.text)}
                      className={cn(
                        'group flex items-center gap-2 rounded-xl border border-border/50 bg-card/80 px-3 py-2.5 text-left transition-all',
                        'hover:border-primary/30 hover:bg-primary/[0.03] hover:shadow-sm'
                      )}
                    >
                      <div
                        className={cn(
                          'flex h-7 w-7 items-center justify-center rounded-lg bg-muted/50 transition-colors',
                          'group-hover:bg-primary/10'
                        )}
                      >
                        <Icon className={cn('h-3.5 w-3.5', action.color)} />
                      </div>
                      <span className="text-xs font-medium text-foreground">{action.text}</span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            // Chat messages
            <motion.div
              key="chat-messages"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3"
            >
              <div className="space-y-3">
                {messages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.2, delay: index === messages.length - 1 ? 0 : 0 }}
                    className={cn(
                      'flex gap-2.5',
                      message.role === 'user' ? 'flex-row-reverse' : ''
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                        message.role === 'user'
                          ? 'bg-gradient-to-br from-primary to-primary/80'
                          : 'bg-gradient-to-br from-muted to-muted/80 ring-1 ring-border/50'
                      )}
                    >
                      {message.role === 'user' ? (
                        <User className="h-3.5 w-3.5 text-primary-foreground" />
                      ) : (
                        <MessageCircle className="h-3.5 w-3.5 text-primary" />
                      )}
                    </div>
                    <div
                      className={cn(
                        'max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed',
                        message.role === 'user'
                          ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground'
                          : 'bg-muted/80 text-foreground ring-1 ring-border/30'
                      )}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </motion.div>
                ))}

                {/* Typing indicator */}
                {isStreaming && messages[messages.length - 1]?.role === 'user' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-2.5"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-muted to-muted/80 ring-1 ring-border/50">
                      <MessageCircle className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="flex items-center gap-2 rounded-xl bg-muted/80 px-3 py-2.5 ring-1 ring-border/30">
                      <TypingIndicator />
                    </div>
                  </motion.div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Area */}
        <form
          onSubmit={handleSubmit}
          className="relative border-t border-border/50 bg-gradient-to-r from-card to-card/80 p-3"
        >
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={placeholder}
                disabled={isStreaming}
                className={cn(
                  'h-10 w-full rounded-xl border border-border/60 bg-background/80 px-4 pr-10 text-sm',
                  'placeholder:text-muted-foreground/50',
                  'focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20',
                  'disabled:opacity-50',
                  'transition-all'
                )}
              />
            </div>
            <motion.button
              type="submit"
              disabled={!input.trim() || isStreaming}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-xl',
                'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground',
                'shadow-md shadow-primary/20',
                'hover:shadow-lg hover:shadow-primary/30',
                'disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none',
                'transition-all'
              )}
            >
              <Send className="h-4 w-4" />
            </motion.button>
          </div>

          {/* Keyboard hint */}
          {!hasMessages && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-2 text-center text-[10px] text-muted-foreground/60"
            >
              Press <kbd className="rounded border border-border/50 bg-muted/50 px-1">Enter</kbd> to
              send
            </motion.p>
          )}
        </form>
      </div>
    </div>
  );
}
