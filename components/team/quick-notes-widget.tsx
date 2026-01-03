'use client';

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface QuickNotesWidgetProps {
  className?: string;
}

export function QuickNotesWidget({ className }: QuickNotesWidgetProps) {
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Load notes from localStorage on mount
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const stored = localStorage.getItem(`team-notes-${today}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setNotes(parsed.content || '');
        if (parsed.savedAt) {
          setLastSaved(new Date(parsed.savedAt));
        }
      } catch {
        setNotes(stored);
      }
    }
  }, []);

  // Save notes
  const saveNotes = useCallback((content: string) => {
    setIsSaving(true);
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();

    localStorage.setItem(
      `team-notes-${today}`,
      JSON.stringify({
        content,
        savedAt: now.toISOString(),
      })
    );

    setLastSaved(now);
    setIsSaving(false);
  }, []);

  // Debounced save
  useEffect(() => {
    const timer = setTimeout(() => {
      if (notes) {
        saveNotes(notes);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [notes, saveNotes]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
  };

  const formatLastSaved = () => {
    if (!lastSaved) return '';
    const now = new Date();
    const diff = now.getTime() - lastSaved.getTime();

    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={cn('rounded-lg border border-border/60 bg-card/50', className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
        <span className="text-sm font-medium text-foreground">Notes</span>
        <span className="text-xs text-muted-foreground/50">
          {isSaving ? 'Saving...' : lastSaved ? `Saved ${formatLastSaved()}` : ''}
        </span>
      </div>

      {/* Notes area */}
      <div className="p-4">
        <textarea
          value={notes}
          onChange={handleChange}
          placeholder="Notes, ideas, reminders..."
          className={cn(
            'h-40 w-full resize-none rounded-md border-0 bg-transparent p-0',
            'text-sm text-foreground/80 placeholder:text-muted-foreground/40',
            'focus:outline-none focus:ring-0'
          )}
        />
      </div>

      {/* Footer */}
      <div className="border-t border-border/40 px-4 py-2">
        <p className="text-[11px] text-muted-foreground/40">Auto-saved locally. Resets daily.</p>
      </div>
    </div>
  );
}
