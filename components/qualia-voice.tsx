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
        // Inline assistant configuration
        await vapiRef.current.start({
          model: {
            provider: 'openai',
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `You are Qualia, an AI assistant for Qualia Solutions - a software development and digital marketing agency. You help team members with:
- Project management and task tracking
- Client relationship management
- Schedule and meeting coordination
- General questions about ongoing work

Be helpful, concise, and professional. Keep responses brief for voice conversation.`,
              },
            ],
          },
          voice: {
            provider: '11labs',
            voiceId: 'EXAVITQu4vr4xnSDxMaL', // Sarah - professional female voice
          },
          firstMessage: "Hey! I'm Qualia, how can I help you today?",
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
          {/* Volume/pulse rings */}
          {isInCall && (
            <>
              <div
                className={cn(
                  'absolute -inset-4 rounded-full transition-all duration-300',
                  callState === 'speaking' && 'bg-emerald-500/20',
                  callState === 'listening' && 'bg-primary/20'
                )}
                style={{
                  transform: `scale(${1 + volumeLevel * 0.3})`,
                  opacity: 0.5 + volumeLevel * 0.5,
                }}
              />
              <div
                className={cn(
                  'absolute -inset-8 rounded-full transition-all duration-500',
                  callState === 'speaking' && 'bg-emerald-500/10',
                  callState === 'listening' && 'bg-primary/10'
                )}
                style={{
                  transform: `scale(${1 + volumeLevel * 0.2})`,
                  opacity: 0.3 + volumeLevel * 0.3,
                }}
              />
            </>
          )}

          {/* Connecting animation */}
          {callState === 'connecting' && (
            <>
              <div className="absolute -inset-4 animate-ping rounded-full bg-amber-500/20" />
              <div className="absolute -inset-8 animate-ping rounded-full bg-amber-500/10 [animation-delay:150ms]" />
            </>
          )}

          {/* Avatar */}
          <div
            className={cn(
              'relative flex h-32 w-32 items-center justify-center rounded-full border-2 transition-all duration-300',
              callState === 'idle' && 'border-border bg-card',
              callState === 'connecting' && 'border-amber-500 bg-amber-500/10',
              callState === 'connected' && 'border-primary bg-primary/10',
              callState === 'listening' && 'border-primary bg-primary/10',
              callState === 'speaking' && 'border-emerald-500 bg-emerald-500/10'
            )}
          >
            <Image src="/logo.webp" alt="Qualia" width={80} height={80} className="rounded-2xl" />
          </div>
        </div>

        {/* Status text */}
        <div className="mb-8 text-center">
          <h2 className="mb-2 text-xl font-semibold text-foreground">
            {callState === 'idle' && 'Qualia'}
            {callState === 'connecting' && 'Connecting...'}
            {callState === 'connected' && 'Connected'}
            {callState === 'listening' && 'Listening...'}
            {callState === 'speaking' && 'Speaking...'}
          </h2>

          {/* Transcript / Response */}
          <div className="max-w-md space-y-2">
            {transcript && (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">You:</span> &ldquo;{transcript}&rdquo;
              </p>
            )}
            {assistantMessage && (
              <p className="text-sm text-primary">
                <span className="font-medium">Qualia:</span> &ldquo;
                {assistantMessage.slice(0, 150)}
                {assistantMessage.length > 150 ? '...' : ''}&rdquo;
              </p>
            )}
            {callState === 'idle' && !error && (
              <p className="text-sm text-muted-foreground">Tap to start a voice call with Qualia</p>
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
              'flex h-16 w-16 items-center justify-center rounded-full transition-all',
              callState === 'idle' && 'bg-emerald-500 text-white hover:bg-emerald-600',
              callState === 'connecting' && 'cursor-not-allowed bg-amber-500 text-white',
              isInCall && 'bg-red-500 text-white hover:bg-red-600'
            )}
          >
            {isInCall ? <PhoneOff className="h-6 w-6" /> : <Phone className="h-6 w-6" />}
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
