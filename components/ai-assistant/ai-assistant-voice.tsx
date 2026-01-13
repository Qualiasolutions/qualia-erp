'use client';

import { useCallback, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAIAssistant } from './ai-assistant-provider';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { useVoiceSynthesis } from '@/hooks/use-voice-synthesis';

export function AIAssistantVoice() {
  const {
    messages,
    isStreaming,
    voiceEnabled,
    isListening,
    isSpeaking,
    sendMessage,
    setListening,
    setSpeaking,
    toggleVoice,
  } = useAIAssistant();

  // Speech recognition hook
  const {
    isSupported: sttSupported,
    transcript,
    startListening,
    stopListening,
  } = useSpeechRecognition({
    language: 'ar-JO', // Jordanian Arabic
    continuous: false,
    interimResults: true,
    onResult: (text, isFinal) => {
      if (isFinal && text.trim()) {
        sendMessage(text.trim());
        setListening(false);
      }
    },
    onError: () => {
      setListening(false);
    },
  });

  // Voice synthesis hook
  const {
    isSupported: ttsSupported,
    speak,
    stop: stopSpeaking,
    isLoading: ttsLoading,
  } = useVoiceSynthesis({
    onEnd: () => setSpeaking(false),
    onError: () => setSpeaking(false),
  });

  // Sync listening state with speech recognition
  useEffect(() => {
    if (isListening) {
      startListening();
    } else {
      stopListening();
    }
  }, [isListening, startListening, stopListening]);

  // Speak new assistant messages when voice is enabled
  useEffect(() => {
    if (!voiceEnabled || isStreaming) return;

    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === 'assistant' && lastMessage.content) {
      setSpeaking(true);
      speak(lastMessage.content);
    }
  }, [messages, voiceEnabled, isStreaming, speak, setSpeaking]);

  const handleMicToggle = useCallback(() => {
    if (isListening) {
      setListening(false);
    } else {
      // Stop any ongoing speech first
      if (isSpeaking) {
        stopSpeaking();
        setSpeaking(false);
      }
      setListening(true);
    }
  }, [isListening, isSpeaking, setListening, setSpeaking, stopSpeaking]);

  const handleStopSpeaking = useCallback(() => {
    stopSpeaking();
    setSpeaking(false);
  }, [stopSpeaking, setSpeaking]);

  const lastAssistantMessage = messages.filter((m) => m.role === 'assistant').pop();

  return (
    <div className="flex h-full flex-col items-center justify-center px-4 py-8">
      {/* Large Mic Button */}
      <button
        onClick={handleMicToggle}
        disabled={!sttSupported || isStreaming}
        className={cn(
          'relative mb-6 flex h-24 w-24 items-center justify-center rounded-full transition-all',
          isListening
            ? 'animate-pulse-glow bg-destructive text-destructive-foreground'
            : 'bg-gradient-to-br from-qualia-500 to-qualia-700 text-white hover:shadow-glow',
          'disabled:cursor-not-allowed disabled:opacity-50'
        )}
      >
        {isStreaming ? (
          <Loader2 className="h-10 w-10 animate-spin" />
        ) : isListening ? (
          <MicOff className="h-10 w-10" />
        ) : (
          <Mic className="h-10 w-10" />
        )}

        {/* Listening indicator ring */}
        {isListening && (
          <span className="absolute inset-0 animate-ping rounded-full bg-destructive/50" />
        )}
      </button>

      {/* Status Text */}
      <p className="mb-4 text-sm font-medium text-foreground">
        {isStreaming
          ? 'Processing...'
          : isListening
            ? 'Listening...'
            : isSpeaking
              ? 'Speaking...'
              : 'Tap to speak'}
      </p>

      {/* Transcript */}
      {transcript && isListening && (
        <div className="mb-4 rounded-lg bg-secondary px-4 py-2 text-sm text-foreground">
          {transcript}
        </div>
      )}

      {/* Last Response */}
      {lastAssistantMessage && !isListening && (
        <div className="w-full max-w-sm">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Last response
          </p>
          <div className="max-h-32 overflow-y-auto rounded-lg bg-secondary/50 p-3 text-xs text-foreground">
            {lastAssistantMessage.content.slice(0, 200)}
            {lastAssistantMessage.content.length > 200 && '...'}
          </div>
        </div>
      )}

      {/* Voice Controls */}
      <div className="mt-6 flex items-center gap-3">
        {/* TTS Toggle */}
        <button
          onClick={toggleVoice}
          disabled={!ttsSupported}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition-colors',
            voiceEnabled
              ? 'bg-primary/10 text-primary'
              : 'bg-secondary text-muted-foreground hover:text-foreground',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
        >
          {voiceEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          {voiceEnabled ? 'Voice On' : 'Voice Off'}
        </button>

        {/* Stop Speaking */}
        {(isSpeaking || ttsLoading) && (
          <button
            onClick={handleStopSpeaking}
            className="flex items-center gap-1.5 rounded-md bg-destructive/10 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/20"
          >
            <VolumeX className="h-3.5 w-3.5" />
            Stop
          </button>
        )}
      </div>

      {/* Browser Support Warning */}
      {!sttSupported && (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Voice input not supported in this browser. Try Chrome or Edge.
        </p>
      )}
    </div>
  );
}
