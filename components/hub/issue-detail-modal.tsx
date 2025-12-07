'use client';

import { useState, useEffect, useTransition } from 'react';
import {
  Circle,
  CheckCircle2,
  SignalHigh,
  SignalMedium,
  SignalLow,
  MoreHorizontal,
  Trash2,
  Save,
  MessageSquare,
  User,
  Folder,
  Calendar,
  Clock,
  XCircle,
  Loader2,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { updateIssue, deleteIssue, createComment, getIssueById, getProjects } from '@/app/actions';
import { formatTimeAgo } from '@/lib/utils';
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from '@/lib/constants/task-config';

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface Comment {
  id: string;
  body: string;
  created_at: string;
  user: Profile | null;
}

interface Issue {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  creator: Profile | null;
  project: { id: string; name: string } | null;
  comments: Comment[];
}

interface Project {
  id: string;
  name: string;
}

interface IssueDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  issueId: string | null;
  workspaceId: string;
  onUpdate?: () => void;
}

const PriorityIcon = ({ priority }: { priority: string }) => {
  switch (priority) {
    case 'Urgent':
      return <SignalHigh className="h-4 w-4 text-red-500" />;
    case 'High':
      return <SignalHigh className="h-4 w-4 text-orange-500" />;
    case 'Medium':
      return <SignalMedium className="h-4 w-4 text-yellow-500" />;
    case 'Low':
      return <SignalLow className="h-4 w-4 text-muted-foreground" />;
    default:
      return <MoreHorizontal className="h-4 w-4 text-muted-foreground" />;
  }
};

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'Done':
      return <CheckCircle2 className="h-4 w-4 text-qualia-500" />;
    case 'In Progress':
      return <Clock className="h-4 w-4 text-yellow-500" />;
    case 'Canceled':
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Circle className="h-4 w-4 text-muted-foreground" />;
  }
};

