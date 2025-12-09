'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { PhoneOff, Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import Vapi from '@vapi-ai/web';

type CallState = 'idle' | 'connecting' | 'connected' | 'speaking' | 'listening';

// Comprehensive Qualia personality - Jordanian Arabic native + fluent English
const QUALIA_SYSTEM_PROMPT = `You are Qualia — the voice assistant for Qualia Solutions, a software development and digital marketing agency.

## YOUR IDENTITY & LANGUAGE
- You ARE Qualia. A native Jordanian Arabic speaker who is also completely fluent in English.
- You can seamlessly switch between Arabic (Jordanian dialect) and English based on how the user speaks to you.
- If they speak Arabic, respond in Jordanian Arabic. If English, respond in English. You can mix both naturally.
- You're helpful, sharp, and efficient — like a smart colleague, not a robotic assistant.
- Keep responses concise for voice conversation — 1-3 sentences max unless asked for detail.
- Be warm but professional. No corporate fluff.

## YOUR CAPABILITIES
You can help with:
- **Execute Tasks** — Create issues, update statuses, add comments, schedule meetings
- **Research** — Look up information online, find answers, gather data
- **Project Management** — Check project status, deadlines, roadmap progress
- **Client Info** — Contact details, project history, lead status
- **Scheduling** — Meeting times, availability, calendar management
- **Task Management** — Board status, priorities, assignments
- **General Questions** — Anything about the business or general knowledge

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

## OUR TECH STACK
Next.js, React, TypeScript, Supabase, Tailwind CSS, Vercel, VAPI, ElevenLabs

## VOICE STYLE
- Greet casually: "Hey!" / "أهلين!" / "شو الأخبار؟"
- Be direct and action-oriented
- Show personality with brief reactions
- If you need to do something, confirm and do it
- If you don't know something, say so honestly

Remember: You're part of the team. Act like it. إنتي من الفريق.`;

export function QualiaVoiceInline() {
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

  // Start call immediately
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
      const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;

      if (assistantId) {
        await vapiRef.current.start(assistantId);
      } else {
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
            voiceId: '4wf10lgibMnboGJGCLrP', // Custom Jordanian Arabic voice
          },
          firstMessage: 'أهلين! شو بتحتاج؟',
          transcriber: {
            provider: 'deepgram',
            model: 'nova-2',
            language: 'multi', // Multi-language for Arabic + English
          },
        });
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
    <div className="flex flex-col items-center">
      {/* Qualia Avatar with call button integrated */}
      <div className="relative mb-4">
        {/* Volume rings when in call */}
        {isInCall && (
          <>
            <div
              className={cn(
                'absolute -inset-3 rounded-full transition-all duration-300',
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
                'absolute -inset-6 rounded-full transition-all duration-500',
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
            <div className="absolute -inset-3 animate-ping rounded-full bg-qualia-500/30" />
            <div className="absolute -inset-6 animate-ping rounded-full bg-qualia-500/20 [animation-delay:150ms]" />
          </>
        )}

        {/* Main button - Logo that starts/ends call */}
        <button
          onClick={isInCall ? endCall : startCall}
          disabled={callState === 'connecting'}
          className={cn(
            'group relative rounded-3xl p-2 transition-all',
            callState === 'idle' && 'hover:bg-qualia-500/10',
            callState === 'connecting' && 'cursor-not-allowed',
            isInCall && 'bg-qualia-500/10'
          )}
        >
          <div className="relative">
            {/* Glow effect */}
            <div
              className={cn(
                'absolute -inset-2 rounded-full blur-xl transition-opacity duration-500',
                callState === 'idle' && 'bg-qualia-500/20 opacity-0 group-hover:opacity-100',
                callState === 'connecting' && 'animate-pulse bg-qualia-500/30 opacity-100',
                isInCall && 'bg-qualia-500/30 opacity-100'
              )}
            />
            <Image
              src="/logo.webp"
              alt="Qualia"
              width={80}
              height={80}
              className={cn(
                'relative rounded-2xl transition-transform duration-300',
                callState === 'idle' && 'group-hover:scale-105',
                isInCall && 'scale-105'
              )}
            />

            {/* Call indicator overlay */}
            {isInCall && (
              <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-lg">
                <PhoneOff className="h-3 w-3" />
              </div>
            )}
          </div>
        </button>
      </div>

      {/* Status text */}
      <div className="text-center">
        <p
          className={cn(
            'text-xs font-medium transition-colors',
            callState === 'idle' && 'text-muted-foreground',
            callState === 'connecting' && 'animate-pulse text-qualia-500',
            callState === 'listening' && 'text-qualia-400',
            callState === 'speaking' && 'text-qualia-300'
          )}
        >
          {callState === 'idle' && 'Talk to Qualia'}
          {callState === 'connecting' && 'Connecting...'}
          {callState === 'listening' && 'Listening...'}
          {callState === 'speaking' && 'Speaking...'}
        </p>
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>

      {/* Transcript display when in call */}
      {isInCall && (transcript || assistantMessage) && (
        <div className="mt-4 max-w-md space-y-1 text-center">
          {transcript && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">You:</span> &ldquo;{transcript}&rdquo;
            </p>
          )}
          {assistantMessage && (
            <p className="text-xs text-qualia-400">
              <span className="font-medium text-qualia-300">Qualia:</span> &ldquo;
              {assistantMessage.slice(0, 150)}
              {assistantMessage.length > 150 ? '...' : ''}&rdquo;
            </p>
          )}
        </div>
      )}

      {/* Mute button when in call */}
      {isInCall && (
        <button
          onClick={toggleMute}
          className={cn(
            'mt-4 flex h-10 w-10 items-center justify-center rounded-full transition-all',
            isMuted
              ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
              : 'bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground'
          )}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
}
