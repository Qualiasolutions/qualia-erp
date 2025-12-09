'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { X, Phone, PhoneOff, Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import Vapi from '@vapi-ai/web';

interface QualiaVoiceProps {
  isOpen: boolean;
  onClose: () => void;
}

type CallState = 'idle' | 'connecting' | 'connected' | 'speaking' | 'listening';

// Comprehensive Qualia personality and knowledge base
const QUALIA_SYSTEM_PROMPT = `You are Qualia — the voice assistant for Qualia Solutions, a software development and digital marketing agency based in Cyprus.

## YOUR IDENTITY
- You ARE Qualia. Speak naturally in first person.
- You're helpful, sharp, and efficient — like a smart colleague, not a robotic assistant.
- Keep responses concise for voice conversation — 1-3 sentences max unless asked for detail.
- Be warm but professional. No corporate fluff.

## ABOUT QUALIA SOLUTIONS
We're a boutique agency specializing in:
1. **Web Design & Development** — Modern Next.js apps, React sites, custom platforms
2. **AI Agent Development** — Custom AI assistants, chatbots, voice agents, automation
3. **SEO Services** — Technical SEO, content strategy, search optimization
4. **Digital Advertising** — Google Ads, Meta Ads, performance marketing

## OUR CURRENT PROJECTS
- **Sophia** - AI voice agent for Froutaria Siga ta Lachana (fruit shop), due Dec 22
- **Anastasia** - AI agent for Froutaria Siga ta Lachana, due Dec 22
- **Alexis** - AI agent for I.T. Armenius LTD, due Dec 22

## OUR APPROACH
- We use modern tech: Next.js, React, TypeScript, Supabase, Tailwind CSS, Vercel
- Every project follows structured roadmaps with clear phases
- We're AI-first — we build and use AI tools extensively
- Quality over quantity — we take on select clients and deliver excellence

## HOW TO HELP
You can assist team members with:
- **Project questions** — Status updates, deadlines, phase progress
- **Client information** — Contact details, project history, lead status
- **Scheduling** — Meeting times, availability, reminders
- **Task management** — What's on the board, priorities, assignments
- **General questions** — Anything about how we work

## VOICE STYLE
- Greet casually: "Hey!" or "What's up?" not "Hello, how may I assist you today?"
- Be direct: "Got it, I'll check that" not "I would be happy to look into that for you"
- Show personality: Brief reactions like "Nice!" or "Hmm, let me think..."
- If you don't know something, say so: "I don't have that info right now"

Remember: You're part of the team. Act like it.`;

