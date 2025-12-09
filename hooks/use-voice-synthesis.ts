'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseVoiceSynthesisOptions {
  vibeVoiceUrl?: string;
  fallbackToBrowser?: boolean;
  voice?: string;
  rate?: number;
  pitch?: number;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

interface VoiceSynthesisResult {
  isSpeaking: boolean;
  isSupported: boolean;
  isLoading: boolean;
  speak: (text: string) => Promise<void>;
  stop: () => void;
  voices: SpeechSynthesisVoice[];
}

export function useVoiceSynthesis(options: UseVoiceSynthesisOptions = {}): VoiceSynthesisResult {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const optionsRef = useRef(options);

  // Update options ref when options change
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    // Check browser TTS support
    const hasBrowserTTS = typeof window !== 'undefined' && 'speechSynthesis' in window;
    setIsSupported(hasBrowserTTS || !!options.vibeVoiceUrl);

    if (hasBrowserTTS) {
      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        setVoices(availableVoices);
      };

      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    // Create audio element for VibeVoice
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio();
      audioRef.current.onended = () => {
        setIsSpeaking(false);
        optionsRef.current.onEnd?.();
      };
      audioRef.current.onerror = () => {
        setIsSpeaking(false);
        optionsRef.current.onError?.('Audio playback failed');
      };
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [options.vibeVoiceUrl]);

  const speakWithVibeVoice = useCallback(async (text: string): Promise<boolean> => {
    const url = optionsRef.current.vibeVoiceUrl;
    if (!url || !audioRef.current) return false;

    try {
      setIsLoading(true);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error(`VibeVoice API error: ${response.status}`);
      }

      const data = await response.json();
      if (data.audio) {
        // Audio is base64 encoded WAV
        const audioBlob = new Blob([Uint8Array.from(atob(data.audio), (c) => c.charCodeAt(0))], {
          type: 'audio/wav',
        });
        const audioUrl = URL.createObjectURL(audioBlob);
        audioRef.current.src = audioUrl;
        audioRef.current.play();
        setIsSpeaking(true);
        setIsLoading(false);
        return true;
      }

      return false;
    } catch (error) {
      console.error('VibeVoice synthesis failed:', error);
      setIsLoading(false);
      return false;
    }
  }, []);

  const speakWithBrowser = useCallback((text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel(); // Stop any current speech

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = optionsRef.current.rate ?? 1;
    utterance.pitch = optionsRef.current.pitch ?? 1;

    // Find a good English voice
    const currentVoices = window.speechSynthesis.getVoices();
    if (optionsRef.current.voice) {
      const selectedVoice = currentVoices.find((v) => v.name === optionsRef.current.voice);
      if (selectedVoice) utterance.voice = selectedVoice;
    } else {
      // Default to a good English voice
      const englishVoice =
        currentVoices.find((v) => v.lang.startsWith('en') && v.name.includes('Google')) ||
        currentVoices.find((v) => v.lang.startsWith('en'));
      if (englishVoice) utterance.voice = englishVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      optionsRef.current.onEnd?.();
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      optionsRef.current.onError?.('Browser TTS failed');
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  const speak = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      // Try VibeVoice first if configured
      if (optionsRef.current.vibeVoiceUrl) {
        const success = await speakWithVibeVoice(text);
        if (success) return;

        // Fall back to browser TTS if configured
        if (optionsRef.current.fallbackToBrowser !== false) {
          console.log('Falling back to browser TTS');
          speakWithBrowser(text);
        }
      } else {
        // Use browser TTS directly
        speakWithBrowser(text);
      }
    },
    [speakWithVibeVoice, speakWithBrowser]
  );

  const stop = useCallback(() => {
    // Stop VibeVoice audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    // Stop browser TTS
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    setIsSpeaking(false);
    setIsLoading(false);
  }, []);

  return {
    isSpeaking,
    isSupported,
    isLoading,
    speak,
    stop,
    voices,
  };
}
