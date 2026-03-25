'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Send,
  X,
  Bot,
  VolumeX,
  Loader2,
  ListTodo,
  FolderKanban,
  Users,
  Calendar,
  GitBranch,
  Rocket,
  Database,
  Brain,
  Receipt,
  BarChart3,
} from 'lucide-react';
import { useAIAssistant } from '@/components/ai-assistant';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import Vapi from '@vapi-ai/web';

// VAPI Constants from user request
const VAPI_ASSISTANT_ID = '67d7928b-e292-4f70-bca6-339f0b9eae50';
const VAPI_PUBLIC_KEY = '58d3e7c2-5eb3-47dd-a304-5b6a55447ecc';

const AI_CAPABILITIES = [
  { icon: BarChart3, label: 'Daily briefing', prompt: 'Give me my daily briefing' },
  { icon: ListTodo, label: 'My tasks', prompt: 'What are my tasks?' },
  { icon: Calendar, label: 'Upcoming meetings', prompt: 'What meetings do I have coming up?' },
  { icon: FolderKanban, label: 'Project status', prompt: 'Show me active project statuses' },
  { icon: Users, label: 'Team workload', prompt: 'Show team members and their workload' },
  { icon: Receipt, label: 'Log a payment', prompt: 'I need to log a payment' },
  { icon: Brain, label: 'Remember something', prompt: 'Remember that ' },
  { icon: GitBranch, label: 'GitHub PRs', prompt: 'Show open pull requests' },
  { icon: Rocket, label: 'Deployments', prompt: 'Show latest Vercel deployments' },
  { icon: Database, label: 'DB tables', prompt: 'List database tables for a project' },
] as const;

