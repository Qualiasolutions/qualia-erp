'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import { useRef, useEffect, useState, useCallback } from 'react';
import { ChatVoice } from '@/components/chat-voice';

export default function Chat() {
  const [input, setInput] = useState('');
  const [lastAIResponse, setLastAIResponse] = useState<string>('');
  const { messages, status, sendMessage, error } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
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

  // Track last AI response for voice synthesis
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'assistant' && status === 'ready') {
      const content = getMessageContent(lastMessage);
      if (content && content !== lastAIResponse) {
        setLastAIResponse(content);
      }
    }
  }, [messages, status, lastAIResponse, getMessageContent]);

  const handleVoiceTranscript = useCallback(
    (text: string) => {
      if (text.trim()) {
        sendMessage({ text });
      }
    },
    [sendMessage]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage({ text: input });
      setInput('');
    }
  };

  const handleQuickAction = (query: string) => {
    sendMessage({ text: query });
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="mt-6 text-center fade-in">
            <div className="mb-3 inline-block rounded-xl bg-primary/10 p-3">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <p className="mb-1 text-sm font-medium text-foreground">How can I help?</p>
            <p className="mb-4 text-xs text-muted-foreground">
              Ask about issues, projects, or teams
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {['Show my issues', 'Project status', 'Recent activity'].map((q) => (
                <button
                  key={q}
                  onClick={() => handleQuickAction(q)}
                  className="rounded-lg bg-secondary px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-secondary/80"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3">
            <p className="text-xs text-red-600 dark:text-red-400">Error: {error.message}</p>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={`slide-in flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                m.role === 'user' ? 'bg-primary' : 'bg-secondary'
              }`}
            >
              {m.role === 'user' ? (
                <User className="h-3.5 w-3.5 text-primary-foreground" />
              ) : (
                <Bot className="h-3.5 w-3.5 text-primary" />
              )}
            </div>
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                m.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-foreground'
              }`}
            >
              <div className="whitespace-pre-wrap leading-relaxed">{getMessageContent(m)}</div>
            </div>
          </div>
        ))}

        {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
          <div className="slide-in flex gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary">
              <Bot className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="rounded-lg bg-secondary px-3 py-2 text-sm text-muted-foreground">
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
      <form onSubmit={handleSubmit} className="border-t border-border p-3">
        <div className="flex items-center gap-2">
          <input
            className="flex-1 rounded-lg bg-secondary px-3 py-2 text-sm text-foreground placeholder-muted-foreground transition-all focus:outline-none focus:ring-2 focus:ring-primary/50"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your projects..."
            disabled={isLoading}
          />
          <ChatVoice
            onTranscript={handleVoiceTranscript}
            responseText={lastAIResponse}
            isProcessing={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="rounded-lg bg-primary p-2 text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
