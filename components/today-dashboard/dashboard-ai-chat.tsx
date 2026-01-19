'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Send, Mic, MicOff, Volume2, VolumeX, Sparkles, X } from 'lucide-react';
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

// Quick actions - conversational prompts
const quickActions = [
  { text: "What's my focus today?", icon: '🎯' },
  { text: 'Project status update', icon: '📊' },
  { text: 'Create a task', icon: '✨' },
  { text: 'Upcoming meetings', icon: '📅' },
];

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

  const handleQuickAction = useCallback(
    (text: string) => {
      stopSpeaking();
      sendMessage(text);
    },
    [sendMessage, stopSpeaking]
  );

  const hasMessages = (messages?.length || 0) > 0;

  // Status for the orb
  const getOrbStatus = () => {
    if (isStreaming) return 'thinking';
    if (isSpeaking) return 'speaking';
    if (isListening) return 'listening';
    return 'idle';
  };

  const orbStatus = getOrbStatus();

  return (
    <div
      className={cn(
        'group/chat relative flex h-full flex-col overflow-hidden rounded-xl',
        'border border-border/40 bg-gradient-to-b from-card/90 to-card/70 backdrop-blur-md',
        'transition-all duration-500',
        isFocused && 'border-primary/30 shadow-[0_0_30px_-10px_hsl(var(--primary)/0.2)]'
      )}
    >
      {/* Ambient glow background */}
      <div
        className={cn(
          'pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700',
          (isStreaming || isSpeaking || isListening) && 'opacity-100'
        )}
      >
        <div
          className={cn(
            'absolute -left-1/4 -top-1/4 h-1/2 w-1/2 rounded-full blur-3xl',
            orbStatus === 'thinking' && 'bg-amber-500/10',
            orbStatus === 'speaking' && 'bg-emerald-500/10',
            orbStatus === 'listening' && 'bg-rose-500/10'
          )}
        />
      </div>

      {/* Header */}
      <div className="relative flex items-center justify-between border-b border-border/30 px-4 py-2.5">
        <div className="flex items-center gap-3">
          {/* Animated Orb */}
          <div className="relative">
            <motion.div
              animate={{
                scale: orbStatus !== 'idle' ? [1, 1.1, 1] : 1,
              }}
              transition={{
                duration: 1.5,
                repeat: orbStatus !== 'idle' ? Infinity : 0,
                ease: 'easeInOut',
              }}
              className="relative flex h-8 w-8 items-center justify-center"
            >
              {/* Outer ring */}
              <div
                className={cn(
                  'absolute inset-0 rounded-full transition-all duration-500',
                  orbStatus === 'idle' && 'bg-gradient-to-br from-primary/20 to-primary/5',
                  orbStatus === 'thinking' &&
                    'animate-spin-slow bg-gradient-conic from-amber-500/40 via-orange-500/20 to-amber-500/40',
                  orbStatus === 'speaking' &&
                    'bg-gradient-to-br from-emerald-500/30 to-teal-500/10',
                  orbStatus === 'listening' &&
                    'animate-pulse bg-gradient-to-br from-rose-500/30 to-pink-500/10'
                )}
              />
              {/* Inner orb */}
              <div
                className={cn(
                  'relative h-5 w-5 rounded-full transition-all duration-500',
                  'shadow-[inset_0_-2px_4px_rgba(0,0,0,0.2)]',
                  orbStatus === 'idle' && 'bg-gradient-to-br from-primary to-primary/80',
                  orbStatus === 'thinking' && 'bg-gradient-to-br from-amber-400 to-orange-500',
                  orbStatus === 'speaking' && 'bg-gradient-to-br from-emerald-400 to-teal-500',
                  orbStatus === 'listening' && 'bg-gradient-to-br from-rose-400 to-pink-500'
                )}
              >
                {/* Highlight */}
                <div className="absolute left-1 top-1 h-2 w-2 rounded-full bg-white/40" />
              </div>
            </motion.div>
          </div>

          {/* Status text */}
          <div className="flex flex-col">
            <span className="text-xs font-medium text-foreground">Qualia AI</span>
            <span className="text-[10px] text-muted-foreground">
              {orbStatus === 'thinking' && 'Processing...'}
              {orbStatus === 'speaking' && 'Speaking...'}
              {orbStatus === 'listening' && 'Listening...'}
              {orbStatus === 'idle' && 'Ready to assist'}
            </span>
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
      <div className="relative flex min-h-0 flex-1 flex-col">
        <AnimatePresence mode="wait">
          {!hasMessages ? (
            // Empty state - Quick actions
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="flex flex-1 flex-col items-center justify-center p-4"
            >
              <Sparkles className="mb-3 h-6 w-6 text-primary/60" />
              <p className="mb-4 text-center text-sm text-muted-foreground">
                How can I help you today?
              </p>
              <div className="grid w-full max-w-[280px] grid-cols-2 gap-2">
                {quickActions.map((action, i) => (
                  <motion.button
                    key={action.text}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => handleQuickAction(action.text)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-xl border border-border/50 bg-muted/30 p-3',
                      'text-xs text-muted-foreground transition-all duration-200',
                      'hover:border-primary/30 hover:bg-primary/5 hover:text-foreground',
                      'active:scale-[0.98]'
                    )}
                  >
                    <span className="text-base">{action.icon}</span>
                    <span className="text-center leading-tight">{action.text}</span>
                  </motion.button>
                ))}
              </div>
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
                          : 'rounded-bl-md border border-border/50 bg-muted/50 text-foreground'
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
                      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-border/50 bg-muted/50 px-4 py-2.5">
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
        <form onSubmit={handleSubmit} className="relative border-t border-border/30 p-3">
          <div
            className={cn(
              'flex items-center gap-2 rounded-xl border bg-muted/30 px-2 transition-all duration-300',
              isFocused
                ? 'border-primary/40 bg-background shadow-[0_0_0_3px_hsl(var(--primary)/0.1)]'
                : 'border-border/50'
            )}
          >
            {/* Voice button */}
            <button
              type="button"
              onClick={toggleListening}
              disabled={!recognitionRef.current}
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all',
                isListening
                  ? 'bg-rose-500 text-white shadow-[0_0_12px_rgba(244,63,94,0.4)]'
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
            <motion.button
              type="submit"
              disabled={!input.trim() || isStreaming}
              whileHover={{ scale: input.trim() ? 1.05 : 1 }}
              whileTap={{ scale: input.trim() ? 0.95 : 1 }}
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all',
                input.trim()
                  ? 'bg-primary text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.3)]'
                  : 'text-muted-foreground/40',
                'disabled:cursor-not-allowed'
              )}
            >
              <Send className="h-4 w-4" />
            </motion.button>
          </div>
        </form>
      </div>
    </div>
  );
}
