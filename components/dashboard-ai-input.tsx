'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Send, Loader2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const SUGGESTIONS = [
  'What projects are overdue?',
  "Show me this week's meetings",
  'Which clients need follow-up?',
  'Summarize project progress',
];

export function DashboardAIInput() {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    setIsLoading(true);

    // For now, we'll open the AI assistant with the query
    // In a full implementation, this would trigger the AI chat
    // For demo, simulate a brief loading then redirect to relevant page

    const query = input.toLowerCase();

    setTimeout(() => {
      setIsLoading(false);
      setInput('');

      // Smart routing based on query
      if (query.includes('project')) {
        router.push('/projects');
      } else if (
        query.includes('meeting') ||
        query.includes('schedule') ||
        query.includes('calendar')
      ) {
        router.push('/schedule');
      } else if (query.includes('client') || query.includes('lead')) {
        router.push('/clients');
      } else if (query.includes('task') || query.includes('board')) {
        router.push('/board');
      } else {
        // Default: trigger the AI chat in sidebar
        // For now, just show projects
        router.push('/projects');
      }
    }, 500);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    inputRef.current?.focus();
  };

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex items-center gap-3 rounded-lg bg-secondary/50 px-4 py-3">
          <Sparkles
            className={cn(
              'h-5 w-5 transition-colors',
              isFocused ? 'text-primary' : 'text-muted-foreground'
            )}
          />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Ask me anything..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg transition-all',
              input.trim()
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </form>

      {/* Quick suggestions */}
      {!input && (
        <div className="flex flex-wrap justify-center gap-2">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-all hover:border-primary/30 hover:text-foreground"
            >
              {suggestion}
              <ArrowRight className="h-3 w-3" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
