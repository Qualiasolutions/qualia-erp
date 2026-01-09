'use client';

import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Crown, UserCheck } from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { motion } from 'framer-motion';

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface ProjectTeamViewProps {
  projectId: string;
  lead?: Profile | null;
  className?: string;
}

export function ProjectTeamView({ projectId, lead, className }: ProjectTeamViewProps) {
  const [assignees, setAssignees] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    async function fetchAssignees() {
      try {
        // Get unique assignees from tasks in this project
        const { data: tasks } = await supabase
          .from('tasks')
          .select('assignee:profiles!tasks_assignee_id_fkey(id, full_name, email, avatar_url)')
          .eq('project_id', projectId)
          .not('assignee_id', 'is', null);

        if (tasks) {
          // Extract unique assignees
          const uniqueAssignees = new Map<string, Profile>();
          tasks.forEach((task) => {
            const assignee = Array.isArray(task.assignee) ? task.assignee[0] : task.assignee;
            if (assignee && !uniqueAssignees.has(assignee.id)) {
              uniqueAssignees.set(assignee.id, assignee);
            }
          });

          // Filter out lead from assignees list
          const assigneeList = Array.from(uniqueAssignees.values()).filter(
            (a) => a.id !== lead?.id
          );
          setAssignees(assigneeList);
        }
      } catch (error) {
        console.error('Error fetching assignees:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAssignees();
  }, [projectId, lead?.id, supabase]);

  const totalMembers = (lead ? 1 : 0) + assignees.length;

  return (
    <div className={cn('rounded-xl border border-border/50 bg-card', className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Team</h3>
          <span className="text-xs text-muted-foreground">
            ({totalMembers} {totalMembers === 1 ? 'member' : 'members'})
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          </div>
        ) : totalMembers === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Users className="mb-2 h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No team members</p>
            <p className="text-xs text-muted-foreground/70">Assign a lead or tasks to see team</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Lead */}
            {lead && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 rounded-lg bg-primary/5 p-2"
              >
                <Avatar className="h-9 w-9 ring-2 ring-primary/20">
                  <AvatarImage src={lead.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
                    {getInitials(lead.full_name || lead.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium">
                      {lead.full_name || lead.email}
                    </span>
                    <Crown className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                  </div>
                  <span className="text-xs text-muted-foreground">Project Lead</span>
                </div>
              </motion.div>
            )}

            {/* Assignees */}
            {assignees.length > 0 && (
              <div className="space-y-2">
                {lead && assignees.length > 0 && (
                  <div className="flex items-center gap-2 px-2">
                    <div className="h-px flex-1 bg-border/50" />
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Contributors
                    </span>
                    <div className="h-px flex-1 bg-border/50" />
                  </div>
                )}

                {assignees.map((assignee, index) => (
                  <motion.div
                    key={assignee.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={assignee.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(assignee.full_name || assignee.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-sm">
                        {assignee.full_name || assignee.email}
                      </span>
                    </div>
                    <UserCheck className="h-3.5 w-3.5 text-muted-foreground/50" />
                  </motion.div>
                ))}
              </div>
            )}

            {/* Avatar Stack Preview (if many members) */}
            {totalMembers > 5 && (
              <div className="flex items-center gap-2 border-t border-border/50 pt-3">
                <div className="flex -space-x-2">
                  {[lead, ...assignees].slice(0, 4).map(
                    (member) =>
                      member && (
                        <Avatar key={member.id} className="h-7 w-7 border-2 border-card">
                          <AvatarImage src={member.avatar_url || undefined} />
                          <AvatarFallback className="text-[10px]">
                            {getInitials(member.full_name || member.email)}
                          </AvatarFallback>
                        </Avatar>
                      )
                  )}
                  {totalMembers > 4 && (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-medium">
                      +{totalMembers - 4}
                    </div>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">{totalMembers} total members</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
