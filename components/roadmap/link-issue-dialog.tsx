'use client';

import { useState, useEffect } from 'react';
import { Link2, Loader2, Search, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { linkIssueToPhaseItem } from '@/app/actions';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface Issue {
  id: string;
  title: string;
  status: string;
  priority: string;
}

interface LinkIssueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string;
  projectId: string;
  currentIssueId: string | null;
  onSuccess: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  backlog: 'bg-slate-500/10 text-slate-400',
  todo: 'bg-blue-500/10 text-blue-400',
  in_progress: 'bg-yellow-500/10 text-yellow-400',
  in_review: 'bg-purple-500/10 text-purple-400',
  done: 'bg-green-500/10 text-green-400',
  cancelled: 'bg-red-500/10 text-red-400',
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-500/10 text-red-400',
  high: 'bg-orange-500/10 text-orange-400',
  medium: 'bg-yellow-500/10 text-yellow-400',
  low: 'bg-slate-500/10 text-slate-400',
  none: 'bg-slate-500/10 text-slate-400',
};

export function LinkIssueDialog({
  open,
  onOpenChange,
  itemId,
  projectId,
  currentIssueId,
  onSuccess,
}: LinkIssueDialogProps) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(currentIssueId);

  async function loadIssues() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('issues')
      .select('id, title, status, priority')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(50);

    setIssues(data || []);
    setLoading(false);
  }

  useEffect(() => {
    if (open) {
      loadIssues();
      setSelectedId(currentIssueId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, projectId, currentIssueId]);

  async function handleLink() {
    setLinking(true);
    const result = await linkIssueToPhaseItem(itemId, selectedId);
    setLinking(false);

    if (result.success) {
      onOpenChange(false);
      onSuccess();
    }
  }

  const filteredIssues = issues.filter((issue) =>
    issue.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Link Issue</DialogTitle>
          <DialogDescription>Connect a project issue to this task for tracking.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search issues..."
              className="pl-9"
            />
          </div>

          {/* Issue List */}
          <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-border p-1">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredIssues.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {search ? 'No issues match your search' : 'No issues in this project'}
              </div>
            ) : (
              filteredIssues.map((issue) => (
                <button
                  key={issue.id}
                  onClick={() => setSelectedId(selectedId === issue.id ? null : issue.id)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left transition-colors',
                    selectedId === issue.id
                      ? 'border border-qualia-500 bg-qualia-500/10'
                      : 'hover:bg-muted'
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{issue.title}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn('text-xs', STATUS_COLORS[issue.status])}
                      >
                        {issue.status.replace('_', ' ')}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn('text-xs', PRIORITY_COLORS[issue.priority])}
                      >
                        {issue.priority}
                      </Badge>
                    </div>
                  </div>
                  {selectedId === issue.id && (
                    <Link2 className="h-4 w-4 flex-shrink-0 text-qualia-500" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Current Link */}
          {currentIssueId && selectedId !== currentIssueId && (
            <p className="text-xs text-muted-foreground">
              Currently linked to a different issue. Select to update or clear.
            </p>
          )}

          {/* Actions */}
          <div className="flex justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelectedId(null)}
              disabled={!selectedId || linking}
            >
              <X className="mr-2 h-4 w-4" />
              Clear Link
            </Button>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={linking}
              >
                Cancel
              </Button>
              <Button onClick={handleLink} disabled={linking || selectedId === currentIssueId}>
                {linking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {selectedId ? 'Link Issue' : 'Remove Link'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
