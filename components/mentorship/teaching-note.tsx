'use client';

import { useState } from 'react';
import { Lightbulb, BookOpen, Link, AlertTriangle, Heart, Pin, Trash2, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { TEACHING_NOTE_COLORS } from '@/lib/color-constants';
import { createTeachingNote, deleteTeachingNote } from '@/app/actions/learning';
import type { TeachingNote, TeachingNoteType, Profile } from '@/types/database';

const NOTE_ICONS = {
  hint: Lightbulb,
  explanation: BookOpen,
  resource: Link,
  warning: AlertTriangle,
  encouragement: Heart,
} as const;

interface TeachingNoteCardProps {
  note: TeachingNote & { mentor?: Profile };
  onDelete?: () => void;
  canDelete?: boolean;
}

export function TeachingNoteCard({ note, onDelete, canDelete }: TeachingNoteCardProps) {
  const config = TEACHING_NOTE_COLORS[note.note_type as keyof typeof TEACHING_NOTE_COLORS];
  const Icon = NOTE_ICONS[note.note_type as keyof typeof NOTE_ICONS];
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    await deleteTeachingNote(note.id);
    setDeleting(false);
    onDelete?.();
  };

  return (
    <Card className={cn('border-l-4', config.bg, config.border)}>
      <CardHeader className="flex flex-row items-center gap-2 px-3 py-2">
        <Icon className={cn('h-4 w-4', config.text)} />
        <span className={cn('text-xs font-medium uppercase tracking-wide', config.text)}>
          {config.label}
        </span>
        {note.is_pinned && <Pin className="h-3 w-3 text-muted-foreground" />}
        {note.mentor && (
          <span className="ml-auto text-xs text-muted-foreground">
            from {note.mentor.full_name || 'Mentor'}
          </span>
        )}
        {canDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="ml-2 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={handleDelete}
            disabled={deleting}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="px-3 py-2 text-sm">{note.content}</CardContent>
    </Card>
  );
}

interface TeachingNotesPanelProps {
  notes: (TeachingNote & { mentor?: Profile })[];
  issueId?: string;
  phaseItemId?: string;
  isMentor?: boolean;
  onNotesChange?: () => void;
}

export function TeachingNotesPanel({
  notes,
  issueId,
  phaseItemId,
  isMentor,
  onNotesChange,
}: TeachingNotesPanelProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);

  if (notes.length === 0 && !isMentor) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Lightbulb className="h-4 w-4" />
          Learning Notes
        </h4>
        {isMentor && (
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 gap-1">
                <Plus className="h-3 w-3" />
                Add Note
              </Button>
            </DialogTrigger>
            <DialogContent className="border-border bg-card">
              <DialogHeader>
                <DialogTitle>Add Teaching Note</DialogTitle>
              </DialogHeader>
              <AddTeachingNoteForm
                issueId={issueId}
                phaseItemId={phaseItemId}
                onSuccess={() => {
                  setShowAddDialog(false);
                  onNotesChange?.();
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
      <div className="space-y-2">
        {notes.map((note) => (
          <TeachingNoteCard
            key={note.id}
            note={note}
            canDelete={isMentor}
            onDelete={onNotesChange}
          />
        ))}
      </div>
    </div>
  );
}

interface AddTeachingNoteFormProps {
  issueId?: string;
  phaseItemId?: string;
  onSuccess?: () => void;
}

function AddTeachingNoteForm({ issueId, phaseItemId, onSuccess }: AddTeachingNoteFormProps) {
  const [noteType, setNoteType] = useState<TeachingNoteType>('hint');
  const [content, setContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setLoading(true);
    await createTeachingNote(noteType, content, issueId, phaseItemId, isPinned);
    setLoading(false);
    onSuccess?.();
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Note Type</label>
        <Select value={noteType} onValueChange={(v) => setNoteType(v as TeachingNoteType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(TEACHING_NOTE_COLORS) as TeachingNoteType[]).map((type) => {
              const config = TEACHING_NOTE_COLORS[type as keyof typeof TEACHING_NOTE_COLORS];
              const Icon = NOTE_ICONS[type as keyof typeof NOTE_ICONS];
              return (
                <SelectItem key={type} value={type}>
                  <div className="flex items-center gap-2">
                    <Icon className={cn('h-4 w-4', config.text)} />
                    <span>{config.label}</span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Content</label>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your teaching note..."
          className="min-h-[100px]"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="pin-note"
          checked={isPinned}
          onChange={(e) => setIsPinned(e.target.checked)}
          className="rounded"
        />
        <label htmlFor="pin-note" className="text-sm text-muted-foreground">
          Pin this note (shows at top)
        </label>
      </div>

      <Button onClick={handleSubmit} disabled={loading || !content.trim()} className="w-full">
        {loading ? 'Adding...' : 'Add Note'}
      </Button>
    </div>
  );
}
