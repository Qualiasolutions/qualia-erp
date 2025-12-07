'use client';

import { useState, useEffect, useTransition } from 'react';
import {
  Circle,
  CheckCircle2,
  Clock,
  XCircle,
  Trash2,
  Save,
  MessageSquare,
  User,
  Folder,
  Calendar,
  Loader2,
  AlertTriangle,
  AlertCircle,
  Minus,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

const STATUS_OPTIONS = ['Yet to Start', 'Todo', 'In Progress', 'Done', 'Canceled'];
const PRIORITY_OPTIONS = ['No Priority', 'Urgent', 'High', 'Medium', 'Low'];

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

interface Task {
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

interface TaskDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string | null;
  workspaceId: string;
  onUpdate?: () => void;
}

const PriorityIcon = ({ priority }: { priority: string }) => {
  switch (priority) {
    case 'Urgent':
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    case 'High':
      return <AlertCircle className="h-4 w-4 text-orange-500" />;
    case 'Medium':
      return <Minus className="h-4 w-4 text-yellow-500" />;
    case 'Low':
      return <Circle className="h-4 w-4 text-blue-500" />;
    default:
      return <Minus className="h-4 w-4 text-muted-foreground" />;
  }
};

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'Done':
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    case 'In Progress':
      return <Clock className="h-4 w-4 text-amber-500" />;
    case 'Canceled':
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Circle className="h-4 w-4 text-muted-foreground" />;
  }
};

export function TaskDetailModal({
  open,
  onOpenChange,
  taskId,
  workspaceId,
  onUpdate,
}: TaskDetailModalProps) {
  const [isPending, startTransition] = useTransition();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [projectId, setProjectId] = useState<string | null>(null);

  // Comments
  const [newComment, setNewComment] = useState('');
  const [addingComment, setAddingComment] = useState(false);

  useEffect(() => {
    if (open && taskId) {
      loadTask();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, taskId]);

  async function loadTask() {
    if (!taskId) return;
    setLoading(true);
    setError(null);

    try {
      const [taskData, projectsData] = await Promise.all([
        getIssueById(taskId),
        getProjects(workspaceId),
      ]);

      if (taskData) {
        const normalizedTask = taskData as Task;
        setTask(normalizedTask);
        setTitle(normalizedTask.title);
        setDescription(normalizedTask.description || '');
        setStatus(normalizedTask.status);
        setPriority(normalizedTask.priority);
        setProjectId(normalizedTask.project?.id || null);
      }
      setProjects(projectsData as Project[]);
    } catch {
      setError('Failed to load task');
    }

    setLoading(false);
  }

  const handleSave = async () => {
    if (!task) return;
    setSaving(true);
    setError(null);

    const formData = new FormData();
    formData.set('id', task.id);
    formData.set('title', title);
    formData.set('description', description);
    formData.set('status', status);
    formData.set('priority', priority);
    if (projectId) formData.set('project_id', projectId);

    const result = await updateIssue(formData);
    if (result.success) {
      const updatedTask = await getIssueById(task.id);
      if (updatedTask) setTask(updatedTask as Task);
      onUpdate?.();
    } else {
      setError(result.error || 'Failed to update task');
    }

    setSaving(false);
  };

  const handleDelete = async () => {
    if (!task || !confirm('Are you sure you want to delete this task?')) return;

    startTransition(async () => {
      const result = await deleteIssue(task.id);
      if (result.success) {
        onOpenChange(false);
        onUpdate?.();
      } else {
        setError(result.error || 'Failed to delete task');
      }
    });
  };

  const handleAddComment = async () => {
    if (!task || !newComment.trim()) return;

    setAddingComment(true);
    const formData = new FormData();
    formData.set('issue_id', task.id);
    formData.set('body', newComment);

    const result = await createComment(formData);
    if (result.success) {
      setNewComment('');
      const updatedTask = await getIssueById(task.id);
      if (updatedTask) setTask(updatedTask as Task);
    } else {
      setError(result.error || 'Failed to add comment');
    }

    setAddingComment(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-hidden p-0">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !task ? (
          <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
            <p>Task not found</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <DialogHeader className="border-b border-border px-6 py-4">
              <DialogDescription className="sr-only">View and edit task details</DialogDescription>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <StatusIcon status={status} />
                  <DialogTitle className="text-base font-medium">Task Details</DialogTitle>
                  <span className="font-mono text-xs text-muted-foreground">
                    {task.id.slice(0, 8)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDelete}
                    disabled={isPending}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-qualia-600 hover:bg-qualia-500"
                  >
                    {saving ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-1.5 h-4 w-4" />
                    )}
                    Save
                  </Button>
                </div>
              </div>
            </DialogHeader>

            {/* Content */}
            <div className="flex max-h-[calc(90vh-80px)] flex-col overflow-y-auto">
              <div className="flex-1 space-y-6 p-6">
                {error && (
                  <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </p>
                )}

                {/* Title */}
                <div className="space-y-2">
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="border-0 bg-transparent p-0 text-lg font-semibold shadow-none focus-visible:ring-0"
                    placeholder="Task title"
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="min-h-[100px] resize-none"
                    placeholder="Add a description..."
                  />
                </div>

                {/* Properties */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Status */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <StatusIcon status={status} />
                      Status
                    </label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger>
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
                  <div className="space-y-2">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <PriorityIcon priority={priority} />
                      Priority
                    </label>
                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger>
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
                  <div className="space-y-2">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Folder className="h-3 w-3" />
                      Project
                    </label>
                    <Select value={projectId || ''} onValueChange={(v) => setProjectId(v || null)}>
                      <SelectTrigger>
                        <SelectValue placeholder="No project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Created */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      Created
                    </label>
                    <p className="text-sm">
                      {formatTimeAgo(task.created_at)}
                      {task.creator && (
                        <span className="text-muted-foreground">
                          {' '}
                          by {task.creator.full_name || task.creator.email}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Comments */}
                <div className="space-y-4 border-t border-border pt-6">
                  <h3 className="flex items-center gap-2 font-medium">
                    <MessageSquare className="h-4 w-4" />
                    Comments ({task.comments?.length || 0})
                  </h3>

                  {/* Comment List */}
                  <div className="space-y-3">
                    {task.comments?.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No comments yet</p>
                    ) : (
                      task.comments.map((comment) => (
                        <div key={comment.id} className="rounded-lg bg-muted/50 p-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-qualia-600/20">
                              <User className="h-3 w-3 text-qualia-500" />
                            </div>
                            <span className="text-sm font-medium">
                              {comment.user?.full_name || comment.user?.email || 'Unknown'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatTimeAgo(comment.created_at)}
                            </span>
                          </div>
                          <p className="mt-2 text-sm">{comment.body}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Comment */}
                  <div className="flex gap-2">
                    <Textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Write a comment..."
                      className="min-h-[80px] resize-none"
                    />
                  </div>
                  <Button
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || addingComment}
                    className="bg-qualia-600 hover:bg-qualia-500"
                  >
                    {addingComment ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <MessageSquare className="mr-2 h-4 w-4" />
                    )}
                    Add Comment
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
