'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { MessageSquare, Send, Trash2, Edit2, X, Check, Pin } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  createDashboardNote,
  updateDashboardNote,
  deleteDashboardNote,
  togglePinNote,
  type DashboardNote,
} from '@/app/actions/dashboard-notes';
import { motion, AnimatePresence } from 'framer-motion';

interface AdminNotesWidgetProps {
  notes: DashboardNote[];
  isManagerOrAbove: boolean;
  fullHeight?: boolean;
}

const NoteItem = React.memo(function NoteItem({
  note,
  isManagerOrAbove,
  isPending,
  onEdit,
  onDelete,
  onPin,
}: {
  note: DashboardNote;
  isManagerOrAbove: boolean;
  isPending: boolean;
  onEdit: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onPin: (id: string, pinned: boolean) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(note.content);

  const save = () => {
    if (editValue.trim() && editValue !== note.content) {
      onEdit(note.id, editValue.trim());
    }
    setEditing(false);
  };

  const cancel = () => {
    setEditValue(note.content);
    setEditing(false);
  };

  const initial = (note.author?.full_name || '?')[0].toUpperCase();
  const isAdmin = note.author?.role === 'admin';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16 }}
      className={cn(
        'group relative rounded-xl px-4 py-3 transition-colors',
        note.pinned ? 'border border-amber-500/15 bg-amber-500/[0.03]' : 'hover:bg-muted/40'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
            isAdmin
              ? 'bg-amber-500/12 text-amber-600 dark:text-amber-400'
              : 'bg-blue-500/12 text-blue-600 dark:text-blue-400'
          )}
        >
          {initial}
        </div>

        <div className="min-w-0 flex-1">
          {/* Author + time */}
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-foreground">
              {note.author?.full_name || 'Unknown'}
            </span>
            {isAdmin && (
              <span className="rounded-full bg-amber-500/10 px-1.5 py-px text-[10px] font-medium text-amber-600 dark:text-amber-400">
                Owner
              </span>
            )}
            {note.author?.role === 'manager' && (
              <span className="rounded-full bg-blue-500/10 px-1.5 py-px text-[10px] font-medium text-blue-600 dark:text-blue-400">
                Manager
              </span>
            )}
            <span className="text-[11px] text-muted-foreground/50">
              {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
            </span>
            {note.pinned && <Pin className="h-3 w-3 text-amber-500" />}
          </div>

          {/* Content */}
          {editing ? (
            <div className="mt-2 flex items-center gap-1.5">
              <input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') save();
                  if (e.key === 'Escape') cancel();
                }}
              />
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={save}>
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancel}>
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>
          ) : (
            <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-foreground/85">
              {note.content}
            </p>
          )}
        </div>

        {/* Actions (hover) */}
        {isManagerOrAbove && !editing && (
          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onPin(note.id, !note.pinned)}
              disabled={isPending}
              title={note.pinned ? 'Unpin' : 'Pin'}
            >
              <Pin
                className={cn(
                  'h-3.5 w-3.5',
                  note.pinned ? 'text-amber-500' : 'text-muted-foreground'
                )}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setEditing(true)}
              disabled={isPending}
            >
              <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:text-destructive"
              onClick={() => onDelete(note.id)}
              disabled={isPending}
            >
              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
});

export function AdminNotesWidget({ notes, isManagerOrAbove, fullHeight }: AdminNotesWidgetProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [newNote, setNewNote] = useState('');

  const handleCreate = () => {
    if (!newNote.trim()) return;
    startTransition(async () => {
      const result = await createDashboardNote(newNote);
      if (result.success) {
        setNewNote('');
        router.refresh();
      }
    });
  };

  const handleEdit = (id: string, content: string) => {
    startTransition(async () => {
      await updateDashboardNote(id, content);
      router.refresh();
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteDashboardNote(id);
      router.refresh();
    });
  };

  const handlePin = (id: string, pinned: boolean) => {
    startTransition(async () => {
      await togglePinNote(id, pinned);
      router.refresh();
    });
  };

  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden bg-card',
        fullHeight ? 'h-full' : 'rounded-2xl border border-border/50',
        isPending && 'pointer-events-none opacity-60'
      )}
    >
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border/40 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <MessageSquare className="h-3.5 w-3.5 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Team Notes</h3>
        </div>
        <span className="text-[11px] text-muted-foreground/50">{notes.length} notes</span>
      </div>

      {/* Notes list */}
      <div className={cn('flex-1 overflow-y-auto px-1 py-1', !fullHeight && 'max-h-[300px]')}>
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MessageSquare className="mb-2 h-6 w-6 text-muted-foreground/20" />
            <p className="text-xs text-muted-foreground/50">No notes yet</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {notes.map((note) => (
              <NoteItem
                key={note.id}
                note={note}
                isManagerOrAbove={isManagerOrAbove}
                isPending={isPending}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onPin={handlePin}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Compose (admin/manager only) */}
      {isManagerOrAbove && (
        <div className="border-t border-border/40 p-3">
          <div className="flex items-center gap-2">
            <input
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Leave a note for the team..."
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/40 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleCreate();
                }
              }}
            />
            <Button
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={handleCreate}
              disabled={!newNote.trim() || isPending}
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
