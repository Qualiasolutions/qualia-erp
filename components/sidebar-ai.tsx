'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, Mic, MicOff, Send, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionType = any;

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isAction?: boolean;
  actionType?: 'success' | 'error' | 'pending';
};

export function SidebarAI() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionType>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
          const transcript = Array.from(event.results)
            .map((result) => result[0].transcript)
            .join('');
          setInput(transcript);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          if (event.error === 'not-allowed') {
            setError('Microphone access denied');
          }
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) {
      setError('Speech recognition not supported');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setError(null);
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, [isListening]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to send message');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      const assistantId = `assistant-${Date.now()}`;

      if (reader) {
        // Add placeholder message
        setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          assistantContent += chunk;

          // Check for action indicators in the response
          const isAction =
            assistantContent.includes('✓') ||
            assistantContent.includes('Created') ||
            assistantContent.includes('Updated') ||
            assistantContent.includes('Deleted');

          setMessages((prev) => {
            const newMessages = [...prev];
            const lastIdx = newMessages.findIndex((m) => m.id === assistantId);
            if (lastIdx !== -1) {
              newMessages[lastIdx] = {
                ...newMessages[lastIdx],
                content: assistantContent,
                isAction,
                actionType: isAction ? 'success' : undefined,
              };
            }
            return newMessages;
          });
        }
      }
    } catch (err) {
      console.error('Chat error:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'Sorry, something went wrong. Please try again.',
          isAction: true,
          actionType: 'error',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
    if (e.key === 'Escape') {
      setIsExpanded(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  // Collapsed state - just the button
  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="group flex w-full items-center gap-3 rounded-xl bg-gradient-to-r from-qualia-500/10 to-purple-500/10 px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:from-qualia-500/20 hover:to-purple-500/20"
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-qualia-500 to-purple-500 shadow-lg shadow-qualia-500/25">
          <Sparkles className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="bg-gradient-to-r from-qualia-500 to-purple-500 bg-clip-text font-semibold text-transparent">
          Ask AI
        </span>
      </button>
    );
  }

  // Expanded state - full chat interface
  return (
    <div className="flex flex-col rounded-xl border border-qualia-500/20 bg-gradient-to-b from-qualia-500/5 to-purple-500/5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-qualia-500/10 px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-qualia-500 to-purple-500">
            <Sparkles className="h-3 w-3 text-white" />
          </div>
          <span className="text-xs font-semibold text-foreground">AI Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title="Clear chat"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={() => setIsExpanded(false)}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Minimize"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      {messages.length > 0 && (
        <div className="scrollbar-thin scrollbar-track-transparent scrollbar-thumb-qualia-500/20 max-h-48 overflow-y-auto p-2">
          <div className="space-y-2">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'rounded-lg px-2.5 py-1.5 text-xs',
                  message.role === 'user'
                    ? 'ml-4 bg-qualia-500/10 text-foreground'
                    : message.isAction
                      ? message.actionType === 'error'
                        ? 'mr-4 border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400'
                        : 'mr-4 border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'mr-4 bg-muted/50 text-foreground'
                )}
              >
                {message.isAction && message.actionType === 'success' && (
                  <CheckCircle2 className="mr-1 inline-block h-3 w-3" />
                )}
                {message.isAction && message.actionType === 'error' && (
                  <AlertCircle className="mr-1 inline-block h-3 w-3" />
                )}
                <span className="whitespace-pre-wrap break-words">{message.content}</span>
              </div>
            ))}
            {isLoading && (
              <div className="mr-4 flex items-center gap-1.5 rounded-lg bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mx-2 mb-2 rounded-md bg-red-500/10 px-2 py-1 text-xs text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex items-center gap-1.5 p-2">
        <button
          type="button"
          onClick={toggleListening}
          disabled={isLoading}
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all',
            isListening
              ? 'bg-red-500 text-white shadow-lg shadow-red-500/25'
              : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
          )}
          title={isListening ? 'Stop listening' : 'Start voice input'}
        >
          {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>

        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isListening ? 'Listening...' : 'Ask anything...'}
          disabled={isLoading}
          className="h-8 flex-1 rounded-lg border-0 bg-muted px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-qualia-500/50 disabled:opacity-50"
        />

        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all',
            input.trim() && !isLoading
              ? 'bg-gradient-to-r from-qualia-500 to-purple-500 text-white shadow-lg shadow-qualia-500/25'
              : 'bg-muted text-muted-foreground'
          )}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>

      {/* Quick actions hint */}
      {messages.length === 0 && (
        <div className="border-t border-qualia-500/10 px-2 py-1.5">
          <p className="text-[10px] text-muted-foreground">
            Try: &ldquo;Create a task...&rdquo;, &ldquo;Schedule meeting...&rdquo;, &ldquo;Show my
            tasks&rdquo;
          </p>
        </div>
      )}
    </div>
  );
}
