'use client';

import { useState, useEffect, useCallback } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { useVoiceSynthesis } from '@/hooks/use-voice-synthesis';
import { cn } from '@/lib/utils';

interface ChatVoiceProps {
  onTranscript: (text: string) => void;
  responseText?: string;
  isProcessing?: boolean;
  vibeVoiceUrl?: string;
}

export function ChatVoice({
  onTranscript,
  responseText,
  isProcessing,
  vibeVoiceUrl,
}: ChatVoiceProps) {
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [lastSpokenResponse, setLastSpokenResponse] = useState<string>('');

  const handleResult = useCallback(
    (text: string, isFinal: boolean) => {
      if (isFinal && text.trim()) {
        onTranscript(text.trim());
      }
    },
    [onTranscript]
  );

  const {
    isListening,
    isSupported: sttSupported,
    transcript,
    startListening,
    stopListening,
  } = useSpeechRecognition({
    continuous: true,
    interimResults: true,
    onResult: handleResult,
  });

  const {
    isSpeaking,
    isSupported: ttsSupported,
    isLoading: ttsLoading,
    speak,
    stop: stopSpeaking,
  } = useVoiceSynthesis({
    vibeVoiceUrl,
    fallbackToBrowser: true,
  });

  // Auto-speak AI responses when voice mode is enabled
  useEffect(() => {
    if (voiceEnabled && responseText && !isProcessing && responseText !== lastSpokenResponse) {
      setLastSpokenResponse(responseText);
      speak(responseText);
    }
  }, [responseText, isProcessing, voiceEnabled, speak, lastSpokenResponse]);

  // Stop speaking when user starts listening
  useEffect(() => {
    if (isListening && isSpeaking) {
      stopSpeaking();
    }
  }, [isListening, isSpeaking, stopSpeaking]);

  const handleMicClick = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      // Stop any ongoing speech before listening
      if (isSpeaking) {
        stopSpeaking();
      }
      startListening();
    }
  }, [isListening, isSpeaking, startListening, stopListening, stopSpeaking]);

  const handleVoiceToggle = useCallback(() => {
    if (isSpeaking) {
      stopSpeaking();
    }
    setVoiceEnabled((prev) => !prev);
  }, [isSpeaking, stopSpeaking]);

  // Don't render if neither STT nor TTS is supported
  if (!sttSupported && !ttsSupported) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        {/* Microphone button (STT) */}
        {sttSupported && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleMicClick}
                disabled={isProcessing}
                className={cn(
                  'h-8 w-8 transition-all',
                  isListening && 'animate-pulse bg-red-500/10 text-red-500'
                )}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {isListening ? 'Stop listening' : 'Start voice input'}
            </TooltipContent>
          </Tooltip>
        )}

        {/* Voice output toggle (TTS) */}
        {ttsSupported && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleVoiceToggle}
                className={cn(
                  'h-8 w-8 transition-all',
                  voiceEnabled && 'text-primary',
                  isSpeaking && 'bg-primary/10'
                )}
              >
                {ttsLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isSpeaking ? (
                  <Volume2 className="h-4 w-4 animate-pulse" />
                ) : voiceEnabled ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {isSpeaking
                ? 'Speaking...'
                : voiceEnabled
                  ? 'Voice output on (click to disable)'
                  : 'Enable voice output'}
            </TooltipContent>
          </Tooltip>
        )}

        {/* Transcript preview */}
        {isListening && transcript && (
          <div className="ml-2 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            <span className="max-w-[150px] truncate">{transcript}</span>
          </div>
        )}

        {/* Not supported warning */}
        {!sttSupported && !ttsSupported && (
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>Voice features require Chrome or Edge browser</TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