export function QualiaVoice({ isOpen, onClose }: QualiaVoiceProps) {
  const [callState, setCallState] = useState<CallState>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [assistantMessage, setAssistantMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [volumeLevel, setVolumeLevel] = useState(0);

  const vapiRef = useRef<Vapi | null>(null);

  // Initialize VAPI
  useEffect(() => {
    const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
    if (!publicKey) {
      setError('VAPI not configured');
      return;
    }

    const vapi = new Vapi(publicKey);
    vapiRef.current = vapi;

    // Event listeners
    vapi.on('call-start', () => {
      setCallState('connected');
      setError(null);
    });

    vapi.on('call-end', () => {
      setCallState('idle');
      setTranscript('');
      setAssistantMessage('');
    });

    vapi.on('speech-start', () => {
      setCallState('speaking');
    });

    vapi.on('speech-end', () => {
      setCallState('listening');
    });

    vapi.on('volume-level', (volume: number) => {
      setVolumeLevel(volume);
    });

    vapi.on('message', (message: { type: string; role?: string; transcript?: string }) => {
      if (message.type === 'transcript') {
        if (message.role === 'user') {
          setTranscript(message.transcript || '');
        } else if (message.role === 'assistant') {
          setAssistantMessage(message.transcript || '');
        }
      }
    });

    vapi.on('error', (e: Error) => {
      console.error('VAPI error:', e);
      setError(e.message || 'Call error');
      setCallState('idle');
    });

    return () => {
      vapi.stop();
    };
  }, []);

  // Start call
  const startCall = useCallback(async () => {
    if (!vapiRef.current) {
      setError('VAPI not initialized');
      return;
    }

    setCallState('connecting');
    setError(null);
    setTranscript('');
    setAssistantMessage('');

    try {
      // Start with inline assistant config or use assistant ID
      const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;

      if (assistantId) {
        await vapiRef.current.start(assistantId);
      } else {
        // Inline assistant configuration with comprehensive Qualia personality
        await vapiRef.current.start({
          model: {
            provider: 'openai',
            model: 'gpt-4o',
            messages: [
              {
                role: 'system',
                content: QUALIA_SYSTEM_PROMPT,
              },
            ],
          },
          voice: {
            provider: '11labs',
            voiceId: '4wf10lgibMnboGJGCLrP', // Custom Qualia voice
          },
          firstMessage: 'Hey! What can I help you with?',
          transcriber: {
            provider: 'deepgram',
            model: 'nova-2',
            language: 'en',
          },
        });
      }
    } catch (err) {
      console.error('Failed to start call:', err);
      setError('Failed to start call');
      setCallState('idle');
    }
  }, []);

  // End call
  const endCall = useCallback(() => {
    if (vapiRef.current) {
      vapiRef.current.stop();
    }
    setCallState('idle');
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (vapiRef.current) {
      const newMuted = !isMuted;
      vapiRef.current.setMuted(newMuted);
      setIsMuted(newMuted);
    }
  }, [isMuted]);

  // Handle close
  const handleClose = useCallback(() => {
    endCall();
    onClose();
  }, [endCall, onClose]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const isInCall = callState !== 'idle' && callState !== 'connecting';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Main content */}
      <div className="flex flex-col items-center">
        {/* Qualia avatar with state indicator */}
        <div className="relative mb-8">
          {/* Volume/pulse rings - Qualia teal theme */}
          {isInCall && (
            <>
              <div
                className={cn(
                  'absolute -inset-4 rounded-full transition-all duration-300',
                  callState === 'speaking' && 'bg-qualia-500/30',
                  callState === 'listening' && 'bg-qualia-400/20'
                )}
                style={{
                  transform: `scale(${1 + volumeLevel * 0.3})`,
                  opacity: 0.5 + volumeLevel * 0.5,
                }}
              />
              <div
                className={cn(
                  'absolute -inset-8 rounded-full transition-all duration-500',
                  callState === 'speaking' && 'bg-qualia-500/20',
                  callState === 'listening' && 'bg-qualia-400/10'
                )}
                style={{
                  transform: `scale(${1 + volumeLevel * 0.2})`,
                  opacity: 0.3 + volumeLevel * 0.3,
                }}
              />
              <div
                className={cn(
                  'absolute -inset-12 rounded-full transition-all duration-700',
                  callState === 'speaking' && 'bg-qualia-500/10',
                  callState === 'listening' && 'bg-qualia-400/5'
                )}
                style={{
                  transform: `scale(${1 + volumeLevel * 0.15})`,
                  opacity: 0.2 + volumeLevel * 0.2,
                }}
              />
            </>
          )}

          {/* Connecting animation */}
          {callState === 'connecting' && (
            <>
              <div className="absolute -inset-4 animate-ping rounded-full bg-qualia-500/30" />
              <div className="absolute -inset-8 animate-ping rounded-full bg-qualia-500/20 [animation-delay:150ms]" />
              <div className="absolute -inset-12 animate-ping rounded-full bg-qualia-500/10 [animation-delay:300ms]" />
            </>
          )}

          {/* Avatar */}
          <div
            className={cn(
              'relative flex h-32 w-32 items-center justify-center rounded-full border-2 transition-all duration-300',
              callState === 'idle' && 'border-border bg-card',
              callState === 'connecting' && 'border-qualia-500 bg-qualia-500/10',
              callState === 'connected' && 'border-qualia-500 bg-qualia-500/10',
              callState === 'listening' && 'border-qualia-400 bg-qualia-500/10',
              callState === 'speaking' && 'border-qualia-300 bg-qualia-500/20'
            )}
          >
            <Image src="/logo.webp" alt="Qualia" width={80} height={80} className="rounded-2xl" />
          </div>
        </div>

        {/* Status text */}
        <div className="mb-8 text-center">
          <h2 className="mb-2 text-xl font-semibold text-foreground">
            {callState === 'idle' && 'Call Qualia'}
            {callState === 'connecting' && 'Connecting...'}
            {callState === 'connected' && 'Connected'}
            {callState === 'listening' && 'Listening...'}
            {callState === 'speaking' && 'Qualia is speaking...'}
          </h2>

          {/* Transcript / Response */}
          <div className="max-w-md space-y-2">
            {transcript && (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">You:</span> &ldquo;{transcript}&rdquo;
              </p>
            )}
            {assistantMessage && (
              <p className="text-sm text-qualia-400">
                <span className="font-medium text-qualia-300">Qualia:</span> &ldquo;
                {assistantMessage.slice(0, 200)}
                {assistantMessage.length > 200 ? '...' : ''}&rdquo;
              </p>
            )}
            {callState === 'idle' && !error && (
              <p className="text-sm text-muted-foreground">Tap the button to start a voice call</p>
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          {/* Mute button - only show during call */}
          {isInCall && (
            <button
              onClick={toggleMute}
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-full transition-all',
                isMuted
                  ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                  : 'bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground'
              )}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
          )}

          {/* Main call button */}
          <button
            onClick={isInCall ? endCall : startCall}
            disabled={callState === 'connecting'}
            className={cn(
              'flex h-20 w-20 items-center justify-center rounded-full shadow-lg transition-all',
              callState === 'idle' &&
                'bg-qualia-500 text-white hover:scale-105 hover:bg-qualia-600',
              callState === 'connecting' &&
                'animate-pulse cursor-not-allowed bg-qualia-500/70 text-white',
              isInCall && 'bg-red-500 text-white hover:scale-105 hover:bg-red-600'
            )}
          >
            {isInCall ? <PhoneOff className="h-7 w-7" /> : <Phone className="h-7 w-7" />}
          </button>

          {/* Placeholder for symmetry when not in call */}
          {!isInCall && <div className="h-12 w-12" />}
        </div>

        {/* Call duration or hint */}
        <p className="mt-8 text-xs text-muted-foreground">
          {isInCall ? (
            'Tap the red button to end the call'
          ) : (
            <>
              Press{' '}
              <kbd className="rounded border border-border bg-secondary px-1.5 py-0.5">Esc</kbd> to
              close
            </>
          )}
        </p>
      </div>
    </div>
  );
}
