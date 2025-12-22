'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Target, Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { useWorkspace } from '@/components/workspace-provider';
import Link from 'next/link';

interface Project {
  id: string;
  name: string;
  status: string;
}

export function DashboardObjectives({ workspaceId: propWorkspaceId }: { workspaceId?: string }) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = propWorkspaceId || currentWorkspace?.id;

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const { toast } = useToast();
  const supabase = createClient();

  const fetchProjects = useCallback(async () => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, status')
        .eq('workspace_id', workspaceId)
        .in('status', ['Active', 'active', 'in_progress'])
        .order('name', { ascending: true });

      if (error) throw error;

      // Filter out duplicate "General Tasks" and keep unique projects
      const uniqueProjects = (data || []).reduce((acc: Project[], project) => {
        const exists = acc.find((p) => p.name === project.name);
        if (!exists) {
          acc.push(project);
        }
        return acc;
      }, []);

      setProjects(uniqueProjects);
    } catch (error: unknown) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, supabase]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  async function handleComplete(projectId: string) {
    setCompletingId(projectId);

    try {
      const { error } = await supabase
        .from('projects')
        .update({ status: 'Completed' })
        .eq('id', projectId);

      if (error) throw error;

      // Animate out and remove from list
      setProjects((prev) => prev.filter((p) => p.id !== projectId));

      toast({
        title: 'Project completed!',
        description: 'Great work on completing this objective.',
      });
    } catch (error: unknown) {
      console.error('Error completing project:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to complete project',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setCompletingId(null);
    }
  }

  if (!workspaceId) {
    return (
      <Card className="h-full border-border/60 shadow-lg">
        <CardHeader className="border-b border-border/60 pb-4">
          <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
              <Target className="h-4 w-4" />
            </div>
            <span>2025 Objectives</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex h-[260px] items-center justify-center">
          <div className="text-center text-sm text-muted-foreground">
            <p>Workspace not found.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="h-full border-border/60 shadow-lg">
        <CardHeader className="border-b border-border/60 pb-4">
          <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
              <Target className="h-4 w-4" />
            </div>
            <span>2025 Objectives</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex h-[260px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const completedCount = 0; // Could track completed count if needed
  const totalCount = projects.length;

  return (
    <Card className="flex h-full flex-col overflow-hidden border-border/60 shadow-lg transition-shadow duration-300 hover:shadow-xl">
      <CardHeader className="shrink-0 border-b border-border/60 pb-4">
        <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/10 text-amber-500">
            <Target className="h-4 w-4" />
          </div>
          <span>2025 Objectives</span>
          <span className="ml-auto flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-400">
            <Sparkles className="h-3 w-3" />
            {totalCount} active
          </span>
        </CardTitle>
      </CardHeader>

      <ScrollArea className="flex-1">
        <CardContent className="p-0">
          {projects.length === 0 ? (
            <div className="flex h-[200px] items-center justify-center">
              <div className="space-y-2 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
                  <Check className="h-6 w-6 text-emerald-500" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  All objectives completed!
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {projects.map((project, index) => (
                <div
                  key={project.id}
                  className={cn(
                    'group flex items-center gap-3 px-4 py-3.5 transition-all duration-300',
                    'hover:bg-gradient-to-r hover:from-amber-500/5 hover:to-transparent',
                    completingId === project.id && 'pointer-events-none opacity-50'
                  )}
                  style={{
                    animationDelay: `${index * 50}ms`,
                  }}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => handleComplete(project.id)}
                    disabled={completingId === project.id}
                    className={cn(
                      'relative flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all duration-200',
                      'border-muted-foreground/30 hover:border-amber-500 hover:bg-amber-500/10',
                      'focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:ring-offset-2 focus:ring-offset-background',
                      completingId === project.id && 'border-amber-500 bg-amber-500'
                    )}
                  >
                    {completingId === project.id ? (
                      <Loader2 className="h-3 w-3 animate-spin text-white" />
                    ) : (
                      <Check className="h-3 w-3 text-transparent transition-colors group-hover:text-amber-500" />
                    )}
                  </button>

                  {/* Project Info */}
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/projects/${project.id}`}
                      className="block truncate text-sm font-medium text-foreground transition-colors hover:text-amber-600 dark:hover:text-amber-400"
                    >
                      {project.name}
                    </Link>
                  </div>

                  {/* Status Indicator */}
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                      Active
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </ScrollArea>

      {/* Progress Footer */}
      {projects.length > 0 && (
        <div className="shrink-0 border-t border-border/40 bg-muted/30 px-4 py-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Click to mark complete</span>
            <span className="font-medium">
              {completedCount}/{totalCount + completedCount} done
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
              style={{ width: `${totalCount > 0 ? 0 : 100}%` }}
            />
          </div>
        </div>
      )}
    </Card>
  );
}
