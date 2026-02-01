'use client';

import { useState, useTransition } from 'react';
import { format } from 'date-fns';
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

export function SeoPageClient({ blogPosts, seoProjects }: SeoPageClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState('');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);

  // Group posts by project
  const groupedPosts = blogPosts.reduce(
    (acc, post) => {
      const projectId = post.project_id;
      if (!acc[projectId]) {
        acc[projectId] = {
          project: post.project,
          posts: [],
        };
      }
      acc[projectId].posts.push(post);
      return acc;
    },
    {} as Record<string, { project: BlogPost['project']; posts: BlogPost[] }>
  );

  // Filter posts
  const filteredGroups = Object.entries(groupedPosts).filter(([projectId, group]) => {
    if (filterProject !== 'all' && projectId !== filterProject) return false;
    const hasMatchingPosts = group.posts.some((post) => {
      if (filterStatus !== 'all' && post.status !== filterStatus) return false;
      if (search && !post.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    return hasMatchingPosts;
  });

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
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingPost(null);
    setIsModalOpen(true);
  };

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border/60 px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
            <Globe className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">SEO Blog Tracking</h1>
            <p className="text-xs text-muted-foreground">
              {blogPosts.length} posts across {seoProjects.length} projects
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isPending}>
            <RefreshCw className={cn('h-4 w-4', isPending && 'animate-spin')} />
          </Button>
          <Button onClick={openCreateModal} size="sm">
            <Plus className="mr-1.5 h-4 w-4" />
            Add Post
          </Button>
        </div>
      </header>

      {/* Filters */}
      <div className="flex items-center gap-3 border-b border-border/60 px-6 py-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search posts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9"
          />
        </div>

        <Select value={filterProject} onValueChange={setFilterProject}>
          <SelectTrigger className="h-9 w-[180px]">
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {seoProjects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-9 w-[140px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No blog posts yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add your first blog post to start tracking
            </p>
            <Button onClick={openCreateModal} className="mt-4" size="sm">
              <Plus className="mr-1.5 h-4 w-4" />
              Add Post
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {filteredGroups.map(([projectId, group]) => {
              const filteredPosts = group.posts.filter((post) => {
                if (filterStatus !== 'all' && post.status !== filterStatus) return false;
                if (search && !post.title.toLowerCase().includes(search.toLowerCase()))
                  return false;
                return true;
              });

              if (filteredPosts.length === 0) return null;

              return (
                <div key={projectId}>
                  {/* Project Header */}
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-500/10">
                      <Globe className="h-3.5 w-3.5 text-blue-500" />
                    </div>
                    <h2 className="text-sm font-semibold text-foreground">
                      {group.project?.name || 'Unknown Project'}
                    </h2>
                    <Badge variant="secondary" className="text-[10px]">
                      {filteredPosts.length} posts
                    </Badge>
                  </div>

                  {/* Posts Grid */}
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredPosts.map((post) => (
                      <div
                        key={post.id}
                        className="group rounded-lg border border-border/60 bg-card p-4 transition-colors hover:border-border"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="line-clamp-2 flex-1 text-sm font-medium text-foreground">
                            {post.title}
                          </h3>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 opacity-0 group-hover:opacity-100"
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
                                    View Post
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
                          {post.published_at && (
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(post.published_at), 'MMM d, yyyy')}
                            </span>
                          )}
                        </div>

                        {post.keywords && post.keywords.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {post.keywords.slice(0, 3).map((kw, i) => (
                              <span
                                key={i}
                                className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                              >
                                {kw}
                              </span>
                            ))}
                            {post.keywords.length > 3 && (
                              <span className="text-[10px] text-muted-foreground">
                                +{post.keywords.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPost ? 'Edit Blog Post' : 'Add Blog Post'}</DialogTitle>
            <DialogDescription>
              {editingPost ? 'Update the blog post details' : 'Track a new blog post for SEO'}
            </DialogDescription>
          </DialogHeader>

          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project_id">Project</Label>
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
              <Label htmlFor="url">URL</Label>
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
                <Select name="status" defaultValue={editingPost?.status || 'draft'}>
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
                      : ''
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
