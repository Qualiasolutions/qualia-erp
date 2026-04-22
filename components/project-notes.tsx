'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Send, Trash2, Edit2, Check, X, MessageSquare } from 'lucide-react';
import { formatTimeAgo, getInitials, cn } from '@/lib/utils';
import {
  getProjectNotes,
  createProjectNote,
  updateProjectNote,
  deleteProjectNote,
  type ProjectNote,
} from '@/app/actions/pipeline';
import { m, AnimatePresence } from '@/lib/lazy-motion';
import { RichText } from '@/components/ui/rich-text';

interface ProjectNotesProps {
  projectId: string;
  workspaceId: string;
  className?: string;
}

export function ProjectNotes({ projectId, workspaceId, className }: ProjectNotesProps) {
  const [notes, setNotes] = useState<ProjectNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const supabase = createClient();

  const fetchNotes = useCallback(async () => {
    try {
      const data = await getProjectNotes(projectId);
      setNotes(data);
    } catch {
      // Notes fetch failed silently — not critical
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const getUser = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  }, [supabase]);

  useEffect(() => {
    fetchNotes();
    getUser();
  }, [fetchNotes, getUser]);

  const handleSubmit = () => {
    if (!newNote.trim()) return;

    startTransition(async () => {
      const result = await createProjectNote(projectId, workspaceId, newNote.trim());
      if (result.success) {
        setNewNote('');
        fetchNotes();
      }
    });
  };

  const handleUpdate = (noteId: string) => {
    if (!editContent.trim()) return;

    startTransition(async () => {
      const result = await updateProjectNote(noteId, editContent.trim());
      if (result.success) {
        setEditingId(null);
        setEditContent('');
        fetchNotes();
      }
    });
  };

  const handleDelete = (noteId: string) => {
    setShowDeleteConfirm(noteId);
  };

  const confirmDelete = () => {
    const noteId = showDeleteConfirm;
    if (!noteId) return;
    setShowDeleteConfirm(null);
    startTransition(async () => {
      const result = await deleteProjectNote(noteId);
      if (result.success) {
        fetchNotes();
      }
    });
  };

  const startEdit = (note: ProjectNote) => {
    setEditingId(note.id);
    setEditContent(note.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={cn('flex h-full flex-col rounded-xl border border-border bg-card', className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Notes</h3>
          <span className="text-xs text-muted-foreground">({notes.length})</span>
        </div>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MessageSquare className="mb-2 h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No notes yet</p>
            <p className="text-xs text-muted-foreground/70">Add a note to share with your team</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-3">
              {notes.map((note) => {
                const isOwner = currentUserId === note.user_id;
                const isEditing = editingId === note.id;

                return (
                  <m.div
                    key={note.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="group min-w-0 rounded-lg border border-border bg-card/50 p-3"
                  >
                    {/* Author */}
                    <div className="mb-2 flex items-center gap-2 overflow-hidden">
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarImage src={note.profile?.avatar_url || undefined} />
                        <AvatarFallback className="text-[11px]">
                          {getInitials(note.profile?.full_name || note.profile?.email)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate text-xs font-medium">
                        {note.profile?.full_name || note.profile?.email || 'Unknown'}
                      </span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {formatTimeAgo(note.created_at)}
                      </span>
                    </div>

                    {/* Content */}
                    {isEditing ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="min-h-[60px] resize-none text-sm"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="h-7 gap-1 text-xs"
                            onClick={() => handleUpdate(note.id)}
                            disabled={isPending}
                          >
                            <Check className="h-3 w-3" />
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 gap-1 text-xs"
                            onClick={cancelEdit}
                          >
                            <X className="h-3 w-3" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <RichText className="min-w-0 break-words text-foreground">
                          {note.content}
                        </RichText>

                        {/* Actions */}
                        {isOwner && (
                          <div className="mt-2 flex gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 min-h-[44px] gap-1 px-2 text-xs text-muted-foreground"
                              onClick={() => startEdit(note)}
                            >
                              <Edit2 className="h-3 w-3" />
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 min-h-[44px] gap-1 px-2 text-xs text-red-500"
                              onClick={() => handleDelete(note.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                              Delete
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </m.div>
                );
              })}
            </div>
          </AnimatePresence>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border p-3">
        <div className="flex gap-2">
          <Textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a note... (Cmd+Enter to send)"
            className="min-h-[60px] flex-1 resize-none text-sm"
          />
          <Button
            size="sm"
            className="h-auto self-end"
            onClick={handleSubmit}
            disabled={isPending || !newNote.trim()}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={!!showDeleteConfirm}
        onOpenChange={(open) => !open && setShowDeleteConfirm(null)}
        title="Delete this note?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
