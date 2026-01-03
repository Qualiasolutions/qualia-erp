'use client';

import * as React from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { Brain, ArrowUp, Loader2, Sparkles, X, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const SUGGESTIONS = [
  { text: 'What are my overdue tasks?', icon: '📋' },
  { text: 'Create a new task', icon: '✨' },
  { text: 'Show project status', icon: '📊' },
  { text: "What's on my schedule?", icon: '📅' },
];

export function MindOfQualia() {
  const [inputValue, setInputValue] = React.useState('');
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // AI Chat integration
  const { messages, status, sendMessage, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  // Scroll to bottom when messages update
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Get text content from message parts
  const getMessageContent = React.useCallback((message: (typeof messages)[0]) => {
    if (!message.parts) return '';
    return message.parts
      .filter((part) => part.type === 'text')
      .map((part) => (part as { type: 'text'; text: string }).text)
      .join('');
  }, []);

  // Handle message submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      sendMessage({ text: inputValue });
      setInputValue('');
    }
  };

  // Handle suggestion click
  const handleSuggestion = (suggestion: string) => {
    sendMessage({ text: suggestion });
  };

  // Clear chat
  const handleClear = () => {
    setMessages([]);
  };

  return (
    <div className="group/card relative overflow-hidden rounded-2xl border border-border/50 bg-card/80 backdrop-blur-xl transition-all duration-300 hover:border-primary/30 hover:shadow-card-hover">
      {/* Gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/[0.02] to-transparent opacity-0 transition-opacity duration-300 group-hover/card:opacity-100" />

      {/* Header */}
      <div className="relative flex items-center justify-between border-b border-border/40 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/20">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            {/* Pulse indicator */}
            <div className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500 ring-2 ring-card" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Mind of Qualia</h3>
            <p className="text-xs text-muted-foreground">Powered by AI</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleClear}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-all duration-200 hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div className="relative h-[220px] overflow-y-auto p-5">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 ring-1 ring-primary/10">
              <Sparkles className="h-7 w-7 text-primary/60" />
            </div>
            <p className="mb-1.5 text-base font-medium text-foreground">How can I help?</p>
            <p className="mb-5 max-w-[280px] text-sm text-muted-foreground">
              Ask me anything about your projects, tasks, or schedule.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion.text}
                  onClick={() => handleSuggestion(suggestion.text)}
                  className="flex items-center gap-2 rounded-xl border border-border/40 bg-muted/20 px-3 py-2.5 text-left text-xs font-medium text-muted-foreground transition-all duration-200 hover:border-primary/30 hover:bg-primary/5 hover:text-foreground"
                >
                  <span>{suggestion.icon}</span>
                  <span className="line-clamp-1">{suggestion.text}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  'flex animate-fade-in gap-3',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'assistant' && (
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Brain className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/40 text-foreground'
                  )}
                >
                  <p className="whitespace-pre-wrap">{getMessageContent(message)}</p>
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex animate-fade-in justify-start gap-3">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Brain className="h-4 w-4 text-primary" />
                </div>
                <div className="flex items-center gap-2 rounded-2xl bg-muted/40 px-4 py-2.5 text-sm text-muted-foreground">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-primary/60 [animation-delay:-0.3s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-primary/60 [animation-delay:-0.15s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-primary/60" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="relative border-t border-border/40 p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <MessageCircle className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask me anything..."
              disabled={isLoading}
              className="h-11 w-full rounded-xl border border-border/50 bg-muted/30 pl-10 pr-4 text-sm text-foreground transition-all duration-200 placeholder:text-muted-foreground/50 focus:border-primary/30 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary/90 hover:shadow-glow-sm disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowUp className="h-4 w-4" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
