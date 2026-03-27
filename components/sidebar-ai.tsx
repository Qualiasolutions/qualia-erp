'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, Mic, MicOff, Send, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { m, AnimatePresence } from '@/lib/lazy-motion';

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
  const [isOpen, setIsOpen] = useState(false);
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

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: SpeechRecognitionType) => {
          const transcript = Array.from(event.results)
            .map((result: SpeechRecognitionType) => result[0].transcript)
            .join('');
          setInput(transcript);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognition.onerror = (event: SpeechRecognitionType) => {
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
        setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          assistantContent += chunk;

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
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  return (
    <>
      {/* Sidebar trigger — compact icon button */}
      <m.button
        onClick={() => setIsOpen(true)}
        className="group flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-purple-500/15 text-primary ring-1 ring-white/[0.06] transition-all duration-200 hover:from-primary/25 hover:to-purple-500/25 hover:ring-primary/30"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title="Ask AI"
      >
        <Sparkles className="h-3.5 w-3.5" />
      </m.button>

      {/* Bottom center popup - no overlay */}
      <AnimatePresence>
        {isOpen && (
          <m.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: 'spring' as const, stiffness: 400, damping: 30 }}
            className="fixed bottom-6 left-1/2 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 sm:w-full"
          >
            <div className="overflow-hidden rounded-2xl border border-border bg-background/95 shadow-2xl shadow-black/20 backdrop-blur-xl dark:shadow-black/40">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-primary/20 to-purple-500/20 ring-1 ring-border/30">
                    <Sparkles className="h-3 w-3 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-foreground/90">AI Assistant</span>
                </div>
                <div className="flex items-center gap-1">
                  {messages.length > 0 && (
                    <button
                      onClick={clearChat}
                      className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground/60 transition-colors hover:bg-muted/50 hover:text-foreground/70"
                    >
                      Clear
                    </button>
                  )}
                  <m.button
                    onClick={() => setIsOpen(false)}
                    className="rounded-md p-1.5 text-muted-foreground/50 transition-colors hover:bg-muted/50 hover:text-foreground/70"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X className="h-4 w-4" />
                  </m.button>
                </div>
              </div>

              {/* Messages */}
              <AnimatePresence mode="popLayout">
                {messages.length > 0 && (
                  <m.div
                    className="scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 max-h-64 overflow-y-auto px-4 py-3"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                  >
                    <div className="space-y-2.5">
                      {messages.map((message) => (
                        <m.div
                          key={message.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ type: 'spring' as const, stiffness: 500, damping: 30 }}
                          className={cn(
                            'rounded-xl px-3 py-2 text-sm leading-relaxed',
                            message.role === 'user'
                              ? 'ml-8 bg-primary/10 text-foreground/90 ring-1 ring-primary/10'
                              : message.isAction
                                ? message.actionType === 'error'
                                  ? 'mr-8 bg-red-500/10 text-red-400/90 ring-1 ring-red-500/20'
                                  : 'mr-8 bg-emerald-500/10 text-emerald-400/90 ring-1 ring-emerald-500/20'
                                : 'mr-8 bg-white/[0.03] text-foreground/80 ring-1 ring-white/[0.06]'
                          )}
                        >
                          {message.isAction && message.actionType === 'success' && (
                            <CheckCircle2 className="mr-1.5 inline-block h-3 w-3" />
                          )}
                          {message.isAction && message.actionType === 'error' && (
                            <AlertCircle className="mr-1.5 inline-block h-3 w-3" />
                          )}
                          <span className="whitespace-pre-wrap break-words">{message.content}</span>
                        </m.div>
                      ))}

                      {/* Loading indicator */}
                      {isLoading && (
                        <m.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="mr-8 flex items-center gap-2 rounded-xl bg-white/[0.03] px-3 py-2.5 ring-1 ring-white/[0.06]"
                        >
                          <div className="flex gap-1">
                            {[0, 1, 2].map((i) => (
                              <m.span
                                key={i}
                                className="h-1.5 w-1.5 rounded-full bg-primary/60"
                                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                                transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground/50">Thinking...</span>
                        </m.div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </m.div>
                )}
              </AnimatePresence>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <m.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mx-4 mb-2 overflow-hidden rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400/80 ring-1 ring-red-500/20"
                  >
                    {error}
                  </m.div>
                )}
              </AnimatePresence>

              {/* Input */}
              <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3">
                <m.button
                  type="button"
                  onClick={toggleListening}
                  disabled={isLoading}
                  className={cn(
                    'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-200',
                    isListening
                      ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30'
                      : 'bg-white/[0.03] text-muted-foreground/50 ring-1 ring-white/[0.08] hover:bg-white/[0.06] hover:text-foreground/70'
                  )}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {isListening && (
                    <m.div
                      className="absolute inset-0 rounded-xl bg-red-500/20"
                      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  )}
                  {isListening ? (
                    <MicOff className="relative h-4 w-4" />
                  ) : (
                    <Mic className="relative h-4 w-4" />
                  )}
                </m.button>

                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isListening ? 'Listening...' : 'Ask anything...'}
                  disabled={isLoading}
                  className="h-10 flex-1 rounded-xl border-0 bg-white/[0.03] px-4 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-50"
                />

                <m.button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-200',
                    input.trim() && !isLoading
                      ? 'bg-primary/20 text-primary ring-1 ring-primary/30 hover:bg-primary/30'
                      : 'bg-white/[0.03] text-muted-foreground/30 ring-1 ring-white/[0.06]'
                  )}
                  whileHover={input.trim() && !isLoading ? { scale: 1.05 } : {}}
                  whileTap={input.trim() && !isLoading ? { scale: 0.95 } : {}}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </m.button>
              </form>

              {/* Hint when empty */}
              {messages.length === 0 && (
                <div className="border-t border-border px-4 py-2.5">
                  <p className="text-xs text-muted-foreground/40">
                    Create tasks, schedule meetings, search projects...
                  </p>
                </div>
              )}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
}
