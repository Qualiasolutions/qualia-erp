'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Mic, MicOff, PhoneOff, Loader2, Bell, BellOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import Vapi from '@vapi-ai/web';
import { useMeetingReminder, generateArabicReminder } from '@/hooks/use-meeting-reminder';

type CallState = 'idle' | 'connecting' | 'connected' | 'speaking' | 'listening';

// VAPI Assistant ID - connected to Qualia Voice Agent
const VAPI_ASSISTANT_ID = '67d7928b-e292-4f70-bca6-339f0b9eae50';

interface AIAssistantVoiceProps {
  userName?: string; // Current user's name for personalized reminders
}

export function AIAssistantVoice({ userName = 'Fawzi' }: AIAssistantVoiceProps) {
  const [callState, setCallState] = useState<CallState>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [assistantMessage, setAssistantMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [meetingRemindersEnabled, setMeetingRemindersEnabled] = useState(true);
  const [reminderNotification, setReminderNotification] = useState<string | null>(null);

  const vapiRef = useRef<Vapi | null>(null);
  const hasSpokenReminderRef = useRef<string | null>(null);

  // Meeting reminder hook
  const { upcomingMeeting, shouldRemind, dismissReminder } = useMeetingReminder({
    reminderMinutes: 30,
    enabled: meetingRemindersEnabled,
  });

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

  // Handle meeting reminders - auto-speak when meeting is upcoming
  useEffect(() => {
    if (
      !shouldRemind ||
      !upcomingMeeting ||
      !meetingRemindersEnabled ||
      hasSpokenReminderRef.current === upcomingMeeting.id
    ) {
      return;
    }

    // Generate Arabic reminder message
    const reminderMessage = generateArabicReminder(userName, upcomingMeeting);
    setReminderNotification(reminderMessage);

    // Auto-start call with reminder message
    const speakReminder = async () => {
      if (!vapiRef.current || callState !== 'idle') return;

      hasSpokenReminderRef.current = upcomingMeeting.id;

      try {
        // Start the call with a custom first message (the reminder)
        await vapiRef.current.start(VAPI_ASSISTANT_ID, {
          firstMessage: reminderMessage,
        });
      } catch (err) {
        console.error('Failed to speak reminder:', err);
        // Fall back to showing notification only
      }
    };

    // Small delay to ensure component is ready
    const timeout = setTimeout(speakReminder, 1000);
    return () => clearTimeout(timeout);
  }, [shouldRemind, upcomingMeeting, meetingRemindersEnabled, userName, callState]);

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
    setReminderNotification(null);

    try {
      // Use the hardcoded assistant ID or fall back to env var
      const assistantId = VAPI_ASSISTANT_ID || process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;

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
    setReminderNotification(null);
  }, []);

  const toggleMute = useCallback(() => {
    if (vapiRef.current) {
      const newMuted = !isMuted;
      vapiRef.current.setMuted(newMuted);
      setIsMuted(newMuted);
    }
  }, [isMuted]);

  const toggleMeetingReminders = useCallback(() => {
    setMeetingRemindersEnabled((prev) => !prev);
  }, []);

  const handleDismissReminder = useCallback(() => {
    setReminderNotification(null);
    dismissReminder();
  }, [dismissReminder]);

  const isInCall = callState !== 'idle' && callState !== 'connecting';

  return (
    <div className="flex h-full flex-col items-center justify-center px-4 py-8">
      {/* Meeting Reminder Notification */}
      {reminderNotification && !isInCall && (
        <div className="mb-4 w-full max-w-sm animate-pulse rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-amber-500" />
              <p className="text-xs font-medium text-amber-700 dark:text-amber-300" dir="rtl">
                {reminderNotification}
              </p>
            </div>
            <button
              onClick={handleDismissReminder}
              className="rounded p-1 text-amber-600 hover:bg-amber-500/20"
            >
              <BellOff className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* Upcoming Meeting Badge */}
      {upcomingMeeting && !reminderNotification && (
        <div className="mb-4 rounded-full bg-primary/10 px-3 py-1">
          <p className="text-xs text-primary">
            Meeting in {upcomingMeeting.minutesUntil} min:{' '}
            {upcomingMeeting.client?.display_name || upcomingMeeting.title}
          </p>
        </div>
      )}

      {/* Large Mic Button with volume rings */}
      <div className="relative mb-6">
        {/* Volume rings when in call */}
        {isInCall && (
          <>
            <div
              className={cn(
                'absolute -inset-4 rounded-full transition-all duration-300',
                callState === 'speaking' && 'bg-primary/30',
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
                callState === 'speaking' && 'bg-primary/20',
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
            <div className="absolute -inset-4 animate-ping rounded-full bg-primary/30" />
            <div className="absolute -inset-8 animate-ping rounded-full bg-primary/20 [animation-delay:150ms]" />
          </>
        )}

        <button
          onClick={isInCall ? endCall : startCall}
          disabled={callState === 'connecting'}
          className={cn(
            'relative flex h-24 w-24 items-center justify-center rounded-full transition-all',
            callState === 'idle' &&
              'bg-gradient-to-br from-qualia-500 to-qualia-700 text-white hover:shadow-glow',
            callState === 'connecting' && 'bg-primary/50 text-white',
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

      {/* Control buttons when in call */}
      {isInCall && (
        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={toggleMute}
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-full transition-all',
              isMuted
                ? 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                : 'bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground'
            )}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
        </div>
      )}

      {/* Meeting reminder toggle */}
      {!isInCall && (
        <button
          onClick={toggleMeetingReminders}
          className={cn(
            'mt-4 flex items-center gap-2 rounded-full px-3 py-1.5 text-xs transition-all',
            meetingRemindersEnabled
              ? 'bg-primary/10 text-primary'
              : 'bg-muted text-muted-foreground'
          )}
          title={meetingRemindersEnabled ? 'Disable meeting reminders' : 'Enable meeting reminders'}
        >
          {meetingRemindersEnabled ? (
            <>
              <Bell className="h-3 w-3" />
              <span>Reminders On</span>
            </>
          ) : (
            <>
              <BellOff className="h-3 w-3" />
              <span>Reminders Off</span>
            </>
          )}
        </button>
      )}

      {/* Help text */}
      {meetingRemindersEnabled && (
        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          Meeting reminders enabled
        </p>
      )}
    </div>
  );
}
