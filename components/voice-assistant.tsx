'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { useVoiceSynthesis } from '@/hooks/use-voice-synthesis';
import { Mic, MicOff, Volume2, VolumeX, Loader2, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { UserContext } from '@/lib/voice-assistant-intelligence';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface VoiceAssistantProps {
  className?: string;
  userContext?: UserContext;
  onClose?: () => void;
  inline?: boolean;
}

export function VoiceAssistant({
  className,
  userContext,
  onClose,
  inline = false,
}: VoiceAssistantProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Message[]>([]);
  const [lastResponse, setLastResponse] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [autoListen, setAutoListen] = useState(true);
  const processingRef = useRef(false);

  // Speech recognition hook
  const {
    isListening,
    isSupported: sttSupported,
    transcript,
    startListening,
    stopListening,
  } = useSpeechRecognition({
    continuous: false,
    interimResults: true,
    language: 'ar-JO', // Jordanian Arabic with fallback to English
    onResult: handleSpeechResult,
    onError: (err) => {
      console.error('Speech recognition error:', err);
      setError(`Microphone error: ${err}`);
    },
  });

  // Voice synthesis hook
  const {
    isSpeaking,
    isSupported: ttsSupported,
    isLoading: ttsLoading,
    speak,
    stop: stopSpeaking,
  } = useVoiceSynthesis({
    rate: 1.0,
    pitch: 1.0,
    onEnd: () => {
      // Auto-restart listening after response if enabled
      if (autoListen && !processingRef.current) {
        setTimeout(() => {
          if (!processingRef.current) {
            startListening();
          }
        }, 500);
      }
    },
    onError: (err) => {
      console.error('TTS error:', err);
    },
  });

  // Handle final speech result
  async function handleSpeechResult(text: string, isFinal: boolean) {
    if (!isFinal || !text.trim() || processingRef.current) return;

    processingRef.current = true;
    stopListening();
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: text,
          conversationHistory,
          userContext,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process voice request');
      }

      // Update conversation history
      setConversationHistory((prev) => [
        ...prev,
        { role: 'user', content: text },
        { role: 'assistant', content: data.text },
      ]);

      setLastResponse(data.text);

      // Speak the response
      await speak(data.text);
    } catch (err) {
      console.error('Voice processing error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong';
      setError(errorMessage);
      await speak('Sorry, something went wrong. Please try again.');
    } finally {
      setIsProcessing(false);
      processingRef.current = false;
    }
  }

  // Toggle microphone
  const handleMicToggle = useCallback(() => {
    if (isSpeaking) {
      stopSpeaking();
    }

    if (isListening) {
      stopListening();
    } else {
      setError(null);
      startListening();
    }
  }, [isListening, isSpeaking, startListening, stopListening, stopSpeaking]);

  // Toggle auto-listen mode
  const handleAutoListenToggle = useCallback(() => {
    setAutoListen((prev) => !prev);
  }, []);

  // Stop everything
  const handleStop = useCallback(() => {
    stopSpeaking();
    stopListening();
    setIsProcessing(false);
    processingRef.current = false;
  }, [stopSpeaking, stopListening]);

  // Clear conversation
  const handleClear = useCallback(() => {
    setConversationHistory([]);
    setLastResponse('');
    setError(null);
  }, []);

  // Keyboard shortcut for mic
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.ctrlKey) {
        e.preventDefault();
        handleMicToggle();
      }
      if (e.code === 'Escape' && onClose) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleMicToggle, onClose]);

  // Determine current status
  const getStatus = () => {
    if (isProcessing) return { text: 'Processing...', color: 'text-yellow-500' };
    if (isSpeaking) return { text: 'Speaking...', color: 'text-green-500' };
    if (isListening) return { text: 'Listening...', color: 'text-blue-500' };
    return { text: 'Click mic to start', color: 'text-muted-foreground' };
  };

  const status = getStatus();

  // Check browser support
  if (!sttSupported && !ttsSupported) {
    return (
      <div className={cn('flex flex-col items-center gap-4 p-6', className)}>
        <p className="text-center text-muted-foreground">
          Voice features are not supported in this browser.
          <br />
          Please use Chrome or Edge.
        </p>
      </div>
    );
  }

  // Inline compact version
  if (inline) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Button
          size="sm"
          variant={isListening ? 'destructive' : 'outline'}
          onClick={handleMicToggle}
          disabled={isProcessing}
          className="h-8 w-8 rounded-full p-0"
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isListening ? (
            <MicOff className="h-4 w-4" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </Button>
        {transcript && isListening && (
          <span className="max-w-[200px] truncate text-sm text-muted-foreground">{transcript}</span>
        )}
      </div>
    );
  }

  // Full voice assistant view
  return (
    <div className={cn('flex flex-col items-center gap-6 rounded-xl bg-background p-8', className)}>
      {/* Close button */}
      {onClose && (
        <Button variant="ghost" size="icon" className="absolute right-4 top-4" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      )}

      {/* Animated visualization */}
      <div className="relative flex h-40 w-40 items-center justify-center">
        {/* Pulse rings */}
        {(isListening || isSpeaking) && (
          <>
            <div
              className={cn(
                'absolute h-full w-full animate-ping rounded-full opacity-20',
                isListening ? 'bg-blue-500' : 'bg-green-500'
              )}
              style={{ animationDuration: '1.5s' }}
            />
            <div
              className={cn(
                'absolute h-[80%] w-[80%] animate-ping rounded-full opacity-30',
                isListening ? 'bg-blue-500' : 'bg-green-500'
              )}
              style={{ animationDuration: '2s', animationDelay: '0.2s' }}
            />
          </>
        )}

        {/* Main button */}
        <Button
          size="lg"
          variant={isListening ? 'destructive' : 'default'}
          className={cn(
            'relative z-10 h-24 w-24 rounded-full shadow-lg transition-all',
            isProcessing && 'bg-yellow-500 hover:bg-yellow-600',
            isSpeaking && 'bg-green-500 hover:bg-green-600'
          )}
          onClick={handleMicToggle}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <Loader2 className="h-10 w-10 animate-spin" />
          ) : ttsLoading ? (
            <Loader2 className="h-10 w-10 animate-spin" />
          ) : isSpeaking ? (
            <Volume2 className="h-10 w-10 animate-pulse" />
          ) : isListening ? (
            <MicOff className="h-10 w-10" />
          ) : (
            <Mic className="h-10 w-10" />
          )}
        </Button>
      </div>

      {/* Status text */}
      <div className="flex flex-col items-center gap-2">
        <p className={cn('text-sm font-medium', status.color)}>{status.text}</p>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>

      {/* Live transcript */}
      {transcript && isListening && (
        <div className="w-full max-w-md rounded-lg bg-muted/50 p-3">
          <p className="text-center text-sm italic text-muted-foreground">{transcript}</p>
        </div>
      )}

      {/* Last response */}
      {lastResponse && !isListening && (
        <div className="w-full max-w-md rounded-lg border bg-card p-4">
          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3" />
            <span>Qualia</span>
          </div>
          <p className="text-sm">{lastResponse}</p>
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleAutoListenToggle} className="gap-2">
          {autoListen ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          Auto-listen: {autoListen ? 'On' : 'Off'}
        </Button>
        {(isSpeaking || isListening || isProcessing) && (
          <Button variant="outline" size="sm" onClick={handleStop}>
            Stop
          </Button>
        )}
        {conversationHistory.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleClear}>
            Clear
          </Button>
        )}
      </div>

      {/* Keyboard shortcut hint */}
      <p className="text-xs text-muted-foreground">
        Press <kbd className="rounded bg-muted px-1">Ctrl</kbd> +{' '}
        <kbd className="rounded bg-muted px-1">Space</kbd> to toggle mic
      </p>
    </div>
  );
}
