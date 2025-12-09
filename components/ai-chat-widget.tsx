'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import Image from 'next/image';
import { X, Send, User, Minimize2, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const QUICK_ACTIONS = [
  { label: 'Create a task', query: 'Create a task for ' },
  { label: 'Show my projects', query: 'Show me all my projects' },
  { label: 'Add a client', query: 'Add a new client named ' },
  { label: 'Schedule meeting', query: 'Schedule a meeting for ' },
];

export function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [lastAIResponse, setLastAIResponse] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { messages, status, sendMessage, error } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getMessageContent = useCallback((message: (typeof messages)[0]) => {
    if (!message.parts) return '';
    return message.parts
      .filter((part) => part.type === 'text')
      .map((part) => (part as { type: 'text'; text: string }).text)
      .join('');
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  // Track last AI response
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'assistant' && status === 'ready') {
      const content = getMessageContent(lastMessage);
      if (content && content !== lastAIResponse) {
        setLastAIResponse(content);
      }
    }
  }, [messages, status, lastAIResponse, getMessageContent]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      sendMessage({ text: input });
      setInput('');
    }
  };

  const handleQuickAction = (query: string) => {
    setInput(query);
    inputRef.current?.focus();
  };

  // Keyboard shortcut to open widget
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + J to toggle AI chat
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Listen for openAIChat event from dashboard input
  useEffect(() => {
    const handleOpenAIChat = (e: CustomEvent<{ query: string }>) => {
      setIsOpen(true);
      if (e.detail.query) {
        // Send the query directly
        sendMessage({ text: e.detail.query });
      }
    };

    window.addEventListener('openAIChat', handleOpenAIChat as EventListener);
    return () => window.removeEventListener('openAIChat', handleOpenAIChat as EventListener);
  }, [sendMessage]);

  return (
    <>
      {/* Floating Button - Qualia Logo */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card shadow-lg transition-all duration-300 hover:scale-105 hover:border-primary/50 hover:shadow-xl',
          isOpen && 'scale-0 opacity-0'
        )}
        title="Talk to Qualia (⌘J)"
      >
        <Image src="/logo.webp" alt="Qualia" width={32} height={32} className="rounded-lg" />
      </button>

      {/* Chat Widget */}
      <div
        className={cn(
          'fixed z-50 flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl transition-all duration-300',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
          isExpanded
            ? 'bottom-4 left-4 right-4 top-4 md:bottom-6 md:left-auto md:right-6 md:top-6 md:h-auto md:w-[480px]'
            : 'bottom-6 right-6 h-[520px] w-[400px]'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
          <div className="flex items-center gap-3">
            <Image src="/logo.webp" alt="Qualia" width={36} height={36} className="rounded-xl" />
            <div>
              <h3 className="text-sm font-semibold text-foreground">Qualia</h3>
              <p className="text-xs text-muted-foreground">Knowledge Base</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              title={isExpanded ? 'Minimize' : 'Expand'}
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              title="Close (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="mt-8 text-center">
              <Image
                src="/logo.webp"
                alt="Qualia"
                width={56}
                height={56}
                className="mx-auto mb-4 rounded-2xl"
              />
              <p className="mb-1 text-base font-semibold text-foreground">Hi, I&apos;m Qualia</p>
              <p className="mx-auto mb-6 max-w-[280px] text-sm text-muted-foreground">
                Your intelligent assistant. I can help manage projects, clients, tasks, and more.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => handleQuickAction(action.query)}
                    className="rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-xs font-medium text-foreground transition-all hover:border-primary/30 hover:bg-secondary"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3">
              <p className="text-xs text-red-600 dark:text-red-400">Error: {error.message}</p>
            </div>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={cn('flex gap-3', m.role === 'user' ? 'flex-row-reverse' : '')}
            >
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl',
                  m.role === 'user' ? 'bg-primary' : 'bg-transparent'
                )}
              >
                {m.role === 'user' ? (
                  <User className="h-4 w-4 text-primary-foreground" />
                ) : (
                  <Image
                    src="/logo.webp"
                    alt="Qualia"
                    width={32}
                    height={32}
                    className="rounded-lg"
                  />
                )}
              </div>
              <div
                className={cn(
                  'max-w-[85%] rounded-xl px-4 py-2.5 text-sm',
                  m.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-foreground'
                )}
              >
                <div className="whitespace-pre-wrap leading-relaxed">{getMessageContent(m)}</div>
              </div>
            </div>
          ))}

          {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center">
                <Image
                  src="/logo.webp"
                  alt="Qualia"
                  width={32}
                  height={32}
                  className="animate-pulse rounded-lg"
                />
              </div>
              <div className="rounded-xl bg-secondary px-4 py-2.5 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary"
                      style={{ animationDelay: '0ms' }}
                    />
                    <span
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary"
                      style={{ animationDelay: '150ms' }}
                    />
                    <span
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary"
                      style={{ animationDelay: '300ms' }}
                    />
                  </div>
                  <span className="text-xs">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="border-t border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <input
              ref={inputRef}
              className="flex-1 rounded-xl bg-secondary px-4 py-3 text-sm text-foreground placeholder-muted-foreground transition-all focus:outline-none focus:ring-2 focus:ring-primary/50"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Qualia anything..."
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Backdrop for mobile expanded view */}
      {isOpen && isExpanded && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </>
  );
}
