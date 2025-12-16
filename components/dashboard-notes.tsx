'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Send, Trash2, Edit2, Check, X } from 'lucide-react';
import { formatTimeAgo, getInitials } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { useWorkspace } from '@/components/workspace-provider';

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
  const { toast } = useToast();
  const supabase = createClient();

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
  }, [workspaceId]);

  async function getUser() {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user?.id || null);
  }

  async function fetchNotes() {
    if (!workspaceId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('workspace_notes')
        .select(`
          *,
          profile:profiles(full_name, avatar_url, email)
        `)
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
      const transformedNotes = (data || []).map(note => ({
        ...note,
        profile: Array.isArray(note.profile) ? note.profile[0] : note.profile
      }));

      setNotes(transformedNotes);
    } catch (error: any) {
      console.error('Error fetching notes:', error);
      toast({
        variant: "destructive",
        title: "Error loading notes",
        description: error?.message || "Failed to load team notes.",
      });
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!newNote.trim()) {
      toast({
        variant: "destructive",
        title: "Note is empty",
        description: "Please type something before sending.",
      });
      return;
    }

    if (!workspaceId) {
      toast({
        variant: "destructive",
        title: "Workspace not found",
        description: "Please refresh the page and try again.",
      });
      return;
    }

    if (!currentUser) {
      toast({
        variant: "destructive",
        title: "Not authenticated",
        description: "Please log in to post notes.",
      });
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
      toast({
        title: "Note added",
        description: "Your note has been posted to the team board.",
      });
      
      // Optimistic update - add to local state immediately
      if (data) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url, email')
          .eq('id', currentUser)
          .single();
        
        const newNoteWithProfile: Note = {
          ...data,
          profile: profile || { full_name: null, avatar_url: null, email: null }
        };
        setNotes(prev => [newNoteWithProfile, ...prev]);
      }
      
      // Also fetch to ensure consistency (realtime will handle updates)
      // Small delay to let the database catch up
      setTimeout(() => {
        fetchNotes();
      }, 500);
    } catch (error: any) {
      console.error('Error adding note:', error);
      const errorMessage = error?.message || 'Unknown error occurred';
      toast({
        variant: "destructive",
        title: "Failed to add note",
        description: errorMessage.includes('permission') 
          ? "You don't have permission to post notes in this workspace."
          : errorMessage.includes('relation') || errorMessage.includes('does not exist')
          ? "The notes feature is not set up yet. Please contact support."
          : errorMessage,
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this note?')) return;
    
    try {
      const { error } = await supabase
        .from('workspace_notes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Note deleted",
      });
      fetchNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
      toast({
        variant: "destructive",
        title: "Failed to delete note",
      });
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
      toast({
        title: "Note updated",
      });
      fetchNotes();
    } catch (error) {
      console.error('Error updating note:', error);
      toast({
        variant: "destructive",
        title: "Failed to update note",
      });
    }
  }

  function startEdit(note: Note) {
    setEditingId(note.id);
    setEditContent(note.content);
  }

  if (!workspaceId) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Team Notes</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <div className="text-center text-muted-foreground text-sm">
            <p>Workspace not found.</p>
            <p className="text-xs mt-2">Please refresh the page.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Team Notes</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="flex items-center gap-2">
          <span>Team Notes</span>
          <span className="text-xs font-normal text-muted-foreground px-2 py-0.5 rounded-full bg-secondary">
            {notes.length}
          </span>
        </CardTitle>
      </CardHeader>
      
      <div className="flex-1 flex flex-col min-h-0">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {notes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No notes yet. Start the conversation!
              </div>
            ) : (
              notes.map((note) => (
                <div key={note.id} className="group relative flex gap-3 rounded-lg border bg-card p-3 shadow-sm transition-all hover:shadow-md">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={note.profile?.avatar_url || ''} />
                    <AvatarFallback>{getInitials(note.profile?.full_name || note.profile?.email || '?')}</AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{note.profile?.full_name || 'Unknown User'}</span>
                        <span className="text-xs text-muted-foreground">{formatTimeAgo(note.created_at)}</span>
                      </div>
                      
                      {currentUser === note.user_id && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {editingId === note.id ? (
                            <>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-green-500" onClick={() => handleUpdate(note.id)}>
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => setEditingId(null)}>
                                <X className="h-3 w-3" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => startEdit(note)}>
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-500" onClick={() => handleDelete(note.id)}>
                                <Trash2 className="h-3 w-3" />
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
                        className="min-h-[60px] text-sm resize-none"
                      />
                    ) : (
                      <p className="text-sm text-foreground whitespace-pre-wrap break-words">{note.content}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t bg-background/50 backdrop-blur supports-[backdrop-filter]:bg-background/50">
          <div className="flex gap-2">
            <Textarea
              placeholder="Type a note for the team..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="resize-none min-h-[44px] max-h-[120px]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
            <Button 
              size="icon" 
              className="h-[44px] w-[44px] shrink-0" 
              onClick={handleSubmit} 
              disabled={submitting || !newNote.trim()}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
