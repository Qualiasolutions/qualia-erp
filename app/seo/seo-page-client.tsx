'use client';

import { useState, useTransition, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
} from 'date-fns';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Globe,
  Calendar,
  ExternalLink,
  MoreHorizontal,
  Trash2,
  Edit,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  PenLine,
  Check,
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
    color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  },
  archived: { label: 'Archived', color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400' },
};

// Project colors for distinction
const PROJECT_COLORS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-cyan-500 to-blue-600',
  'from-fuchsia-500 to-purple-600',
  'from-lime-500 to-emerald-600',
];

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function SeoPageClient({ blogPosts, seoProjects }: SeoPageClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [preselectedProject, setPreselectedProject] = useState<string | null>(null);

  // Get posts for a specific date
  const getPostsForDate = (date: Date) => {
    return blogPosts.filter((post) => {
      const postDate = post.published_at ? parseISO(post.published_at) : null;
      return postDate && isSameDay(postDate, date);
    });
  };

  // Get all posts for the selected date
  const selectedDatePosts = useMemo(() => {
    if (!selectedDate) return [];
    return getPostsForDate(selectedDate);
  }, [selectedDate, blogPosts]);

  // Get posts for the current month
  const monthPosts = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return blogPosts.filter((post) => {
      const postDate = post.published_at ? parseISO(post.published_at) : null;
      return postDate && postDate >= start && postDate <= end;
    });
  }, [currentMonth, blogPosts]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days: Date[] = [];
    let day = startDate;
    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  // Get project color
  const getProjectColor = (projectId: string) => {
    const index = seoProjects.findIndex((p) => p.id === projectId);
    return PROJECT_COLORS[index % PROJECT_COLORS.length];
  };

  // Stats
  const totalPosts = blogPosts.length;
  const thisMonthPosts = monthPosts.length;

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

  const openCreateModal = (projectId?: string, date?: Date) => {
    setEditingPost(null);
    setPreselectedProject(projectId || null);
    if (date) setSelectedDate(date);
    setIsModalOpen(true);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth((prev) => (direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)));
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border/60 bg-background/95 px-6 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-purple-600 opacity-20" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.3),transparent_70%)]" />
            <Globe className="relative h-5 w-5 text-violet-500" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Blog Tracker</h1>
            <p className="text-xs text-muted-foreground">
              {thisMonthPosts} posts this month · {totalPosts} total
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isPending}>
            <RefreshCw className={cn('h-4 w-4', isPending && 'animate-spin')} />
          </Button>
          <Button
            onClick={() => openCreateModal()}
            size="sm"
            className="bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add Post
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex min-h-0 flex-1">
        {/* Calendar Section */}
        <div className="flex flex-1 flex-col border-r border-border/60">
          {/* Month Navigation */}
          <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateMonth('prev')}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-semibold text-foreground">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateMonth('next')}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Calendar Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Weekday Headers */}
            <div className="mb-2 grid grid-cols-7 gap-1">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="py-2 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, index) => {
                const dayPosts = getPostsForDate(day);
                const hasPosts = dayPosts.length > 0;
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isDayToday = isToday(day);

                return (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.005 }}
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      'group relative flex aspect-square flex-col items-center justify-start rounded-xl p-2 transition-all duration-300',
                      isCurrentMonth ? 'hover:bg-muted/50' : 'opacity-40',
                      isSelected && 'ring-2 ring-violet-500/50',
                      isDayToday && !isSelected && 'bg-muted/30'
                    )}
                  >
                    {/* Mystic glow for days with posts */}
                    {hasPosts && (
                      <>
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-600/20" />
                        <div className="absolute inset-0 animate-pulse rounded-xl bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.3),transparent_60%)]" />
                        <div className="absolute -inset-px rounded-xl bg-gradient-to-br from-violet-500/40 to-purple-600/40 opacity-0 blur-sm transition-opacity group-hover:opacity-100" />
                      </>
                    )}

                    {/* Day number */}
                    <span
                      className={cn(
                        'relative z-10 text-sm font-medium transition-colors',
                        hasPosts && 'text-violet-500 dark:text-violet-400',
                        isDayToday && !hasPosts && 'text-foreground',
                        !hasPosts && !isDayToday && 'text-muted-foreground'
                      )}
                    >
                      {format(day, 'd')}
                    </span>

                    {/* Post indicators */}
                    {hasPosts && (
                      <div className="relative z-10 mt-1 flex flex-wrap justify-center gap-0.5">
                        {dayPosts.slice(0, 3).map((post) => (
                          <div
                            key={post.id}
                            className={cn(
                              'h-1.5 w-1.5 rounded-full bg-gradient-to-r',
                              getProjectColor(post.project_id)
                            )}
                            title={post.project?.name}
                          />
                        ))}
                        {dayPosts.length > 3 && (
                          <span className="text-[10px] text-violet-500">
                            +{dayPosts.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Today indicator */}
                    {isDayToday && (
                      <div className="absolute bottom-1.5 left-1/2 h-1 w-4 -translate-x-1/2 rounded-full bg-violet-500" />
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Project Legend */}
            <div className="mt-6 rounded-xl border border-border/60 bg-card/50 p-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Projects
              </h3>
              <div className="flex flex-wrap gap-2">
                {seoProjects.map((project, index) => (
                  <div
                    key={project.id}
                    className="flex items-center gap-2 rounded-lg bg-muted/30 px-2.5 py-1.5"
                  >
                    <div
                      className={cn(
                        'h-2.5 w-2.5 rounded-full bg-gradient-to-r',
                        PROJECT_COLORS[index % PROJECT_COLORS.length]
                      )}
                    />
                    <span className="text-xs font-medium text-foreground">{project.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Selected Day Posts */}
        <div className="hidden w-80 flex-col lg:flex xl:w-96">
          {/* Panel Header */}
          <div className="flex h-[60px] items-center justify-between border-b border-border/60 px-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                {selectedDate ? format(selectedDate, 'EEEE, MMM d') : 'Select a day'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {selectedDatePosts.length} post{selectedDatePosts.length !== 1 ? 's' : ''}
              </p>
            </div>
            {selectedDate && (
              <Button
                size="sm"
                variant="ghost"
                className="gap-1.5 text-violet-500"
                onClick={() => openCreateModal(undefined, selectedDate)}
              >
                <PenLine className="h-3.5 w-3.5" />
                Add
              </Button>
            )}
          </div>

          {/* Posts List */}
          <div className="flex-1 overflow-y-auto p-4">
            <AnimatePresence mode="wait">
              {selectedDatePosts.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col items-center justify-center py-12"
                >
                  <div className="relative mb-4 flex h-16 w-16 items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-500/10 to-purple-600/10" />
                    <Calendar className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm font-medium text-foreground">No posts on this day</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Click &quot;Add&quot; to create a post
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="posts"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3"
                >
                  {selectedDatePosts.map((post, index) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="group relative overflow-hidden rounded-xl border border-border/60 bg-card p-4 transition-all hover:border-violet-500/30"
                    >
                      {/* Subtle gradient accent */}
                      <div
                        className={cn(
                          'absolute left-0 top-0 h-full w-1 bg-gradient-to-b',
                          getProjectColor(post.project_id)
                        )}
                      />

                      <div className="pl-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <h4 className="truncate text-sm font-medium text-foreground">
                              {post.title}
                            </h4>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {post.project?.name}
                            </p>
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditModal(post)}>
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

                        <div className="mt-3 flex items-center gap-2">
                          <Badge className={cn('text-[10px]', STATUS_CONFIG[post.status].color)}>
                            {STATUS_CONFIG[post.status].label}
                          </Badge>
                          {post.keywords && post.keywords.length > 0 && (
                            <span className="truncate text-[10px] text-muted-foreground">
                              {post.keywords.slice(0, 2).join(', ')}
                              {post.keywords.length > 2 && `...`}
                            </span>
                          )}
                        </div>

                        {post.notes && (
                          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                            {post.notes}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Quick Stats */}
          <div className="border-t border-border/60 p-4">
            <div className="rounded-xl bg-gradient-to-br from-violet-500/10 to-purple-600/10 p-4">
              <div className="flex items-center gap-2 text-xs text-violet-600 dark:text-violet-400">
                <Sparkles className="h-4 w-4" />
                <span className="font-medium">Weekly Goal: 1 post per project</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-2xl font-bold text-foreground">{seoProjects.length}</span>
                <span className="text-xs text-muted-foreground">projects tracked</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingPost ? (
                <>
                  <Edit className="h-4 w-4 text-violet-500" />
                  Edit Blog Post
                </>
              ) : (
                <>
                  <PenLine className="h-4 w-4 text-violet-500" />
                  Add Blog Post
                </>
              )}
            </DialogTitle>
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
                  {seoProjects.map((p, index) => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            'h-2 w-2 rounded-full bg-gradient-to-r',
                            PROJECT_COLORS[index % PROJECT_COLORS.length]
                          )}
                        />
                        {p.name}
                      </div>
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
                      : selectedDate
                        ? format(selectedDate, 'yyyy-MM-dd')
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
              <Button
                type="submit"
                disabled={isPending}
                className="bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700"
              >
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
    </div>
  );
}
