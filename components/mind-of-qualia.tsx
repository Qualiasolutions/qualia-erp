'use client';

import * as React from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { Brain, ArrowUp, Loader2, Sparkles } from 'lucide-react';
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
    <div className="card-premium overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Brain className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground">Mind of Qualia</h3>
            <p className="text-xs text-muted-foreground">Your AI assistant</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button onClick={handleClear} className="btn-ghost text-xs">
            Clear
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div className="h-[200px] overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/5">
              <Sparkles className="h-6 w-6 text-primary/40" />
            </div>
            <p className="mb-1 text-sm font-medium text-foreground">How can I help?</p>
            <p className="mb-4 text-xs text-muted-foreground">
              I know everything about Qualia and can help with any task.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSuggestion(suggestion)}
                  className="rounded-full border border-border/50 bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground transition-all duration-200 hover:border-primary/30 hover:bg-primary/5 hover:text-foreground"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  'flex gap-2',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-[85%] rounded-xl px-3 py-2 text-sm',
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
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="border-t border-border/50 p-3">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask me anything..."
            disabled={isLoading}
            className="input-premium h-10 flex-1"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="btn-primary flex h-10 w-10 items-center justify-center rounded-xl disabled:opacity-50"
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
