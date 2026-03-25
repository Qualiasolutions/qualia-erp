'use client';

import { useState, useRef } from 'react';
import { Search, ArrowRight, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createGoogleMeetLink } from '@/lib/google-meet';

export function DashboardAIInput() {
  const [input, setInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Trigger the AI chat widget with custom event
    const event = new CustomEvent('openAIChat', { detail: { query: input } });
    window.dispatchEvent(event);
    setInput('');
  };

  const handleInstantMeeting = () => {
    const meetLink = createGoogleMeetLink();
    window.open(meetLink, '_blank');
  };

  return (
    <div className="flex w-full items-center gap-2 sm:gap-3">
      {/* AI Input */}
      <form onSubmit={handleSubmit} className="flex-1">
        <div
          className={cn(
            'flex items-center gap-2 rounded-xl border bg-card/90 px-3 py-2.5 backdrop-blur-sm transition-all sm:gap-3 sm:px-4 sm:py-3.5',
            isFocused
              ? 'border-primary/50 shadow-lg shadow-primary/10 ring-2 ring-primary/20'
              : 'border-border hover:border-border'
          )}
        >
          <Search className="h-4 w-4 shrink-0 text-muted-foreground sm:h-5 sm:w-5" />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Ask anything..."
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all sm:h-8 sm:w-8',
              input.trim()
                ? 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95'
                : 'text-muted-foreground'
            )}
          >
            <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
        </div>
      </form>

      {/* Instant Meet Button */}
      <button
        onClick={handleInstantMeeting}
        className={cn(
          'flex h-[42px] items-center gap-2 rounded-xl bg-emerald-500 px-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all sm:h-[50px] sm:gap-2.5 sm:px-4',
          'hover:bg-emerald-600 hover:shadow-emerald-500/30 active:scale-95'
        )}
        title="Start instant meeting"
      >
        <Video className="h-4 w-4 sm:h-5 sm:w-5" />
        <span className="hidden sm:inline">Meet</span>
      </button>
    </div>
  );
}
