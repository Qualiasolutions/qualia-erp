'use client';

import { useState, useTransition, useMemo, useRef, useCallback } from 'react';
import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  isSameDay,
  subDays,
} from 'date-fns';
import { useRouter } from 'next/navigation';
import {
  Plus,
  RefreshCw,
  Check,
  Edit,
  ExternalLink,
  Trash2,
  MoreHorizontal,
  PenLine,
  BarChart3,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import {
  type BlogPost,
  type BlogTask,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
} from '@/app/actions/seo';

interface SeoProject {
  id: string;
  name: string;
  project_type: string | null;
  client: { id: string; name: string } | null;
}

interface SeoPageClientProps {
  blogPosts: BlogPost[];
  seoProjects: SeoProject[];
  blogTasks: BlogTask[];
}

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-muted text-muted-foreground' },
  scheduled: {
    label: 'Scheduled',
    color: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  },
  published: {
    label: 'Published',
    color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  },
  archived: { label: 'Archived', color: 'bg-muted text-muted-foreground' },
};

const TASK_STATUS_ICON: Record<string, typeof Circle> = {
  Todo: Circle,
  'In Progress': Clock,
  Done: CheckCircle2,
  Canceled: Circle,
};

export function SeoPageClient({ blogPosts, seoProjects, blogTasks }: SeoPageClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [confirmState, setConfirmState] = useState<{ action: () => void } | null>(null);

  const todayRef = useRef(new Date());
  const today = useMemo(() => {
    const d = todayRef.current;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }, []);

  // Stats per project
  const projectStats = useMemo(() => {
    return seoProjects.map((project) => {
      const projectTasks = blogTasks.filter((t) => t.project_id === project.id);
      const projectPosts = blogPosts.filter((p) => p.project_id === project.id);

      const totalTasks = projectTasks.length;
      const completedTasks = projectTasks.filter((t) => t.status === 'Done').length;
      const pendingTasks = projectTasks.filter((t) => t.status === 'Todo').length;

      // This week
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
      const thisWeekTasks = projectTasks.filter(
        (t) =>
          t.due_date && isWithinInterval(parseISO(t.due_date), { start: weekStart, end: weekEnd })
      );
      const thisWeekDone = thisWeekTasks.filter((t) => t.status === 'Done').length;

      // This month
      const monthStart = startOfMonth(today);
      const monthEnd = endOfMonth(today);
      const thisMonthTasks = projectTasks.filter(
        (t) =>
          t.due_date && isWithinInterval(parseISO(t.due_date), { start: monthStart, end: monthEnd })
      );
      const thisMonthDone = thisMonthTasks.filter((t) => t.status === 'Done').length;

      // Published posts count
      const publishedPosts = projectPosts.filter((p) => p.status === 'published').length;

      return {
        project,
        totalTasks,
        completedTasks,
        pendingTasks,
        thisWeekDone,
        thisWeekTotal: thisWeekTasks.length,
        thisMonthDone,
        thisMonthTotal: thisMonthTasks.length,
        publishedPosts,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      };
    });
  }, [seoProjects, blogTasks, blogPosts, today]); // today is stable ref

  // Recent blog tasks (last 30 days)
  const recentTasks = useMemo(() => {
    const thirtyDaysAgo = subDays(today, 30);
    return blogTasks
      .filter((t) => {
        const taskDate = t.due_date ? parseISO(t.due_date) : parseISO(t.created_at);
        return taskDate >= thirtyDaysAgo;
      })
      .sort((a, b) => {
        const dateA = a.due_date || a.created_at;
        const dateB = b.due_date || b.created_at;
        return dateB.localeCompare(dateA);
      });
  }, [blogTasks, today]);

  // Today's task
  const todaysTask = useMemo(() => {
    return blogTasks.find((t) => t.due_date && isSameDay(parseISO(t.due_date), today));
  }, [blogTasks, today]);

  // Overall stats
  const overallStats = useMemo(() => {
    const totalTasks = blogTasks.length;
    const completed = blogTasks.filter((t) => t.status === 'Done').length;
    const totalPosts = blogPosts.filter((p) => p.status === 'published').length;
    return { totalTasks, completed, totalPosts };
  }, [blogTasks, blogPosts]);

  const handleSubmit = async (formData: FormData) => {
    startTransition(async () => {
      if (editingPost) {
        formData.set('id', editingPost.id);
        await updateBlogPost(formData);
      } else {
        await createBlogPost(formData);
      }
      setIsModalOpen(false);
      setEditingPost(null);
      router.refresh();
    });
  };

  const handleDelete = useCallback(
    (id: string) => {
      setConfirmState({
        action: () => {
          startTransition(async () => {
            await deleteBlogPost(id);
            router.refresh();
          });
        },
      });
    },
    [router]
  );

  const handleRefresh = () => {
    startTransition(() => router.refresh());
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {/* Header */}
      <PageHeader
        icon={<BarChart3 className="h-3.5 w-3.5 text-primary" />}
        iconBg="bg-primary/10"
        title="SEO Blog Tracker"
        className="shrink-0"
      >
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isPending}>
            <RefreshCw className={cn('h-4 w-4', isPending && 'animate-spin')} />
          </Button>
          <Button
            onClick={() => {
              setEditingPost(null);
              setIsModalOpen(true);
            }}
            size="sm"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Log Post
          </Button>
        </div>
      </PageHeader>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 p-6 lg:p-8">
          {/* Stats Row */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative rounded-xl border border-border bg-card p-5">
              <FileText className="absolute right-4 top-4 h-5 w-5 text-muted-foreground/20" />
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Total Posts
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                {blogPosts.length}
              </p>
            </div>
            <div className="relative rounded-xl border border-border bg-card p-5">
              <Send className="absolute right-4 top-4 h-5 w-5 text-muted-foreground/20" />
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Published
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                {overallStats.totalPosts}
              </p>
            </div>
            <div className="relative rounded-xl border border-border bg-card p-5">
              <PenLine className="absolute right-4 top-4 h-5 w-5 text-muted-foreground/20" />
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Drafts
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                {blogPosts.filter((p) => p.status === 'draft').length}
              </p>
            </div>
            <div className="relative rounded-xl border border-border bg-card p-5">
              <CheckCircle2 className="absolute right-4 top-4 h-5 w-5 text-muted-foreground/20" />
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Tasks
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                {overallStats.totalTasks}
              </p>
            </div>
          </div>
          {/* Today's Task Banner */}
          {todaysTask && (
            <div
              className={cn(
                'flex items-center justify-between rounded-lg border px-4 py-3',
                todaysTask.status === 'Done'
                  ? 'border-emerald-500/20 bg-emerald-500/5'
                  : 'border-amber-500/20 bg-amber-500/5'
              )}
            >
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Today&apos;s Task</p>
                  <p className="text-xs text-muted-foreground">{todaysTask.title}</p>
                </div>
              </div>
              <Badge
                className={cn(
                  'text-xs',
                  todaysTask.status === 'Done'
                    ? 'bg-emerald-500/10 text-emerald-600'
                    : todaysTask.status === 'In Progress'
                      ? 'bg-blue-500/10 text-blue-600'
                      : 'bg-amber-500/10 text-amber-600'
                )}
              >
                {todaysTask.status}
              </Badge>
            </div>
          )}

          {/* Project Stats Grid */}
          <div>
            <h2 className="mb-3 text-[clamp(1.25rem,1.1rem+0.75vw,1.625rem)] font-semibold tracking-tight text-foreground">
              Per-Project Stats
            </h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {projectStats.map(
                ({
                  project,
                  completedTasks,
                  totalTasks,
                  thisWeekDone,
                  thisMonthDone,
                  publishedPosts,
                  completionRate,
                }) => (
                  <div key={project.id} className="rounded-xl border border-border bg-card p-5">
                    <div className="flex items-center justify-between">
                      <h3 className="truncate text-sm font-medium text-foreground">
                        {project.name}
                      </h3>
                      <span className="text-xs text-muted-foreground">{completionRate}%</span>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
                      <div
                        className="h-1.5 rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${completionRate}%` }}
                      />
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-lg font-semibold text-foreground">{thisWeekDone}</p>
                        <p className="text-[11px] text-muted-foreground">This Week</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-foreground">{thisMonthDone}</p>
                        <p className="text-[11px] text-muted-foreground">This Month</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-foreground">{completedTasks}</p>
                        <p className="text-[11px] text-muted-foreground">All Time</p>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{totalTasks} tasks total</span>
                      <span>{publishedPosts} published</span>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Day-by-Day Log */}
          <div>
            <h2 className="mb-3 text-[clamp(1.25rem,1.1rem+0.75vw,1.625rem)] font-semibold tracking-tight text-foreground">
              Daily Log (Last 30 Days)
            </h2>
            <div className="rounded-xl border border-border bg-card">
              <div className="grid grid-cols-[100px_1fr_120px_80px] gap-4 border-b border-border bg-muted/30 px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <span>Date</span>
                <span>Task</span>
                <span>Project</span>
                <span>Status</span>
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                {recentTasks.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No blog tasks yet. The cron job will create daily tasks automatically.
                  </div>
                ) : (
                  recentTasks.map((task) => {
                    const StatusIcon = TASK_STATUS_ICON[task.status] || Circle;
                    const isToday = task.due_date && isSameDay(parseISO(task.due_date), today);
                    return (
                      <div
                        key={task.id}
                        className={cn(
                          'grid grid-cols-[100px_1fr_120px_80px] items-center gap-4 border-b border-border px-4 py-2.5 text-sm last:border-b-0',
                          isToday && 'bg-muted/20'
                        )}
                      >
                        <span className="text-xs text-muted-foreground">
                          {task.due_date
                            ? format(parseISO(task.due_date), 'MMM d')
                            : format(parseISO(task.created_at), 'MMM d')}
                          {isToday && (
                            <span className="ml-1 text-[11px] font-medium text-foreground">
                              TODAY
                            </span>
                          )}
                        </span>
                        <span className="truncate text-foreground">{task.title}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {task.project?.name || '-'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <StatusIcon
                            className={cn(
                              'h-3.5 w-3.5',
                              task.status === 'Done'
                                ? 'text-emerald-500'
                                : task.status === 'In Progress'
                                  ? 'text-blue-500'
                                  : 'text-muted-foreground'
                            )}
                          />
                          <span className="text-xs">{task.status}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Published Blog Posts */}
          {blogPosts.length > 0 && (
            <div>
              <h2 className="mb-3 text-[clamp(1.25rem,1.1rem+0.75vw,1.625rem)] font-semibold tracking-tight text-foreground">
                Published Blog Posts ({blogPosts.length})
              </h2>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {blogPosts.map((post) => (
                  <div
                    key={post.id}
                    className="ease-[cubic-bezier(0.16,1,0.3,1)] relative rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:border-primary/20 hover:shadow-md"
                  >
                    <Badge
                      className={cn(
                        'absolute right-4 top-4 text-[11px]',
                        STATUS_CONFIG[post.status].color
                      )}
                    >
                      {STATUS_CONFIG[post.status].label}
                    </Badge>
                    <div className="min-w-0 pr-20">
                      <h4 className="truncate text-sm font-medium text-foreground">{post.title}</h4>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{post.project?.name}</span>
                        {post.published_at && (
                          <>
                            <span>&middot;</span>
                            <span>{format(parseISO(post.published_at), 'MMM d, yyyy')}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingPost(post);
                              setIsModalOpen(true);
                            }}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          {post.url && (
                            <DropdownMenuItem asChild>
                              <a href={post.url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Open Link
                              </a>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleDelete(post.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Blog Post Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingPost ? (
                <>
                  <Edit className="h-4 w-4 text-muted-foreground" />
                  Edit Blog Post
                </>
              ) : (
                <>
                  <PenLine className="h-4 w-4 text-muted-foreground" />
                  Log Blog Post
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {editingPost ? 'Update blog post details' : 'Log a published blog post for tracking'}
            </DialogDescription>
          </DialogHeader>

          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="project_id"
                className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                Project
              </Label>
              <Select name="project_id" defaultValue={editingPost?.project_id} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {seoProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="title"
                className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                Title
              </Label>
              <Input
                id="title"
                name="title"
                defaultValue={editingPost?.title}
                placeholder="Blog post title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="url"
                className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                URL (optional)
              </Label>
              <Input
                id="url"
                name="url"
                type="url"
                defaultValue={editingPost?.url || ''}
                placeholder="https://..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="status"
                  className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                >
                  Status
                </Label>
                <Select name="status" defaultValue={editingPost?.status || 'published'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="published_at"
                  className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                >
                  Publish Date
                </Label>
                <Input
                  id="published_at"
                  name="published_at"
                  type="date"
                  defaultValue={
                    editingPost?.published_at
                      ? format(new Date(editingPost.published_at), 'yyyy-MM-dd')
                      : format(new Date(), 'yyyy-MM-dd')
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="keywords"
                className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                Keywords (comma-separated)
              </Label>
              <Input
                id="keywords"
                name="keywords"
                defaultValue={editingPost?.keywords?.join(', ') || ''}
                placeholder="seo, marketing, blog"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="notes"
                className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                Notes
              </Label>
              <Textarea
                id="notes"
                name="notes"
                defaultValue={editingPost?.notes || ''}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  'Saving...'
                ) : editingPost ? (
                  <>
                    <Check className="mr-1.5 h-4 w-4" />
                    Update
                  </>
                ) : (
                  <>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Create
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmState}
        onOpenChange={(open) => !open && setConfirmState(null)}
        title="Delete Blog Post"
        description="Delete this blog post? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => {
          confirmState?.action();
          setConfirmState(null);
        }}
      />
    </div>
  );
}