export function DashboardAIChat() {
  const { messages, isStreaming, sendMessage, clearConversation } = useAIAssistant();

  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [vapiCallState, setVapiCallState] = useState<'idle' | 'connecting' | 'connected'>('idle');
  const [volumeLevel, setVolumeLevel] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const vapiRef = useRef<Vapi | null>(null);

  // Initialize VAPI
  useEffect(() => {
    const vapi = new Vapi(VAPI_PUBLIC_KEY);
    vapiRef.current = vapi;

    vapi.on('call-start', () => setVapiCallState('connected'));
    vapi.on('call-end', () => {
      setVapiCallState('idle');
      setIsListening(false);
      setIsSpeaking(false);
    });
    vapi.on('speech-start', () => setIsSpeaking(true));
    vapi.on('speech-end', () => setIsSpeaking(false));
    vapi.on('volume-level', (v) => setVolumeLevel(v));

    return () => {
      vapi.stop();
    };
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const stopSpeaking = useCallback(() => {
    // Vapi handles stopping its own speech when the call ends or is stopped.
    if (vapiRef.current && vapiCallState === 'connected') {
      vapiRef.current.stop();
    }
    setIsSpeaking(false);
  }, [vapiCallState]);

  const toggleListening = async () => {
    if (!vapiRef.current) return;

    if (vapiCallState === 'connected') {
      vapiRef.current.stop();
      setIsListening(false);
    } else {
      setIsListening(true);
      setVapiCallState('connecting');
      try {
        await vapiRef.current.start(VAPI_ASSISTANT_ID);
      } catch (error) {
        console.error('Vapi connection failed:', error);
        setVapiCallState('idle');
        setIsListening(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    stopSpeaking(); // Stop any ongoing Vapi speech if user types
    const text = input.trim();
    setInput('');
    await sendMessage(text);
    inputRef.current?.focus();
  };

  const hasMessages = (messages?.length || 0) > 0;

  // Status text
  const getStatusText = () => {
    if (vapiCallState === 'connecting') return 'Connecting...';
    if (isListening) return 'Listening...';
    if (isSpeaking) return 'Speaking...';
    if (isStreaming) return 'Thinking...';
    return 'Ask anything';
  };

  return (
    <div
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-xl transition-all duration-200 ease-premium',
        'border border-border bg-card shadow-elevation-1',
        isFocused ? 'border-primary/30 shadow-glow-sm' : 'hover:border-border'
      )}
    >
      {/* Header */}
      <div className="relative flex items-center justify-between border-b border-border bg-muted/20 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="bg-primary/8 flex h-7 w-7 items-center justify-center rounded-lg text-primary">
              <Bot className="h-3.5 w-3.5" />
            </div>
            {(isListening || isSpeaking || isStreaming || vapiCallState === 'connecting') && (
              <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex h-3 w-3 rounded-full bg-primary"></span>
              </span>
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-medium text-foreground">Assistant</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                {getStatusText()}
              </span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1.5">
          {/* Stop speaking button is now handled by stopping the Vapi call */}
          {vapiCallState === 'connected' && (
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              onClick={stopSpeaking}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-destructive/10 text-destructive transition-colors hover:bg-destructive/20"
              title="Stop voice interaction"
            >
              <VolumeX className="h-4 w-4" />
            </motion.button>
          )}
          {/* Voice enabled toggle is removed as Vapi is always voice-enabled when connected */}
          {/* <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-xl transition-all',
              voiceEnabled
                ? 'bg-primary/10 text-primary hover:bg-primary/20'
                : 'bg-muted text-muted-foreground/50 hover:bg-muted/80'
            )}
            title={voiceEnabled ? 'Mute voice' : 'Enable voice'}
          >
            {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button> */}
          <button
            onClick={clearConversation}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
            title="Clear chat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="relative flex min-h-0 flex-1 flex-col">
        {/* Messages */}
        <div className="scrollbar-none flex-1 overflow-y-auto px-4 py-4">
          <AnimatePresence mode="popLayout" initial={false}>
            {!hasMessages ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex h-full flex-col justify-center gap-4 px-1"
              >
                <p className="text-center text-xs font-medium text-muted-foreground/60">
                  Try asking
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {AI_CAPABILITIES.map((cap, i) => (
                    <motion.button
                      key={cap.prompt}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03, duration: 0.25 }}
                      onClick={() => {
                        setInput('');
                        sendMessage(cap.prompt);
                      }}
                      className="group flex items-center gap-1.5 rounded-lg border border-border bg-background/60 px-2.5 py-1.5 text-left transition-all duration-200 ease-premium hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5 hover:shadow-sm"
                    >
                      <cap.icon className="h-3 w-3 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-primary" />
                      <span className="text-[11px] font-medium text-muted-foreground/70 transition-colors group-hover:text-foreground">
                        {cap.label}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <div className="space-y-4">
                {(messages || []).map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className={cn(
                      'flex w-full',
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[85%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed shadow-sm',
                        message.role === 'user'
                          ? 'rounded-tr-sm bg-primary text-primary-foreground'
                          : 'rounded-tl-sm border border-border bg-card/80 text-foreground'
                      )}
                    >
                      {message.content}
                    </div>
                  </motion.div>
                ))}

                {/* Waveform indicator when busy */}
                {(isStreaming || isListening || isSpeaking || vapiCallState === 'connecting') && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3 px-2"
                  >
                    <div className="flex h-8 items-center gap-1.5 rounded-full border border-primary/10 bg-primary/5 px-3 py-1.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <motion.div
                          key={i}
                          animate={{
                            height: isListening ? [4, 16, 4] : isSpeaking ? [8, 20, 8] : [4, 8, 4],
                            opacity: [0.5, 1, 0.5],
                          }}
                          transition={{
                            duration: 0.6,
                            repeat: Infinity,
                            delay: i * 0.1,
                          }}
                          className={cn(
                            'w-1.5 rounded-full',
                            isListening
                              ? 'bg-amber-400'
                              : isSpeaking
                                ? 'bg-primary'
                                : 'bg-muted-foreground/30'
                          )}
                          style={{
                            height: isSpeaking ? `${8 + volumeLevel * 20}px` : '4px',
                          }}
                        />
                      ))}
                      <span className="ml-1 text-[11px] font-bold uppercase tracking-wider text-primary/60">
                        {isListening
                          ? vapiCallState === 'connecting'
                            ? 'CONNECTING'
                            : 'LISTENING'
                          : isSpeaking
                            ? 'SPEAKING'
                            : 'THINKING'}
                      </span>
                    </div>
                  </motion.div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Dynamic Voice/Input Area */}
        <div className="relative mt-auto border-t border-border p-3">
          {/* Listening Overlay */}
          <AnimatePresence>
            {isListening && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="absolute inset-x-4 bottom-4 top-4 z-10 flex items-center gap-3 rounded-xl bg-rose-500/10 px-4 backdrop-blur-md"
              >
                <div className="flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-75"></span>
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-rose-500"></span>
                </div>
                <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                  {vapiCallState === 'connecting'
                    ? 'Connecting to voice assistant...'
                    : 'Listening to you...'}
                </span>
                <button
                  onClick={toggleListening}
                  className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500 text-white shadow-lg"
                >
                  <MicOff className="h-4 w-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
            <div
              className={cn(
                'flex flex-1 items-center gap-2 rounded-xl border border-border bg-background/60 px-3 transition-all duration-200 ease-premium',
                isFocused ? 'border-primary/40 bg-background shadow-glow-sm' : 'hover:border-border'
              )}
            >
              {/* This button is now for text input, not voice */}
              {/* <button
                type="button"
                onClick={toggleListening}
                disabled={!recognitionRef.current}
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all',
                  'text-muted-foreground hover:bg-primary/10 hover:text-primary',
                  !recognitionRef.current && 'cursor-not-allowed opacity-40'
                )}
                title="Voice input"
              >
                <Mic className="h-5 w-5" />
              </button> */}

              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="Message assistant..."
                disabled={isStreaming || isListening || vapiCallState === 'connecting'}
                className={cn(
                  'h-11 flex-1 bg-transparent text-sm font-medium outline-none',
                  'placeholder:text-muted-foreground/50',
                  'disabled:cursor-not-allowed disabled:opacity-50'
                )}
              />

              <button
                type="button" // Changed to type="button" for the mic button
                onClick={toggleListening}
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300',
                  isListening
                    ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {vapiCallState === 'connecting' ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : isListening ? (
                  <MicOff className="h-5 w-5" />
                ) : (
                  <Mic className="h-5 w-5" />
                )}
              </button>

              <button
                type="submit"
                disabled={!input.trim() || isStreaming}
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all',
                  input.trim()
                    ? 'scale-110 bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                    : 'text-muted-foreground/30'
                )}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
