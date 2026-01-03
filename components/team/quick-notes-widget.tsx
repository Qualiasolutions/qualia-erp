'use client';

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { StickyNote, Save, Loader2 } from 'lucide-react';
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

  // Auto-save on change (debounced)
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
    <div className={cn('rounded-lg border border-border bg-card', className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Quick Notes</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {isSaving ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Saving...</span>
            </>
          ) : lastSaved ? (
            <>
              <Save className="h-3 w-3" />
              <span>Saved {formatLastSaved()}</span>
            </>
          ) : null}
        </div>
      </div>

      {/* Notes textarea */}
      <div className="p-4">
        <textarea
          value={notes}
          onChange={handleChange}
          placeholder="Jot down notes, ideas, or reminders for today..."
          className={cn(
            'h-32 w-full resize-none rounded-md border-0 bg-transparent p-0',
            'text-sm placeholder:text-muted-foreground/50',
            'focus:outline-none focus:ring-0'
          )}
        />
      </div>

      {/* Footer with tips */}
      <div className="border-t border-border px-4 py-2">
        <p className="text-xs text-muted-foreground/60">
          Notes are saved automatically and reset daily
        </p>
      </div>
    </div>
  );
}
