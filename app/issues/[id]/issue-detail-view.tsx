'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
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
  Users,
  Calendar,
} from 'lucide-react';
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
import { updateIssue, deleteIssue, createComment, getIssueById } from '@/app/actions';
import { formatTimeAgo } from '@/lib/utils';

const STATUSES = ['Yet to Start', 'Todo', 'In Progress', 'Done', 'Canceled'];
const PRIORITIES = ['No Priority', 'Urgent', 'High', 'Medium', 'Low'];

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
  team: { id: string; name: string; key: string } | null;
  comments: Comment[];
}

interface Team {
  id: string;
  name: string;
  key: string;
}

interface Project {
  id: string;
  name: string;
}

interface IssueDetailViewProps {
  issue: Issue;
  teams: Team[];
  projects: Project[];
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
      return <Circle className="h-4 w-4 fill-yellow-500/20 text-yellow-500" />;
    case 'Canceled':
      return <Circle className="h-4 w-4 text-red-500" />;
    default:
      return <Circle className="h-4 w-4 text-muted-foreground" />;
  }
};

export function IssueDetailView({ issue: initialIssue, teams, projects }: IssueDetailViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [issue, setIssue] = useState<Issue>(initialIssue);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state initialized from server-fetched data
  const [title, setTitle] = useState(initialIssue.title);
  const [description, setDescription] = useState(initialIssue.description || '');
  const [status, setStatus] = useState(initialIssue.status);
  const [priority, setPriority] = useState(initialIssue.priority);
  const [teamId, setTeamId] = useState<string | null>(initialIssue.team?.id || null);
  const [projectId, setProjectId] = useState<string | null>(initialIssue.project?.id || null);

  // Comment state
  const [newComment, setNewComment] = useState('');
  const [addingComment, setAddingComment] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    const formData = new FormData();
    formData.set('id', issue.id);
    formData.set('title', title);
    formData.set('description', description);
    formData.set('status', status);
    formData.set('priority', priority);
    if (teamId) formData.set('team_id', teamId);
    if (projectId) formData.set('project_id', projectId);

    const result = await updateIssue(formData);
    if (result.success) {
      // Refresh issue data
      const updatedIssue = await getIssueById(issue.id);
      if (updatedIssue) setIssue(updatedIssue as Issue);
    } else {
      setError(result.error || 'Failed to update issue');
    }

    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this issue?')) return;

    startTransition(async () => {
      const result = await deleteIssue(issue.id);
      if (result.success) {
        router.push('/issues');
      } else {
        setError(result.error || 'Failed to delete issue');
      }
    });
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setAddingComment(true);
    const formData = new FormData();
    formData.set('issue_id', issue.id);
    formData.set('body', newComment);

    const result = await createComment(formData);
    if (result.success) {
      setNewComment('');
      // Refresh issue data to get new comment
      const updatedIssue = await getIssueById(issue.id);
      if (updatedIssue) setIssue(updatedIssue as Issue);
    } else {
      setError(result.error || 'Failed to add comment');
    }

    setAddingComment(false);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border bg-background px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href="/issues" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2">
            <StatusIcon status={status} />
            <span className="font-mono text-xs text-muted-foreground">{issue.id.slice(0, 8)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={isPending}
            className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
          >
            <Trash2 className="mr-1 h-4 w-4" />
            Delete
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="bg-qualia-600 hover:bg-qualia-500"
          >
            <Save className="mr-1 h-4 w-4" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </header>

      {error && (
        <div className="border-b border-red-500/20 bg-red-500/10 px-6 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl p-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Main Content */}
            <div className="space-y-6 lg:col-span-2">
              {/* Title */}
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="border-0 bg-transparent px-0 text-xl font-semibold text-foreground placeholder:text-muted-foreground focus-visible:ring-0"
                placeholder="Issue title"
              />

              {/* Description */}
              <div>
                <label className="mb-2 block text-xs text-muted-foreground">Description</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[150px] border-border bg-card text-foreground"
                  placeholder="Add a description..."
                />
              </div>

              {/* Comments Section */}
              <div className="border-t border-border pt-6">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-foreground">
                  <MessageSquare className="h-4 w-4" />
                  Comments ({issue.comments.length})
                </h3>

                {/* Comment List */}
                <div className="mb-4 space-y-4">
                  {issue.comments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No comments yet</p>
                  ) : (
                    issue.comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-qualia-900 text-xs text-qualia-200">
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
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <Textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      className="min-h-[80px] border-border bg-card text-foreground"
                    />
                    <div className="mt-2 flex justify-end">
                      <Button
                        size="sm"
                        onClick={handleAddComment}
                        disabled={addingComment || !newComment.trim()}
                        className="bg-qualia-600 hover:bg-qualia-500"
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
              <div className="space-y-4 rounded-lg border border-border bg-card p-4">
                {/* Status */}
                <div>
                  <label className="mb-2 block flex items-center gap-1 text-xs text-muted-foreground">
                    <StatusIcon status={status} />
                    Status
                  </label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="border-border bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Priority */}
                <div>
                  <label className="mb-2 block flex items-center gap-1 text-xs text-muted-foreground">
                    <PriorityIcon priority={priority} />
                    Priority
                  </label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger className="border-border bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Team */}
                <div>
                  <label className="mb-2 block flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    Team
                  </label>
                  <Select
                    value={teamId || 'none'}
                    onValueChange={(v) => setTeamId(v === 'none' ? null : v)}
                  >
                    <SelectTrigger className="border-border bg-background">
                      <SelectValue placeholder="No team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No team</SelectItem>
                      {teams.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} ({t.key})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Project */}
                <div>
                  <label className="mb-2 block flex items-center gap-1 text-xs text-muted-foreground">
                    <Folder className="h-3 w-3" />
                    Project
                  </label>
                  <Select
                    value={projectId || 'none'}
                    onValueChange={(v) => setProjectId(v === 'none' ? null : v)}
                  >
                    <SelectTrigger className="border-border bg-background">
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
              <div className="space-y-3 rounded-lg border border-border bg-card p-4 text-xs text-muted-foreground">
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
    </div>
  );
}
