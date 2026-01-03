'use client';

import * as React from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { ArrowUp, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const SUGGESTIONS = [
  'What are my overdue tasks?',
  'Create a new task',
  'Show project status',
  "What's on my schedule?",
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
      <div className="relative flex items-center justify-between border-b border-border/40 px-5 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-foreground">AI Assistant</h3>
          <span className="text-xs text-muted-foreground">by Qualia</span>
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
            <p className="mb-1 text-sm font-medium text-foreground">How can I help?</p>
            <p className="mb-5 text-xs text-muted-foreground">
              Ask about your projects, tasks, or schedule.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSuggestion(suggestion)}
                  className="rounded-lg border border-border/40 bg-muted/20 px-3 py-2 text-left text-xs text-muted-foreground transition-colors duration-200 hover:border-border hover:bg-muted/40 hover:text-foreground"
                >
                  {suggestion}
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
                  'flex animate-fade-in',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50 text-foreground'
                  )}
                >
                  <p className="whitespace-pre-wrap">{getMessageContent(message)}</p>
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex animate-fade-in justify-start">
                <div className="flex items-center gap-1.5 rounded-xl bg-muted/50 px-3.5 py-2.5 text-sm text-muted-foreground">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-foreground/40" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-foreground/40 [animation-delay:0.2s]" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-foreground/40 [animation-delay:0.4s]" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="relative border-t border-border/40 p-4">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask a question..."
            disabled={isLoading}
            className="h-10 flex-1 rounded-lg border border-border/50 bg-muted/30 px-3 text-sm text-foreground transition-colors duration-200 placeholder:text-muted-foreground/50 focus:border-border focus:bg-background focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors duration-200 hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
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
