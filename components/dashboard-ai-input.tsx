'use client';

import { useState, useRef } from 'react';
import { Search, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DashboardAIInput() {
  const [input, setInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Trigger the AI chat widget with ⌘J and pre-fill the query
    // For now, dispatch a custom event that the widget can listen to
    const event = new CustomEvent('openAIChat', { detail: { query: input } });
    window.dispatchEvent(event);
    setInput('');
  };

  return (
    <form onSubmit={handleSubmit}>
      <div
        className={cn(
          'flex items-center gap-3 rounded-xl border bg-card px-4 py-3.5 transition-all',
          isFocused ? 'border-primary/50 ring-2 ring-primary/20' : 'border-border'
        )}
      >
        <Search className="h-5 w-5 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Ask anything..."
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-lg transition-all',
            input.trim()
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'text-muted-foreground'
          )}
        >
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}
