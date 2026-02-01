'use client';

import { useState, useTransition, useMemo } from 'react';
import { format, startOfWeek, endOfWeek, subWeeks, isWithinInterval, parseISO } from 'date-fns';
import { useRouter } from 'next/navigation';
import {
  Search,
  Plus,
  Globe,
  FileText,
  Calendar,
  ExternalLink,
  MoreHorizontal,
  Trash2,
  Edit,
  RefreshCw,
  CheckCircle2,
  Circle,
  Clock,
  TrendingUp,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  PenLine,
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
import { cn } from '@/lib/utils';
import { type BlogPost, createBlogPost, updateBlogPost, deleteBlogPost } from '@/app/actions/seo';

interface SeoProject {
  id: string;
  name: string;
  project_type: string | null;
  client: { id: string; name: string } | null;
}

interface SeoPageClientProps {
  blogPosts: BlogPost[];
  seoProjects: SeoProject[];
}

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400' },
  scheduled: { label: 'Scheduled', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  published: {
    label: 'Published',
    color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  archived: { label: 'Archived', color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400' },
};

// Get week range for display
function getWeekLabel(date: Date): string {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  const end = endOfWeek(date, { weekStartsOn: 1 });
  return `${format(start, 'MMM d')} - ${format(end, 'MMM d')}`;
}

// Check if a post was published in a given week
function isPostInWeek(post: BlogPost, weekStart: Date): boolean {
  if (!post.published_at && !post.created_at) return false;
  const postDate = parseISO(post.published_at || post.created_at);
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  return isWithinInterval(postDate, { start: weekStart, end: weekEnd });
}

export function SeoPageClient({ blogPosts, seoProjects }: SeoPageClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [preselectedProject, setPreselectedProject] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  const today = new Date();
  const currentWeekStart = startOfWeek(subWeeks(today, weekOffset), { weekStartsOn: 1 });

  // Calculate stats for each project
  const projectStats = useMemo(() => {
    return seoProjects.map((project) => {
      const projectPosts = blogPosts.filter((p) => p.project_id === project.id);
      const thisWeekPosts = projectPosts.filter((p) => isPostInWeek(p, currentWeekStart));
      const totalPosts = projectPosts.length;

      // Calculate streak (consecutive weeks with posts)
      let streak = 0;
      let checkWeek = startOfWeek(today, { weekStartsOn: 1 });
      for (let i = 0; i < 12; i++) {
        const weekPosts = projectPosts.filter((p) => isPostInWeek(p, checkWeek));
        if (weekPosts.length > 0) {
          streak++;
          checkWeek = subWeeks(checkWeek, 1);
        } else {
          break;
        }
      }

      return {
        project,
        thisWeekPosts,
        totalPosts,
        streak,
        hasPostThisWeek: thisWeekPosts.length > 0,
      };
    });
  }, [seoProjects, blogPosts, currentWeekStart, today]);

  // Overall stats
  const completedThisWeek = projectStats.filter((s) => s.hasPostThisWeek).length;
  const totalProjects = seoProjects.length;
  const overallProgress = Math.round((completedThisWeek / totalProjects) * 100);

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
      setPreselectedProject(null);
      router.refresh();
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this blog post?')) return;
    startTransition(async () => {
      await deleteBlogPost(id);
      router.refresh();
    });
  };

  const handleRefresh = () => {
    startTransition(() => router.refresh());
  };

  const openEditModal = (post: BlogPost) => {
    setEditingPost(post);
    setPreselectedProject(null);
    setIsModalOpen(true);
  };

  const openCreateModal = (projectId?: string) => {
    setEditingPost(null);
    setPreselectedProject(projectId || null);
    setIsModalOpen(true);
  };

  // Filter posts for the list view
  const filteredPosts = blogPosts.filter((post) => {
    if (search && !post.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border/60 px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
            <Globe className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Blog Tracker</h1>
            <p className="text-xs text-muted-foreground">1 post per week per project</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isPending}>
            <RefreshCw className={cn('h-4 w-4', isPending && 'animate-spin')} />
          </Button>
          <Button onClick={() => openCreateModal()} size="sm">
            <Plus className="mr-1.5 h-4 w-4" />
            Add Post
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* Weekly Progress Card */}
        <div className="border-b border-border/60 bg-gradient-to-br from-blue-500/5 to-violet-500/5 p-6">
          <div className="mx-auto max-w-4xl">
            {/* Week Navigation */}
            <div className="mb-4 flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setWeekOffset((w) => w + 1)}
                className="text-muted-foreground"
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Previous
              </Button>
              <div className="text-center">
                <h2 className="text-sm font-semibold text-foreground">
                  {weekOffset === 0
                    ? 'This Week'
                    : `${weekOffset} week${weekOffset > 1 ? 's' : ''} ago`}
                </h2>
                <p className="text-xs text-muted-foreground">{getWeekLabel(currentWeekStart)}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}
                disabled={weekOffset === 0}
                className="text-muted-foreground"
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>

            {/* Progress Overview */}
            <div className="mb-6 flex items-center justify-center gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-foreground">
                  {completedThisWeek}/{totalProjects}
                </div>
                <p className="text-xs text-muted-foreground">Posts Done</p>
              </div>
              <div className="h-12 w-px bg-border" />
              <div className="text-center">
                <div className="flex items-center gap-1 text-3xl font-bold text-emerald-500">
                  {overallProgress}%{overallProgress === 100 && <Sparkles className="h-5 w-5" />}
                </div>
                <p className="text-xs text-muted-foreground">Complete</p>
              </div>
            </div>

            {/* Project Status Grid */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {projectStats.map(
                ({ project, hasPostThisWeek, thisWeekPosts, streak, totalPosts }) => (
                  <div
                    key={project.id}
                    className={cn(
                      'group relative rounded-xl border p-4 transition-all',
                      hasPostThisWeek
                        ? 'border-emerald-500/30 bg-emerald-500/5'
                        : 'border-border/60 bg-card hover:border-blue-500/30'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {hasPostThisWeek ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground/40" />
                          )}
                          <h3 className="font-medium text-foreground">{project.name}</h3>
                        </div>
                        {project.client && (
                          <p className="ml-7 text-xs text-muted-foreground">
                            {project.client.name}
                          </p>
                        )}
                      </div>

                      {!hasPostThisWeek && weekOffset === 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 gap-1.5 text-blue-500 opacity-0 transition-opacity group-hover:opacity-100"
                          onClick={() => openCreateModal(project.id)}
                        >
                          <PenLine className="h-3.5 w-3.5" />
                          Write
                        </Button>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="ml-7 mt-3 flex items-center gap-4 text-xs">
                      {streak > 0 && (
                        <div className="flex items-center gap-1 text-amber-500">
                          <TrendingUp className="h-3.5 w-3.5" />
                          {streak} week streak
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <FileText className="h-3.5 w-3.5" />
                        {totalPosts} total
                      </div>
                    </div>

                    {/* This week's post preview */}
                    {thisWeekPosts.length > 0 && (
                      <div className="ml-7 mt-2">
                        {thisWeekPosts.slice(0, 1).map((post) => (
                          <button
                            key={post.id}
                            onClick={() => openEditModal(post)}
                            className="block w-full truncate rounded bg-emerald-500/10 px-2 py-1 text-left text-xs text-emerald-700 transition-colors hover:bg-emerald-500/20 dark:text-emerald-400"
                          >
                            {post.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              )}
            </div>

            {/* Encouragement */}
            {weekOffset === 0 && completedThisWeek < totalProjects && (
              <div className="mt-4 rounded-lg bg-blue-500/10 p-3 text-center">
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  <Clock className="mb-0.5 mr-1.5 inline h-4 w-4" />
                  {totalProjects - completedThisWeek} post
                  {totalProjects - completedThisWeek > 1 ? 's' : ''} left this week. You got this!
                  💪
                </p>
              </div>
            )}
            {weekOffset === 0 && completedThisWeek === totalProjects && (
              <div className="mt-4 rounded-lg bg-emerald-500/10 p-3 text-center">
                <p className="text-sm text-emerald-600 dark:text-emerald-400">
                  <Sparkles className="mb-0.5 mr-1.5 inline h-4 w-4" />
                  All posts done for this week! Amazing work! 🎉
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Posts List */}
        <div className="p-6">
          <div className="mx-auto max-w-4xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">All Posts</h2>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search posts..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 pl-9"
                />
              </div>
            </div>

            {filteredPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">No blog posts yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Start by adding your first blog post
                </p>
                <Button onClick={() => openCreateModal()} className="mt-4" size="sm">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add Post
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredPosts.map((post) => (
                  <div
                    key={post.id}
                    className="group flex items-center gap-4 rounded-lg border border-border/60 bg-card p-3 transition-colors hover:border-border"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-sm font-medium text-foreground">
                          {post.title}
                        </h3>
                        <Badge
                          className={cn('shrink-0 text-[10px]', STATUS_CONFIG[post.status].color)}
                        >
                          {STATUS_CONFIG[post.status].label}
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{post.project?.name}</span>
                        {post.published_at && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(post.published_at), 'MMM d, yyyy')}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      {post.url && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                          <a href={post.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditModal(post)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
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
            )}
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPost ? 'Edit Blog Post' : 'Add Blog Post'}</DialogTitle>
            <DialogDescription>
              {editingPost
                ? 'Update the blog post details'
                : 'Track a new blog post. Use Claude.ai to help write it!'}
            </DialogDescription>
          </DialogHeader>

          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project_id">Project</Label>
              <Select
                name="project_id"
                defaultValue={preselectedProject || editingPost?.project_id}
                required
              >
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
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                defaultValue={editingPost?.title}
                placeholder="Blog post title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">URL (optional)</Label>
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
                <Label htmlFor="status">Status</Label>
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
                <Label htmlFor="published_at">Publish Date</Label>
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
              <Label htmlFor="keywords">Keywords (comma-separated)</Label>
              <Input
                id="keywords"
                name="keywords"
                defaultValue={editingPost?.keywords?.join(', ') || ''}
                placeholder="seo, marketing, blog"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
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
                {isPending ? 'Saving...' : editingPost ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