export function IssueDetailModal({
  open,
  onOpenChange,
  issueId,
  workspaceId,
  onUpdate,
}: IssueDetailModalProps) {
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [issue, setIssue] = useState<Issue | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Todo');
  const [priority, setPriority] = useState('No Priority');
  const [projectId, setProjectId] = useState<string | null>(null);

  // Comment state
  const [newComment, setNewComment] = useState('');
  const [addingComment, setAddingComment] = useState(false);

  useEffect(() => {
    if (open && issueId) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, issueId]);

  async function loadData() {
    if (!issueId) return;
    setLoading(true);
    setError(null);

    try {
      const [issueData, projectsData] = await Promise.all([
        getIssueById(issueId),
        getProjects(workspaceId),
      ]);

      if (issueData) {
        const normalizedIssue = issueData as Issue;
        setIssue(normalizedIssue);
        setTitle(normalizedIssue.title);
        setDescription(normalizedIssue.description || '');
        setStatus(normalizedIssue.status);
        setPriority(normalizedIssue.priority);
        setProjectId(normalizedIssue.project?.id || null);
      }
      setProjects(projectsData as Project[]);
    } catch {
      setError('Failed to load task');
    }

    setLoading(false);
  }

  const handleSave = async () => {
    if (!issue) return;
    setSaving(true);
    setError(null);

    const formData = new FormData();
    formData.set('id', issue.id);
    formData.set('title', title);
    formData.set('description', description);
    formData.set('status', status);
    formData.set('priority', priority);
    if (projectId) formData.set('project_id', projectId);

    const result = await updateIssue(formData);
    if (result.success) {
      const updatedIssue = await getIssueById(issue.id);
      if (updatedIssue) setIssue(updatedIssue as Issue);
      onUpdate?.();
    } else {
      setError(result.error || 'Failed to update task');
    }

    setSaving(false);
  };

  const handleDelete = async () => {
    if (!issue || !confirm('Are you sure you want to delete this task?')) return;

    startTransition(async () => {
      const result = await deleteIssue(issue.id);
      if (result.success) {
        onOpenChange(false);
        onUpdate?.();
      } else {
        setError(result.error || 'Failed to delete task');
      }
    });
  };

  const handleAddComment = async () => {
    if (!issue || !newComment.trim()) return;

    setAddingComment(true);
    const formData = new FormData();
    formData.set('issue_id', issue.id);
    formData.set('body', newComment);

    const result = await createComment(formData);
    if (result.success) {
      setNewComment('');
      const updatedIssue = await getIssueById(issue.id);
      if (updatedIssue) setIssue(updatedIssue as Issue);
    } else {
      setError(result.error || 'Failed to add comment');
    }

    setAddingComment(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-hidden border-border bg-card p-0">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !issue ? (
          <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
            <p>Task not found</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <DialogHeader className="border-b border-border px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <StatusIcon status={status} />
                  <DialogTitle className="text-base font-medium">Task Details</DialogTitle>
                  <span className="font-mono text-xs text-muted-foreground">
                    {issue.id.slice(0, 8)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDelete}
                    disabled={isPending}
                    className="h-8 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    Delete
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={saving}
                    className="h-8 bg-qualia-600 hover:bg-qualia-500"
                  >
                    <Save className="mr-1 h-4 w-4" />
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>
            </DialogHeader>

            {error && (
              <div className="border-b border-red-500/20 bg-red-500/10 px-6 py-2 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Content */}
            <div className="max-h-[calc(85vh-80px)] overflow-y-auto">
              <div className="p-6">
                <div className="flex flex-col-reverse gap-6 lg:grid lg:grid-cols-3">
                  {/* Main Content */}
                  <div className="space-y-5 lg:col-span-2">
                    {/* Title */}
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="border-0 bg-transparent px-0 text-lg font-semibold text-foreground placeholder:text-muted-foreground focus-visible:ring-0"
                      placeholder="Task title"
                    />

                    {/* Description */}
                    <div>
                      <label className="mb-2 block text-xs font-medium text-muted-foreground">
                        Description
                      </label>
                      <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="min-h-[100px] border-border bg-background/50 text-foreground"
                        placeholder="Add a description..."
                      />
                    </div>

                    {/* Comments Section */}
                    <div className="border-t border-border pt-5">
                      <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-foreground">
                        <MessageSquare className="h-4 w-4" />
                        Comments ({issue.comments?.length || 0})
                      </h3>

                      {/* Comment List */}
                      <div className="mb-4 space-y-3">
                        {!issue.comments?.length ? (
                          <p className="text-sm text-muted-foreground">No comments yet</p>
                        ) : (
                          issue.comments.map((comment) => (
                            <div key={comment.id} className="flex gap-3">
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-qualia-900 text-xs text-qualia-200">
                                {comment.user?.full_name?.[0]?.toUpperCase() ||
                                  comment.user?.email?.[0]?.toUpperCase() ||
                                  '?'}
                              </div>
                              <div className="flex-1">
                                <div className="mb-1 flex items-center gap-2">
                                  <span className="text-sm font-medium text-foreground">
                                    {comment.user?.full_name ||
                                      comment.user?.email?.split('@')[0] ||
                                      'Unknown'}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {formatTimeAgo(comment.created_at)}
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground">{comment.body}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Add Comment */}
                      <div className="flex gap-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">
                          <User className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1">
                          <Textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Add a comment..."
                            className="min-h-[60px] border-border bg-background/50 text-foreground"
                          />
                          <div className="mt-2 flex justify-end">
                            <Button
                              size="sm"
                              onClick={handleAddComment}
                              disabled={addingComment || !newComment.trim()}
                              className="h-7 bg-qualia-600 text-xs hover:bg-qualia-500"
                            >
                              {addingComment ? 'Adding...' : 'Add Comment'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sidebar */}
                  <div className="space-y-4">
                    <div className="space-y-4 rounded-lg border border-border bg-background/30 p-4">
                      {/* Status */}
                      <div>
                        <label className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <StatusIcon status={status} />
                          Status
                        </label>
                        <Select value={status} onValueChange={setStatus}>
                          <SelectTrigger className="h-9 border-border bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Priority */}
                      <div>
                        <label className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <PriorityIcon priority={priority} />
                          Priority
                        </label>
                        <Select value={priority} onValueChange={setPriority}>
                          <SelectTrigger className="h-9 border-border bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PRIORITY_OPTIONS.map((p) => (
                              <SelectItem key={p} value={p}>
                                {p}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Project */}
                      <div>
                        <label className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <Folder className="h-3 w-3" />
                          Project
                        </label>
                        <Select
                          value={projectId || 'none'}
                          onValueChange={(v) => setProjectId(v === 'none' ? null : v)}
                        >
                          <SelectTrigger className="h-9 border-border bg-background">
                            <SelectValue placeholder="No project" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No project</SelectItem>
                            {projects.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="space-y-2 rounded-lg border border-border bg-background/30 p-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        Created {formatTimeAgo(issue.created_at)}
                      </div>
                      {issue.creator && (
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3" />
                          By {issue.creator.full_name || issue.creator.email}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        Updated {formatTimeAgo(issue.updated_at)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
