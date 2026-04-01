'use client';

import { useState, useEffect, useCallback } from 'react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Send, Trash2, Edit2, Check, X, MessageSquare } from 'lucide-react';
import { formatTimeAgo, getInitials } from '@/lib/utils';
import { toast } from 'sonner';
import { useWorkspace } from '@/components/workspace-provider';
import { cn } from '@/lib/utils';
import { RichText } from '@/components/ui/rich-text';

interface Note {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  profile: {
    full_name: string | null;
    avatar_url: string | null;
    email: string | null;
  };
}

export function DashboardNotes({ workspaceId: propWorkspaceId }: { workspaceId?: string }) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = propWorkspaceId || currentWorkspace?.id;

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const supabase = createClient();

  const fetchNotes = useCallback(async () => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('workspace_notes')
        .select(
          `
          *,
          profile:profiles(full_name, avatar_url, email)
        `
        )
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) {
        // Check if table doesn't exist
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          console.warn('workspace_notes table does not exist. Please run the migration.');
          setNotes([]);
          return;
        }
        throw error;
      }

      // Transform data to handle array/object response
      const transformedNotes = (data || []).map((note) => ({
        ...note,
        profile: Array.isArray(note.profile) ? note.profile[0] : note.profile,
      }));

      setNotes(transformedNotes);
    } catch (error: unknown) {
      console.error('Error fetching notes:', error);
      toast.error('Error loading notes', {
        description: error instanceof Error ? error.message : 'Failed to load team notes.',
      });
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, supabase]);

  const getUser = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setCurrentUser(user?.id || null);
  }, [supabase]);

  useEffect(() => {
    fetchNotes();
    getUser();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('workspace_notes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workspace_notes',
          filter: workspaceId ? `workspace_id=eq.${workspaceId}` : undefined,
        },
        () => {
          fetchNotes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId, fetchNotes, getUser, supabase]);

  async function handleSubmit() {
    if (!newNote.trim()) {
      toast.error('Note is empty');
      return;
    }

    if (!workspaceId) {
      toast.error('Workspace not found');
      return;
    }

    if (!currentUser) {
      toast.error('Not authenticated');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('workspace_notes')
        .insert({
          content: newNote.trim(),
          workspace_id: workspaceId,
          user_id: currentUser,
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding note:', error);
        throw error;
      }

      setNewNote('');
      toast.success('Note added');

      // Optimistic update - add to local state immediately
      if (data) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url, email')
          .eq('id', currentUser)
          .single();

        const newNoteWithProfile: Note = {
          ...data,
          profile: profile || { full_name: null, avatar_url: null, email: null },
        };
        setNotes((prev) => [newNoteWithProfile, ...prev]);
      }

      // Also fetch to ensure consistency (realtime will handle updates)
      // Small delay to let the database catch up
      setTimeout(() => {
        fetchNotes();
      }, 500);
    } catch (error: unknown) {
      console.error('Error adding note:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error('Failed to add note', {
        description: errorMessage.includes('permission')
          ? "You don't have permission to post notes in this workspace."
          : errorMessage.includes('relation') || errorMessage.includes('does not exist')
            ? 'The notes feature is not set up yet. Please contact support.'
            : errorMessage,
      });
    } finally {
      setSubmitting(false);
    }
  }

  function handleDelete(id: string) {
    setShowDeleteConfirm(id);
  }

  async function confirmDelete() {
    const id = showDeleteConfirm;
    if (!id) return;
    setShowDeleteConfirm(null);

    try {
      const { error } = await supabase.from('workspace_notes').delete().eq('id', id);

      if (error) throw error;

      toast.success('Note deleted');
      fetchNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Failed to delete note');
    }
  }

  async function handleUpdate(id: string) {
    if (!editContent.trim()) return;

    try {
      const { error } = await supabase
        .from('workspace_notes')
        .update({ content: editContent.trim(), updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      setEditingId(null);
      toast.success('Note updated');
      fetchNotes();
    } catch (error) {
      console.error('Error updating note:', error);
      toast.error('Failed to update note');
    }
  }

  function startEdit(note: Note) {
    setEditingId(note.id);
    setEditContent(note.content);
  }

  // Shared header component for consistency
  const NotesHeader = () => (
    <CardHeader className="shrink-0 border-b border-border px-4 pb-3 pt-4 sm:px-5 sm:pb-4">
      <CardTitle className="flex items-center gap-2 text-sm font-semibold sm:gap-2.5 sm:text-base">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500 sm:h-8 sm:w-8">
          <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </div>
        <span className="truncate">Team Notes</span>
        {notes.length > 0 && (
          <span className="ml-auto shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-normal text-muted-foreground sm:px-2.5 sm:py-1 sm:text-xs">
            {notes.length}
          </span>
        )}
      </CardTitle>
    </CardHeader>
  );

  if (!workspaceId) {
    return (
      <Card className="flex h-full flex-col overflow-hidden border-border bg-card/80 shadow-md backdrop-blur-sm">
        <NotesHeader />
        <CardContent className="flex flex-1 items-center justify-center p-6">
          <div className="space-y-2 text-center text-sm text-muted-foreground">
            <p>Workspace not found.</p>
            <p className="text-xs">Please refresh the page.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="flex h-full flex-col overflow-hidden border-border bg-card/80 shadow-md backdrop-blur-sm">
        <NotesHeader />
        <CardContent className="flex flex-1 items-center justify-center p-6">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground sm:h-8 sm:w-8" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex h-full flex-col overflow-hidden border-border bg-card/80 shadow-md backdrop-blur-sm transition-shadow duration-300 hover:shadow-lg">
      <NotesHeader />

      <div className="flex min-h-0 flex-1 flex-col">
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-3 p-4 sm:space-y-4 sm:p-5">
            {notes.length === 0 ? (
              <div className="flex min-h-[120px] items-center justify-center py-8 text-center text-xs text-muted-foreground sm:min-h-[160px] sm:text-sm">
                No notes yet. Start the conversation!
              </div>
            ) : (
              notes.map((note) => (
                <div
                  key={note.id}
                  className={cn(
                    'group relative flex gap-2.5 rounded-xl border bg-card/50 p-3 shadow-sm transition-all sm:gap-3 sm:rounded-lg sm:p-4',
                    'active:bg-accent/50 sm:hover:shadow-md'
                  )}
                >
                  <Avatar className="h-8 w-8 shrink-0 sm:h-9 sm:w-9">
                    <AvatarImage src={note.profile?.avatar_url || ''} />
                    <AvatarFallback className="text-xs sm:text-sm">
                      {getInitials(note.profile?.full_name || note.profile?.email || '?')}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex items-start justify-between gap-2 sm:mb-2 sm:items-center">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="text-xs font-semibold sm:text-sm">
                          {note.profile?.full_name || 'Unknown User'}
                        </span>
                        <span className="text-[11px] text-muted-foreground sm:text-xs">
                          {formatTimeAgo(note.created_at)}
                        </span>
                      </div>

                      {currentUser === note.user_id && (
                        <div
                          className={cn(
                            'flex shrink-0 items-center gap-0.5 transition-opacity',
                            editingId === note.id
                              ? 'opacity-100'
                              : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100'
                          )}
                        >
                          {editingId === note.id ? (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-600 sm:h-7 sm:w-7"
                                onClick={() => handleUpdate(note.id)}
                              >
                                <Check className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground sm:h-7 sm:w-7"
                                onClick={() => setEditingId(null)}
                              >
                                <X className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground sm:h-7 sm:w-7"
                                onClick={() => startEdit(note)}
                              >
                                <Edit2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:bg-red-500/10 hover:text-red-500 sm:h-7 sm:w-7"
                                onClick={() => handleDelete(note.id)}
                              >
                                <Trash2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {editingId === note.id ? (
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="min-h-[60px] resize-none text-sm"
                        autoFocus
                      />
                    ) : (
                      <RichText className="break-words text-foreground [&_li]:text-xs [&_li]:sm:text-sm [&_p]:text-xs [&_p]:sm:text-sm">
                        {note.content}
                      </RichText>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Input section - fixed at bottom */}
        <div className="shrink-0 border-t border-border bg-muted/20 p-3 sm:p-4">
          <div className="flex gap-2 sm:gap-3">
            <Textarea
              placeholder="Type a note for the team..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="max-h-[100px] min-h-[44px] flex-1 resize-none text-sm sm:max-h-[120px]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
            <Button
              size="icon"
              className="h-11 w-11 shrink-0 sm:h-[44px] sm:w-[44px]"
              onClick={handleSubmit}
              disabled={submitting || !newNote.trim()}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin sm:h-5 sm:w-5" />
              ) : (
                <Send className="h-4 w-4 sm:h-5 sm:w-5" />
              )}
            </Button>
          </div>
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
    </Card>
  );
}
