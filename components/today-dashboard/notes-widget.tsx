'use client';

import React, { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { EmptyState } from '@/components/ui/empty-state';
import { StickyNote, FolderOpen, Send, Users, Trash2, Edit2, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  createProjectNote,
  deleteProjectNote,
  updateProjectNote,
  type DashboardNote,
} from '@/app/actions/pipeline';
import { m, AnimatePresence } from '@/lib/lazy-motion';

interface Project {
  id: string;
  name: string;
}

interface NotesWidgetProps {
  notes: DashboardNote[];
  projects: Project[];
  teamMembers: Array<{
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  }>;
  workspaceId: string;
}

// User colors for team members
const USER_COLORS = [
  { text: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-500' },
  { text: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500' },
  { text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500' },
  { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500' },
];

// Single Note Item
const NoteItem = React.memo(function NoteItem({
  note,
  onDelete,
  onEdit,
  isPending,
  userColorMap,
}: {
  note: DashboardNote;
  onDelete: (noteId: string) => void;
  onEdit: (noteId: string, content: string) => void;
  isPending: boolean;
  userColorMap: Map<string, { text: string; bg: string }>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(note.content);
  // For now, show actions on all notes (server-side will validate ownership)
  const isOwner = true;

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== note.content) {
      onEdit(note.id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(note.content);
    setIsEditing(false);
  };

  return (
    <m.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={cn(
        'group relative rounded-xl px-3 py-3 transition-all duration-200',
        'hover:bg-muted/50'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Author avatar */}
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={note.profile?.avatar_url || undefined} />
          <AvatarFallback className="text-xs">{note.profile?.full_name?.[0] || '?'}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          {/* Author name and time */}
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-sm font-medium',
                userColorMap.get(note.user_id)?.text || 'text-foreground'
              )}
            >
              {note.profile?.full_name || 'Unknown'}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
            </span>
          </div>

          {/* Note content */}
          {isEditing ? (
            <div className="mt-2 flex items-center gap-2">
              <Input
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="flex-1"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveEdit();
                  if (e.key === 'Escape') handleCancelEdit();
                }}
              />
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSaveEdit}>
                <Check className="h-4 w-4 text-green-500" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancelEdit}>
                <X className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          ) : (
            <p className="mt-1 text-sm leading-relaxed text-foreground/90">{note.content}</p>
          )}

          {/* Project badge */}
          {note.project && (
            <div className="mt-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <FolderOpen className="h-3 w-3" />
                {note.project.name}
              </span>
            </div>
          )}
        </div>

        {/* Actions - only visible on hover for note owner */}
        {isOwner && !isEditing && (
          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-lg hover:bg-background"
                    onClick={() => setIsEditing(true)}
                    disabled={isPending}
                  >
                    <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>Edit note</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-lg hover:bg-background hover:text-red-500"
                    onClick={() => onDelete(note.id)}
                    disabled={isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>Delete note</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>
    </m.div>
  );
});

export function NotesWidget({ notes, projects, teamMembers, workspaceId }: NotesWidgetProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [filterUserId, setFilterUserId] = useState<string | null>(null);

  // Create color map for each team member
  const userColorMap = React.useMemo(() => {
    const map = new Map<string, { text: string; bg: string }>();
    teamMembers.forEach((member, index) => {
      map.set(member.id, USER_COLORS[index % USER_COLORS.length]);
    });
    return map;
  }, [teamMembers]);

  // Filter notes by selected user
  const visibleNotes = filterUserId ? notes.filter((n) => n.user_id === filterUserId) : notes;

  const handleCreateNote = () => {
    if (!newNoteContent.trim() || !selectedProjectId) return;

    startTransition(async () => {
      const result = await createProjectNote(selectedProjectId, workspaceId, newNoteContent.trim());
      if (result.success) {
        setNewNoteContent('');
        router.refresh();
      }
    });
  };

  const handleDeleteNote = (noteId: string) => {
    startTransition(async () => {
      await deleteProjectNote(noteId);
      router.refresh();
    });
  };

  const handleEditNote = (noteId: string, content: string) => {
    startTransition(async () => {
      await updateProjectNote(noteId, content);
      router.refresh();
    });
  };

  return (
    <div
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card',
        isPending && 'pointer-events-none opacity-70'
      )}
    >
      {/* Header */}
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <StickyNote className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Project Notes</h3>
              <p className="text-xs text-muted-foreground">{notes.length} notes across projects</p>
            </div>
          </div>
          <Badge
            variant="outline"
            className="gap-1.5 border-primary/30 bg-primary/5 font-normal text-primary"
          >
            <StickyNote className="h-3 w-3" />
            {visibleNotes.length} shown
          </Badge>
        </div>

        {/* User filter pills */}
        <div className="mt-4 flex items-center gap-2">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <div className="flex flex-wrap gap-1.5">
            <Button
              variant={filterUserId === null ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 rounded-lg px-2.5 text-xs"
              onClick={() => setFilterUserId(null)}
            >
              All
            </Button>
            {teamMembers.map((member) => {
              const color = userColorMap.get(member.id);
              return (
                <Button
                  key={member.id}
                  variant={filterUserId === member.id ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 gap-1.5 rounded-lg px-2.5 text-xs"
                  onClick={() => setFilterUserId(member.id)}
                >
                  <span className={cn('h-2 w-2 rounded-full', color?.bg)} />
                  {member.full_name?.split(' ')[0] || 'Unknown'}
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {visibleNotes.length === 0 ? (
          <div className="flex h-full items-center justify-center px-2 py-4">
            <EmptyState
              icon={StickyNote}
              title={filterUserId ? 'No notes from this person' : 'No notes yet'}
              description={
                filterUserId
                  ? 'Switch to All or select a project below to write one'
                  : 'Pick a project below and capture what matters'
              }
              compact
            />
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {visibleNotes.map((note) => (
              <NoteItem
                key={note.id}
                note={note}
                onDelete={handleDeleteNote}
                onEdit={handleEditNote}
                isPending={isPending}
                userColorMap={userColorMap}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Add Note Form */}
      <div className="border-t border-border p-4">
        <div className="flex gap-2">
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Write a note..."
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleCreateNote();
              }
            }}
          />
          <Button
            size="icon"
            onClick={handleCreateNote}
            disabled={!newNoteContent.trim() || !selectedProjectId || isPending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
