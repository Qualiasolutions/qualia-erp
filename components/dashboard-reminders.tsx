'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Bell, Check, Plus, ChevronDown, ChevronUp, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { useWorkspace } from '@/components/workspace-provider';

interface Reminder {
  id: string;
  text: string;
  is_seen: boolean;
  created_at: string;
  created_by: string;
}

export function DashboardReminders({ workspaceId: propWorkspaceId }: { workspaceId?: string }) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = propWorkspaceId || currentWorkspace?.id;

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newReminderText, setNewReminderText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const supabase = createClient();

  const fetchReminders = useCallback(async () => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('reminders')
        .select('id, text, is_seen, created_at, created_by')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReminders(data || []);
    } catch (error: unknown) {
      console.error('Error fetching reminders:', error);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, supabase]);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  // Focus input when adding
  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAdding]);

  async function handleToggleSeen(reminderId: string, currentState: boolean) {
    setTogglingId(reminderId);

    try {
      const { error } = await supabase
        .from('reminders')
        .update({ is_seen: !currentState })
        .eq('id', reminderId);

      if (error) throw error;

      setReminders((prev) =>
        prev.map((r) => (r.id === reminderId ? { ...r, is_seen: !currentState } : r))
      );
    } catch (error: unknown) {
      console.error('Error toggling reminder:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to update reminder',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setTogglingId(null);
    }
  }

  async function handleAddReminder() {
    if (!newReminderText.trim() || !workspaceId) return;

    setIsSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('reminders')
        .insert({
          workspace_id: workspaceId,
          created_by: user.id,
          text: newReminderText.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      setReminders((prev) => [data, ...prev]);
      setNewReminderText('');
      setIsAdding(false);

      toast({
        title: 'Reminder added',
        description: 'Your reminder has been saved.',
      });
    } catch (error: unknown) {
      console.error('Error adding reminder:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to add reminder',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddReminder();
    } else if (e.key === 'Escape') {
      setIsAdding(false);
      setNewReminderText('');
    }
  }

  const unseenCount = reminders.filter((r) => !r.is_seen).length;

  // Shared header component
  const RemindersHeader = () => (
    <CardHeader className="shrink-0 border-b border-border/50 px-4 pb-3 pt-4 sm:px-5 sm:pb-4">
      <CardTitle className="flex items-center gap-2 text-sm font-semibold sm:gap-2.5 sm:text-base">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500/20 to-pink-500/10 text-rose-500 sm:h-8 sm:w-8">
          <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </div>
        <span className="truncate uppercase tracking-wide">Reminders</span>
        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          {unseenCount > 0 && (
            <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium text-rose-600 dark:text-rose-400 sm:px-2.5 sm:py-1 sm:text-xs">
              {unseenCount}
            </span>
          )}
          <button
            onClick={() => setIsAdding(true)}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-all sm:h-8 sm:w-8',
              'hover:bg-rose-500/10 hover:text-rose-500',
              'active:scale-95'
            )}
            title="Add reminder"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-all sm:h-8 sm:w-8',
              'hover:bg-accent hover:text-foreground',
              'active:scale-95'
            )}
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        </div>
      </CardTitle>
    </CardHeader>
  );

  if (!workspaceId) {
    return (
      <Card className="flex h-full flex-col overflow-hidden border-border/50 bg-card/80 shadow-md backdrop-blur-sm">
        <RemindersHeader />
        {!isCollapsed && (
          <CardContent className="flex flex-1 items-center justify-center p-6">
            <div className="text-center text-sm text-muted-foreground">
              <p>Workspace not found.</p>
            </div>
          </CardContent>
        )}
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="flex h-full flex-col overflow-hidden border-border/50 bg-card/80 shadow-md backdrop-blur-sm">
        <RemindersHeader />
        {!isCollapsed && (
          <CardContent className="flex flex-1 items-center justify-center p-6">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground sm:h-8 sm:w-8" />
          </CardContent>
        )}
      </Card>
    );
  }

  return (
    <Card className="flex h-full flex-col overflow-hidden border-border/50 bg-card/80 shadow-md backdrop-blur-sm transition-shadow duration-300 hover:shadow-lg">
      <RemindersHeader />

      {!isCollapsed && (
        <ScrollArea className="min-h-0 flex-1">
          <CardContent className="p-0">
            {/* Add reminder input */}
            {isAdding && (
              <div className="border-b border-border/30 bg-rose-500/5 p-3 sm:p-4">
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={newReminderText}
                    onChange={(e) => setNewReminderText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your reminder..."
                    className={cn(
                      'flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60',
                      'focus:placeholder:text-muted-foreground/40'
                    )}
                    disabled={isSubmitting}
                  />
                  <button
                    onClick={handleAddReminder}
                    disabled={!newReminderText.trim() || isSubmitting}
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-lg transition-all',
                      'bg-rose-500 text-white',
                      'hover:bg-rose-600 active:scale-95',
                      'disabled:cursor-not-allowed disabled:opacity-50'
                    )}
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setIsAdding(false);
                      setNewReminderText('');
                    }}
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-all',
                      'hover:bg-accent hover:text-foreground active:scale-95'
                    )}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {reminders.length === 0 && !isAdding ? (
              <div className="flex min-h-[120px] items-center justify-center p-6 sm:min-h-[160px]">
                <div className="space-y-3 text-center">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-muted/50 sm:h-12 sm:w-12">
                    <Bell className="h-5 w-5 text-muted-foreground sm:h-6 sm:w-6" />
                  </div>
                  <p className="text-xs text-muted-foreground sm:text-sm">No reminders yet</p>
                  <button
                    onClick={() => setIsAdding(true)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-medium text-white transition-all',
                      'hover:bg-rose-600 active:scale-95'
                    )}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Reminder
                  </button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {reminders.map((reminder, index) => (
                  <div
                    key={reminder.id}
                    className={cn(
                      'group flex items-start gap-3 px-4 py-3 transition-all duration-200 sm:gap-4 sm:px-5 sm:py-3.5',
                      'active:bg-rose-500/10 sm:hover:bg-gradient-to-r sm:hover:from-rose-500/5 sm:hover:to-transparent',
                      togglingId === reminder.id && 'pointer-events-none opacity-50',
                      reminder.is_seen && 'opacity-60'
                    )}
                    style={{
                      animationDelay: `${index * 50}ms`,
                    }}
                  >
                    {/* Checkbox - 44px touch target */}
                    <button
                      onClick={() => handleToggleSeen(reminder.id, reminder.is_seen)}
                      disabled={togglingId === reminder.id}
                      className={cn(
                        'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all duration-200 sm:h-9 sm:w-9 sm:rounded-lg',
                        'active:scale-90 sm:hover:scale-105',
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background'
                      )}
                      aria-label={reminder.is_seen ? 'Mark as unseen' : 'Mark as seen'}
                    >
                      <div
                        className={cn(
                          'flex h-6 w-6 items-center justify-center rounded-md border-2 transition-all duration-200 sm:h-5 sm:w-5',
                          reminder.is_seen
                            ? 'border-rose-500 bg-rose-500'
                            : 'border-muted-foreground/30 group-hover:border-rose-500 group-hover:bg-rose-500/10',
                          togglingId === reminder.id && 'border-rose-500 bg-rose-500'
                        )}
                      >
                        {togglingId === reminder.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-white sm:h-3 sm:w-3" />
                        ) : reminder.is_seen ? (
                          <Check className="h-3.5 w-3.5 text-white sm:h-3 sm:w-3" />
                        ) : (
                          <Check className="h-3.5 w-3.5 text-transparent transition-colors group-hover:text-rose-500 sm:h-3 sm:w-3" />
                        )}
                      </div>
                    </button>

                    {/* Reminder Text */}
                    <div className="min-w-0 flex-1 pt-2.5 sm:pt-1.5">
                      <p
                        className={cn(
                          'text-sm text-foreground transition-all sm:text-sm',
                          reminder.is_seen && 'text-muted-foreground line-through'
                        )}
                      >
                        {reminder.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </ScrollArea>
      )}
    </Card>
  );
}
