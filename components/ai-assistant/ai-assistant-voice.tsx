'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Mic, MicOff, PhoneOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Vapi from '@vapi-ai/web';

type CallState = 'idle' | 'connecting' | 'connected' | 'speaking' | 'listening';

export function AIAssistantVoice() {
  // VAPI handles everything - no need for sendMessage from context

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
      setError('Voice not configured');
      return;
    }

    const vapi = new Vapi(publicKey);
    vapiRef.current = vapi;

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

    vapi.on('error', (e: { type?: string; message?: string }) => {
      console.error('VAPI error:', e);

      if (e.type === 'device-error') {
        setError('Microphone not found');
      } else if (e.type === 'permission-error') {
        setError('Microphone permission denied');
      } else if (e.type === 'daily-error' || e.message?.includes('Meeting has ended')) {
        setCallState('idle');
        return;
      } else {
        setError(e.message || 'Call error');
      }
      setCallState('idle');
    });

    return () => {
      vapi.stop();
    };
  }, []);

  const startCall = useCallback(async () => {
    if (!vapiRef.current) {
      setError('Voice not initialized');
      return;
    }

    // Request microphone permission
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
    } catch (err: unknown) {
      const error = err as { name?: string };
      if (error.name === 'NotAllowedError') {
        setError('Microphone permission denied');
        return;
      } else if (error.name === 'NotFoundError') {
        setError('No microphone found');
        return;
      }
    }

    setCallState('connecting');
    setError(null);
    setTranscript('');
    setAssistantMessage('');

    try {
      const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;

      if (assistantId) {
        await vapiRef.current.start(assistantId);
      } else {
        setError('Assistant not configured');
        setCallState('idle');
      }
    } catch (err) {
      console.error('Failed to start call:', err);
      setError('Failed to start call');
      setCallState('idle');
    }
  }, []);

  const endCall = useCallback(() => {
    if (vapiRef.current) {
      vapiRef.current.stop();
    }
    setCallState('idle');
  }, []);

  const toggleMute = useCallback(() => {
    if (vapiRef.current) {
      const newMuted = !isMuted;
      vapiRef.current.setMuted(newMuted);
      setIsMuted(newMuted);
    }
  }, [isMuted]);

  const isInCall = callState !== 'idle' && callState !== 'connecting';

  return (
    <div className="flex h-full flex-col items-center justify-center px-4 py-8">
      {/* Large Mic Button with volume rings */}
      <div className="relative mb-6">
        {/* Volume rings when in call */}
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
          </>
        )}

        {/* Connecting animation */}
        {callState === 'connecting' && (
          <>
            <div className="absolute -inset-4 animate-ping rounded-full bg-qualia-500/30" />
            <div className="absolute -inset-8 animate-ping rounded-full bg-qualia-500/20 [animation-delay:150ms]" />
          </>
        )}

        <button
          onClick={isInCall ? endCall : startCall}
          disabled={callState === 'connecting'}
          className={cn(
            'relative flex h-24 w-24 items-center justify-center rounded-full transition-all',
            callState === 'idle' &&
              'bg-gradient-to-br from-qualia-500 to-qualia-700 text-white hover:shadow-glow',
            callState === 'connecting' && 'bg-qualia-500/50 text-white',
            isInCall && 'bg-destructive text-destructive-foreground',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
        >
          {callState === 'connecting' ? (
            <Loader2 className="h-10 w-10 animate-spin" />
          ) : isInCall ? (
            <PhoneOff className="h-10 w-10" />
          ) : (
            <Mic className="h-10 w-10" />
          )}
        </button>
      </div>

      {/* Status Text */}
      <p className="mb-4 text-sm font-medium text-foreground">
        {callState === 'idle' && 'Tap to talk'}
        {callState === 'connecting' && 'Connecting...'}
        {callState === 'listening' && 'Listening...'}
        {callState === 'speaking' && 'Speaking...'}
        {callState === 'connected' && 'Connected'}
      </p>

      {/* Error */}
      {error && <p className="mb-4 text-xs text-destructive">{error}</p>}

      {/* Transcript */}
      {isInCall && (transcript || assistantMessage) && (
        <div className="w-full max-w-sm space-y-2 text-center">
          {transcript && (
            <div className="rounded-lg bg-secondary/50 px-3 py-2">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">You:</span> {transcript}
              </p>
            </div>
          )}
          {assistantMessage && (
            <div className="rounded-lg bg-primary/10 px-3 py-2">
              <p className="text-xs text-primary">
                <span className="font-medium">Qualia:</span> {assistantMessage.slice(0, 150)}
                {assistantMessage.length > 150 ? '...' : ''}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Mute button when in call */}
      {isInCall && (
        <button
          onClick={toggleMute}
          className={cn(
            'mt-6 flex h-10 w-10 items-center justify-center rounded-full transition-all',
            isMuted
              ? 'bg-destructive/10 text-destructive hover:bg-destructive/20'
              : 'bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground'
          )}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>
      )}

      {/* Help text */}
      <p className="mt-6 text-center text-[10px] text-muted-foreground">Voice powered by VAPI</p>
    </div>
  );
}
