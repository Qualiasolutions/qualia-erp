'use client';

import { Folder, Calendar, CheckCircle2, Circle, AlertCircle, ListTodo } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { quickUpdateTask } from '@/app/actions/inbox';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface Issue {
  id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  start_date: string | null;
  target_date: string | null;
  created_at: string;
  issues: Issue[];
  issue_stats: {
    total: number;
    done: number;
  };
}

interface ProjectOverviewProps {
  project: Project;
}

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'Done':
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    case 'In Progress':
      return <Circle className="h-4 w-4 fill-yellow-500/20 text-yellow-500" />;
    default:
      return <Circle className="h-4 w-4 text-muted-foreground" />;
  }
};

export function ProjectOverview({ project }: ProjectOverviewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleToggleIssue = (issueId: string, currentStatus: string) => {
    startTransition(async () => {
      const newStatus = currentStatus === 'Done' ? 'Todo' : 'Done';
      await quickUpdateTask(issueId, { status: newStatus as 'Todo' | 'Done' });
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Folder className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Project Overview</h2>
            <p className="text-sm text-muted-foreground">
              {project.issue_stats.done} of {project.issue_stats.total} tasks completed
            </p>
          </div>
        </div>
      </div>

      {/* Description */}
      {project.description && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-2 text-sm font-medium">Description</h3>
          <p className="text-sm text-muted-foreground">{project.description}</p>
        </div>
      )}

      {/* Project Info */}
      <div className="grid gap-4 md:grid-cols-2">
        {project.start_date && (
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Start Date</span>
            </div>
            <p className="text-sm font-medium">{formatDate(project.start_date)}</p>
          </div>
        )}
        {project.target_date && (
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Target Date</span>
            </div>
            <p className="text-sm font-medium">{formatDate(project.target_date)}</p>
          </div>
        )}
      </div>

      {/* Issues List */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <ListTodo className="h-4 w-4" />
            Issues ({project.issues.length})
          </h3>
          <Link href={`/hub?project=${project.id}`}>
            <Button variant="outline" size="sm">
              View All
            </Button>
          </Link>
        </div>
        {project.issues.length === 0 ? (
          <div className="py-8 text-center">
            <AlertCircle className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No issues yet</p>
            <Link href={`/hub?project=${project.id}`}>
              <Button variant="outline" size="sm" className="mt-4">
                Create Issue
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {project.issues.slice(0, 10).map((issue) => (
              <div
                key={issue.id}
                className={cn(
                  'group/issue flex items-center gap-2 rounded-lg border border-border bg-background p-3 transition-colors hover:bg-muted',
                  issue.status === 'Done' && 'opacity-60'
                )}
              >
                <button
                  onClick={() => handleToggleIssue(issue.id, issue.status)}
                  disabled={isPending}
                  className="shrink-0"
                  title={issue.status === 'Done' ? 'Mark as Open' : 'Mark as Fixed'}
                >
                  <StatusIcon status={issue.status} />
                </button>
                <Link
                  href={`/issues/${issue.id}`}
                  className={cn(
                    'flex-1 text-sm transition-colors hover:text-primary',
                    issue.status === 'Done' && 'text-muted-foreground line-through'
                  )}
                >
                  {issue.title}
                </Link>
                <span className="text-xs text-muted-foreground">{issue.priority}</span>
              </div>
            ))}
            {project.issues.length > 10 && (
              <p className="pt-2 text-center text-xs text-muted-foreground">
                Showing 10 of {project.issues.length} issues
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
