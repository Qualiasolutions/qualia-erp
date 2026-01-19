'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Send, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
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

// Conversational suggestions - natural questions
const suggestions = [
  "What's on my plate today?",
  'Create a quick task',
  'How are projects going?',
  'Any meetings coming up?',
];

export function DashboardAIChat() {
  const { messages, isStreaming, sendMessage, clearConversation } = useAIAssistant();

  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Speak the last assistant message when it's complete
  useEffect(() => {
    if (!voiceEnabled || !messages.length || isStreaming) return;

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
    const utterance = new SpeechSynthesisUtterance(text.slice(0, 500)); // Limit length
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

  const handleSuggestion = useCallback(
    (text: string) => {
      stopSpeaking();
      sendMessage(text);
    },
    [sendMessage, stopSpeaking]
  );

  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border/40 bg-card/50">
      {/* Minimal header - thin bar */}
      <div className="flex h-8 items-center justify-between border-b border-border/30 px-3">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'h-1.5 w-1.5 rounded-full transition-colors',
              isStreaming
                ? 'animate-pulse bg-amber-500'
                : isSpeaking
                  ? 'bg-emerald-500'
                  : isListening
                    ? 'bg-red-500'
                    : 'bg-primary/40'
            )}
          />
          <span className="text-[11px] text-muted-foreground">
            {isStreaming
              ? 'Thinking...'
              : isSpeaking
                ? 'Speaking...'
                : isListening
                  ? 'Listening...'
                  : 'Ask me anything'}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          {isSpeaking && (
            <button
              onClick={stopSpeaking}
              className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Stop speaking"
            >
              <VolumeX className="h-3 w-3" />
            </button>
          )}
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded transition-colors',
              voiceEnabled ? 'text-primary' : 'text-muted-foreground/50'
            )}
            title={voiceEnabled ? 'Mute voice' : 'Enable voice'}
          >
            {voiceEnabled ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
          </button>
          {hasMessages && (
            <button
              onClick={clearConversation}
              className="ml-1 px-1.5 text-[10px] text-muted-foreground/60 hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex min-h-0 flex-1 flex-col">
        <AnimatePresence mode="wait">
          {!hasMessages ? (
            // Empty - conversational prompt
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-1 flex-col items-center justify-center p-3"
            >
              <p className="mb-3 text-sm text-foreground">Hey, what do you need?</p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {suggestions.map((text, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => handleSuggestion(text)}
                    className="rounded-full border border-border/50 bg-background/60 px-2.5 py-1 text-[11px] text-muted-foreground transition-all hover:border-primary/30 hover:text-foreground"
                  >
                    {text}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            // Messages - clean bubbles
            <motion.div
              key="messages"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 overflow-y-auto p-2.5"
            >
              <div className="space-y-2">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      'flex',
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[88%] rounded-2xl px-3 py-1.5 text-xs leading-relaxed',
                        message.role === 'user'
                          ? 'rounded-br-md bg-primary text-primary-foreground'
                          : 'rounded-bl-md bg-muted/70 text-foreground'
                      )}
                    >
                      {message.content}
                    </div>
                  </motion.div>
                ))}

                {/* Typing dots */}
                {isStreaming && messages[messages.length - 1]?.role === 'user' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex">
                    <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-muted/70 px-3 py-2">
                      <span className="h-1 w-1 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:0ms]" />
                      <span className="h-1 w-1 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:150ms]" />
                      <span className="h-1 w-1 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:300ms]" />
                    </div>
                  </motion.div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input - minimal */}
        <form onSubmit={handleSubmit} className="border-t border-border/30 p-2">
          <div className="flex items-center gap-1.5">
            {/* Voice button */}
            <button
              type="button"
              onClick={toggleListening}
              disabled={!recognitionRef.current}
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all',
                isListening
                  ? 'bg-red-500 text-white'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                !recognitionRef.current && 'cursor-not-allowed opacity-40'
              )}
              title={isListening ? 'Stop' : 'Speak'}
            >
              {isListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
            </button>

            {/* Input */}
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isListening ? 'Listening...' : 'Type or speak...'}
              disabled={isStreaming || isListening}
              className={cn(
                'h-8 flex-1 rounded-full border-0 bg-muted/40 px-3 text-xs',
                'placeholder:text-muted-foreground/40',
                'focus:bg-muted/60 focus:outline-none',
                'disabled:opacity-50'
              )}
            />

            {/* Send */}
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all',
                input.trim() ? 'bg-primary text-primary-foreground' : 'text-muted-foreground/40',
                'disabled:cursor-not-allowed'
              )}
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
