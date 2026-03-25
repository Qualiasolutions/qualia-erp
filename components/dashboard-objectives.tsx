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
        .in('status', ['Active', 'Demos'])
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
        .update({ status: 'Launched' })
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

  // Shared header component for consistency
  const ObjectivesHeader = () => (
    <CardHeader className="shrink-0 border-b border-border px-4 pb-3 pt-4 sm:px-5 sm:pb-4">
      <CardTitle className="flex items-center gap-2 text-sm font-semibold sm:gap-2.5 sm:text-base">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/10 text-amber-500 sm:h-8 sm:w-8">
          <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </div>
        <span className="truncate">2025 Objectives</span>
      </CardTitle>
    </CardHeader>
  );

  if (!workspaceId) {
    return (
      <Card className="flex h-full flex-col overflow-hidden border-border bg-card/80 shadow-md backdrop-blur-sm">
        <ObjectivesHeader />
        <CardContent className="flex flex-1 items-center justify-center p-6">
          <div className="text-center text-sm text-muted-foreground">
            <p>Workspace not found.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="flex h-full flex-col overflow-hidden border-border bg-card/80 shadow-md backdrop-blur-sm">
        <ObjectivesHeader />
        <CardContent className="flex flex-1 items-center justify-center p-6">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground sm:h-8 sm:w-8" />
        </CardContent>
      </Card>
    );
  }

  const completedCount = 0; // Could track completed count if needed
  const totalCount = projects.length;

  return (
    <Card className="flex h-full flex-col overflow-hidden border-border bg-card/80 shadow-md backdrop-blur-sm transition-shadow duration-300 hover:shadow-lg">
      <CardHeader className="shrink-0 border-b border-border px-4 pb-3 pt-4 sm:px-5 sm:pb-4">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold sm:gap-2.5 sm:text-base">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/10 text-amber-500 sm:h-8 sm:w-8">
            <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </div>
          <span className="truncate">2025 Objectives</span>
          <span className="ml-auto flex shrink-0 items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400 sm:gap-1.5 sm:px-2.5 sm:py-1 sm:text-xs">
            <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            {totalCount} active
          </span>
        </CardTitle>
      </CardHeader>

      <ScrollArea className="min-h-0 flex-1">
        <CardContent className="p-0">
          {projects.length === 0 ? (
            <div className="flex min-h-[160px] items-center justify-center p-6 sm:min-h-[200px]">
              <div className="space-y-3 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/10 sm:h-12 sm:w-12">
                  <Check className="h-5 w-5 text-emerald-500 sm:h-6 sm:w-6" />
                </div>
                <p className="text-xs font-medium text-muted-foreground sm:text-sm">
                  All objectives completed!
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {projects.map((project, index) => (
                <div
                  key={project.id}
                  className={cn(
                    'group flex items-center gap-3 px-4 py-3 transition-all duration-200 sm:gap-4 sm:px-5 sm:py-3.5',
                    'active:bg-amber-500/10 sm:hover:bg-gradient-to-r sm:hover:from-amber-500/5 sm:hover:to-transparent',
                    completingId === project.id && 'pointer-events-none opacity-50'
                  )}
                  style={{
                    animationDelay: `${index * 50}ms`,
                  }}
                >
                  {/* Checkbox - 44px touch target */}
                  <button
                    onClick={() => handleComplete(project.id)}
                    disabled={completingId === project.id}
                    className={cn(
                      'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all duration-200 sm:h-9 sm:w-9 sm:rounded-lg',
                      'active:scale-90 sm:hover:scale-105',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background'
                    )}
                    aria-label={`Mark ${project.name} as complete`}
                  >
                    <div
                      className={cn(
                        'flex h-6 w-6 items-center justify-center rounded-md border-2 transition-all duration-200 sm:h-5 sm:w-5',
                        'border-muted-foreground/30 group-hover:border-amber-500 group-hover:bg-amber-500/10',
                        completingId === project.id && 'border-amber-500 bg-amber-500'
                      )}
                    >
                      {completingId === project.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-white sm:h-3 sm:w-3" />
                      ) : (
                        <Check className="h-3.5 w-3.5 text-transparent transition-colors group-hover:text-amber-500 sm:h-3 sm:w-3" />
                      )}
                    </div>
                  </button>

                  {/* Project Info */}
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/projects/${project.id}`}
                      className="block truncate text-sm font-medium text-foreground transition-colors hover:text-amber-600 active:text-amber-700 dark:hover:text-amber-400 sm:text-sm"
                    >
                      {project.name}
                    </Link>
                  </div>

                  {/* Status Indicator */}
                  <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
                    <span className="hidden text-[11px] font-medium uppercase tracking-wider text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 sm:inline">
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
        <div className="shrink-0 border-t border-border bg-muted/20 px-4 py-3 sm:px-5 sm:py-3.5">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground sm:text-xs">
            <span>Tap to complete</span>
            <span className="font-medium tabular-nums">
              {completedCount}/{totalCount + completedCount} done
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted/60 sm:h-2">
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
