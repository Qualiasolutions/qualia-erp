'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, CheckCircle2, Circle, Clock } from 'lucide-react';
import { getProjectPhasesForPreview } from '@/app/actions/portal-import';
import { format } from 'date-fns';

type Phase = {
  id: string;
  name: string;
  description: string | null;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  sort_order: number;
};

type Project = {
  id: string;
  name: string;
  description: string | null;
  project_type: string | null;
  project_status: string | null;
};

type PreviewData = {
  project: Project;
  phases: Phase[];
};

type RoadmapPreviewModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
};

export function RoadmapPreviewModal({ open, onOpenChange, projectId }: RoadmapPreviewModalProps) {
  const [data, setData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId || !open) {
      setData(null);
      setError(null);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      const result = await getProjectPhasesForPreview(projectId);

      if (result.success && result.data) {
        setData(result.data as PreviewData);
      } else {
        setError(result.error || 'Failed to load roadmap');
      }

      setLoading(false);
    };

    fetchData();
  }, [projectId, open]);

  const getPhaseStatusBadge = (status: string | null) => {
    const normalizedStatus = status?.toLowerCase() || 'pending';

    if (normalizedStatus === 'completed' || normalizedStatus === 'done') {
      return (
        <Badge className="gap-1.5 bg-green-500/10 text-green-600 hover:bg-green-500/20">
          <CheckCircle2 className="h-3 w-3" />
          Completed
        </Badge>
      );
    }

    if (
      normalizedStatus === 'in_progress' ||
      normalizedStatus === 'in progress' ||
      normalizedStatus === 'active'
    ) {
      return (
        <Badge className="gap-1.5 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20">
          <Clock className="h-3 w-3" />
          In Progress
        </Badge>
      );
    }

    return (
      <Badge variant="secondary" className="gap-1.5">
        <Circle className="h-3 w-3" />
        Pending
      </Badge>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch {
      return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {loading ? 'Loading Preview...' : `Portal Preview: ${data?.project.name || ''}`}
          </DialogTitle>
          <DialogDescription>
            This is exactly what clients will see in their portal
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="space-y-4 py-8">
            {/* Skeleton loader */}
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse space-y-2">
                <div className="h-4 w-1/3 rounded bg-muted" />
                <div className="h-3 w-2/3 rounded bg-muted" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {!loading && !error && data && (
          <div className="space-y-6">
            {/* Project description if available */}
            {data.project.description && (
              <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                <p className="text-sm text-muted-foreground">{data.project.description}</p>
              </div>
            )}

            {/* Phase timeline */}
            {data.phases.length === 0 ? (
              <div className="rounded-lg border border-dashed border-muted-foreground/30 px-6 py-12 text-center">
                <Circle className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
                <p className="text-sm font-medium text-muted-foreground">
                  No roadmap configured for this project
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Add phases to the project to display a roadmap timeline
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Project Roadmap
                </h3>
                <div className="relative space-y-6 border-l-2 border-border pl-6">
                  {data.phases.map((phase, index) => (
                    <div key={phase.id} className="relative">
                      {/* Timeline dot */}
                      <div className="absolute -left-[26px] top-1 h-3 w-3 rounded-full border-2 border-border bg-background" />

                      <div className="space-y-2">
                        {/* Phase header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-muted-foreground">
                                Phase {index + 1}
                              </span>
                              {getPhaseStatusBadge(phase.status)}
                            </div>
                            <h4 className="font-semibold leading-tight">{phase.name}</h4>
                          </div>
                        </div>

                        {/* Phase description */}
                        {phase.description && (
                          <p className="text-sm text-muted-foreground">{phase.description}</p>
                        )}

                        {/* Phase dates */}
                        {(phase.start_date || phase.end_date) && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {formatDate(phase.start_date) || 'TBD'}
                            {' — '}
                            {formatDate(phase.end_date) || 'TBD'}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-end border-t border-border pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
