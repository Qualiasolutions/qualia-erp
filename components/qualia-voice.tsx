'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { X, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QualiaVoiceProps {
  isOpen: boolean;
  onClose: () => void;
}

type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';

// Type for the speech recognition instance
type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult:
    | ((event: {
        resultIndex: number;
        results: {
          length: number;
          [index: number]: { isFinal: boolean; [index: number]: { transcript: string } };
        };
      }) => void)
    | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

export function QualiaVoice({ isOpen, onClose }: QualiaVoiceProps) {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize speech recognition
  const initRecognition = useCallback((): SpeechRecognitionInstance | null => {
    if (typeof window === 'undefined') return null;

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setError('Speech recognition is not supported in your browser');
      return null;
    }

    const recognition = new SpeechRecognitionAPI() as SpeechRecognitionInstance;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const current = event.resultIndex;
      const result = event.results[current];
      const transcriptText = result[0].transcript;
      setTranscript(transcriptText);

      if (result.isFinal) {
        handleUserSpeech(transcriptText);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error !== 'aborted') {
        setError(`Recognition error: ${event.error}`);
      }
      setVoiceState('idle');
    };

    recognition.onend = () => {
      if (voiceState === 'listening') {
        setVoiceState('idle');
      }
    };

    return recognition;
  }, [voiceState]);

  // Send user speech to AI and get response
  const handleUserSpeech = async (text: string) => {
    if (!text.trim()) return;

    setVoiceState('processing');
    setError(null);

    try {
      abortControllerRef.current = new AbortController();

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: text }],
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) {
        throw new Error('Failed to get response');
      }

      // Handle streaming response
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      let fullResponse = '';
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        // Parse SSE format
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('0:')) {
            // Text content
            const content = line.slice(2).trim();
            if (content.startsWith('"') && content.endsWith('"')) {
              fullResponse += JSON.parse(content);
            }
          }
        }
      }

      setResponse(fullResponse);
      if (!isMuted && fullResponse) {
        speakResponse(fullResponse);
      } else {
        setVoiceState('idle');
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message);
        setVoiceState('idle');
      }
    }
  };

  // Text-to-speech for Qualia's response
  const speakResponse = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setError('Speech synthesis is not supported');
      setVoiceState('idle');
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Try to find a good voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (v) => v.name.includes('Samantha') || v.name.includes('Google') || v.name.includes('Female')
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => setVoiceState('speaking');
    utterance.onend = () => setVoiceState('idle');
    utterance.onerror = () => {
      setError('Speech synthesis error');
      setVoiceState('idle');
    };

    synthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  // Start listening
  const startListening = () => {
    setError(null);
    setTranscript('');

    if (!recognitionRef.current) {
      recognitionRef.current = initRecognition();
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setVoiceState('listening');
      } catch (err) {
        console.error('Failed to start recognition:', err);
      }
    }
  };

  // Stop listening
  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setVoiceState('idle');
  };

  // Stop speaking
  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setVoiceState('idle');
  };

  // Toggle mute
  const toggleMute = () => {
    if (!isMuted && voiceState === 'speaking') {
      stopSpeaking();
    }
    setIsMuted(!isMuted);
  };

  // Handle mic button click
  const handleMicClick = () => {
    if (voiceState === 'listening') {
      stopListening();
    } else if (voiceState === 'speaking') {
      stopSpeaking();
      startListening();
    } else if (voiceState === 'idle') {
      startListening();
    }
  };

  // Cleanup on close
  useEffect(() => {
    if (!isOpen) {
      stopListening();
      stopSpeaking();
      abortControllerRef.current?.abort();
      setTranscript('');
      setResponse('');
      setError(null);
      setVoiceState('idle');
    }
  }, [isOpen]);

  // Load voices
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
    }
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Main content */}
      <div className="flex flex-col items-center">
        {/* Qualia avatar with state indicator */}
        <div className="relative mb-8">
          {/* Pulse rings for different states */}
          <div
            className={cn(
              'absolute -inset-4 rounded-full transition-all duration-500',
              voiceState === 'listening' && 'animate-ping bg-primary/20',
              voiceState === 'processing' && 'animate-pulse bg-amber-500/20',
              voiceState === 'speaking' && 'animate-pulse bg-emerald-500/20'
            )}
          />
          <div
            className={cn(
              'absolute -inset-8 rounded-full transition-all duration-700',
              voiceState === 'listening' && 'animate-ping bg-primary/10 [animation-delay:150ms]',
              voiceState === 'speaking' && 'animate-pulse bg-emerald-500/10 [animation-delay:150ms]'
            )}
          />

          {/* Avatar */}
          <div
            className={cn(
              'relative flex h-32 w-32 items-center justify-center rounded-full border-2 transition-all duration-300',
              voiceState === 'idle' && 'border-border bg-card',
              voiceState === 'listening' && 'border-primary bg-primary/10',
              voiceState === 'processing' && 'border-amber-500 bg-amber-500/10',
              voiceState === 'speaking' && 'border-emerald-500 bg-emerald-500/10'
            )}
          >
            <Image src="/logo.webp" alt="Qualia" width={80} height={80} className="rounded-2xl" />
          </div>
        </div>

        {/* Status text */}
        <div className="mb-8 text-center">
          <h2 className="mb-2 text-xl font-semibold text-foreground">
            {voiceState === 'idle' && 'Qualia'}
            {voiceState === 'listening' && 'Listening...'}
            {voiceState === 'processing' && 'Thinking...'}
            {voiceState === 'speaking' && 'Speaking...'}
          </h2>

          {/* Transcript or response */}
          <p className="max-w-md text-sm text-muted-foreground">
            {voiceState === 'listening' && transcript && `"${transcript}"`}
            {voiceState === 'idle' && !error && 'Tap the mic to start talking'}
            {voiceState === 'processing' && transcript && `"${transcript}"`}
            {voiceState === 'speaking' &&
              response &&
              response.slice(0, 100) + (response.length > 100 ? '...' : '')}
            {error && <span className="text-red-500">{error}</span>}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          {/* Mute button */}
          <button
            onClick={toggleMute}
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-full transition-all',
              isMuted
                ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                : 'bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground'
            )}
            title={isMuted ? 'Unmute Qualia' : 'Mute Qualia'}
          >
            {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>

          {/* Main mic button */}
          <button
            onClick={handleMicClick}
            disabled={voiceState === 'processing'}
            className={cn(
              'flex h-16 w-16 items-center justify-center rounded-full transition-all',
              voiceState === 'idle' && 'bg-primary text-primary-foreground hover:bg-primary/90',
              voiceState === 'listening' && 'bg-red-500 text-white hover:bg-red-600',
              voiceState === 'processing' && 'cursor-not-allowed bg-amber-500 text-white',
              voiceState === 'speaking' && 'bg-emerald-500 text-white hover:bg-emerald-600'
            )}
          >
            {voiceState === 'listening' ? (
              <MicOff className="h-6 w-6" />
            ) : (
              <Mic className="h-6 w-6" />
            )}
          </button>

          {/* Placeholder for symmetry */}
          <div className="h-12 w-12" />
        </div>

        {/* Keyboard hint */}
        <p className="mt-8 text-xs text-muted-foreground">
          Press <kbd className="rounded border border-border bg-secondary px-1.5 py-0.5">Esc</kbd>{' '}
          to close
        </p>
      </div>
    </div>
  );
}
