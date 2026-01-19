'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Send, Mic, MicOff, Volume2, VolumeX, X, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAIAssistant } from '@/components/ai-assistant';
import { motion, AnimatePresence } from 'framer-motion';

// Web Speech API types
type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
};

export function DashboardAIChat() {
  const { messages, isStreaming, sendMessage, clearConversation } = useAIAssistant();

  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isFocused, setIsFocused] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Speak the last assistant message when complete
  useEffect(() => {
    if (!voiceEnabled || !messages?.length || isStreaming) return;
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === 'assistant') {
      speakText(lastMessage.content);
    }
  }, [messages, isStreaming, voiceEnabled]);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    const SpeechRecognitionAPI = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (SpeechRecognitionAPI) {
      const recognition = new SpeechRecognitionAPI() as SpeechRecognitionInstance;
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0].transcript)
          .join('');
        setInput(transcript);

        if (event.results[0].isFinal) {
          setIsListening(false);
          if (transcript.trim()) {
            sendMessage(transcript.trim());
            setInput('');
          }
        }
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  }, [sendMessage]);

  const speakText = useCallback((text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.slice(0, 500));
    utterance.rate = 1.05;
    utterance.pitch = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      stopSpeaking();
      setInput('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, [isListening, stopSpeaking]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    stopSpeaking();
    const text = input.trim();
    setInput('');
    await sendMessage(text);
  };

  const hasMessages = (messages?.length || 0) > 0;

  // Status text
  const getStatusText = () => {
    if (isStreaming) return 'Thinking...';
    if (isSpeaking) return 'Speaking...';
    if (isListening) return 'Listening...';
    return 'Ask me anything';
  };

  return (
    <div
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-xl',
        'border bg-card',
        'transition-all duration-300',
        isFocused ? 'border-primary/50' : 'border-border'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <MessageSquare className="h-4 w-4 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-foreground">Qualia AI</span>
            <span className="text-[11px] text-muted-foreground">{getStatusText()}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          {isSpeaking && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              onClick={stopSpeaking}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title="Stop speaking"
            >
              <VolumeX className="h-3.5 w-3.5" />
            </motion.button>
          )}
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-lg transition-all',
              voiceEnabled
                ? 'text-primary hover:bg-primary/10'
                : 'text-muted-foreground/50 hover:bg-muted hover:text-muted-foreground'
            )}
            title={voiceEnabled ? 'Mute voice' : 'Enable voice'}
          >
            {voiceEnabled ? (
              <Volume2 className="h-3.5 w-3.5" />
            ) : (
              <VolumeX className="h-3.5 w-3.5" />
            )}
          </button>
          {hasMessages && (
            <button
              onClick={clearConversation}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
              title="Clear chat"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex min-h-0 flex-1 flex-col">
        <AnimatePresence mode="wait">
          {!hasMessages ? (
            // Empty state - simple message
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-1 flex-col items-center justify-center p-4"
            >
              <p className="text-center text-sm text-muted-foreground">
                Ask me about your tasks, projects, or meetings
              </p>
            </motion.div>
          ) : (
            // Messages
            <motion.div
              key="messages"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 overflow-y-auto p-3"
            >
              <div className="space-y-3">
                {(messages || []).map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className={cn(
                      'flex',
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[85%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed',
                        message.role === 'user'
                          ? 'rounded-br-md bg-primary text-primary-foreground'
                          : 'rounded-bl-md border border-border bg-muted text-foreground'
                      )}
                    >
                      {message.content}
                    </div>
                  </motion.div>
                ))}

                {/* Typing indicator */}
                {isStreaming &&
                  messages?.length > 0 &&
                  messages[messages.length - 1]?.role === 'user' && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex"
                    >
                      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-border bg-muted/50 px-4 py-2.5">
                        <motion.span
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                          className="h-1.5 w-1.5 rounded-full bg-primary/60"
                        />
                        <motion.span
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                          className="h-1.5 w-1.5 rounded-full bg-primary/60"
                        />
                        <motion.span
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                          className="h-1.5 w-1.5 rounded-full bg-primary/60"
                        />
                      </div>
                    </motion.div>
                  )}

                <div ref={messagesEndRef} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input */}
        <form onSubmit={handleSubmit} className="border-t border-border p-3">
          <div
            className={cn(
              'flex items-center gap-2 rounded-lg border bg-background px-2 transition-all duration-200',
              isFocused ? 'border-primary' : 'border-border'
            )}
          >
            {/* Voice button */}
            <button
              type="button"
              onClick={toggleListening}
              disabled={!recognitionRef.current}
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors',
                isListening
                  ? 'bg-rose-500 text-white'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                !recognitionRef.current && 'cursor-not-allowed opacity-40'
              )}
              title={isListening ? 'Stop listening' : 'Voice input'}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>

            {/* Input field */}
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={isListening ? 'Listening...' : 'Ask anything...'}
              disabled={isStreaming || isListening}
              className={cn(
                'h-10 flex-1 bg-transparent text-sm outline-none',
                'placeholder:text-muted-foreground/50',
                'disabled:cursor-not-allowed disabled:opacity-50'
              )}
            />

            {/* Send button */}
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors',
                input.trim()
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'text-muted-foreground/40',
                'disabled:cursor-not-allowed'
              )}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
