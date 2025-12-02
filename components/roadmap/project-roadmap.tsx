'use client';

import { useState, useEffect } from 'react';
import { Map, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { getProjectPhases, initializeProjectPhases } from '@/app/actions';
import { PhaseCard } from './phase-card';
import { InitRoadmapDialog } from './init-roadmap-dialog';
import { AddPhaseDialog } from './add-phase-dialog';
import type { ProjectType } from '@/lib/phase-templates';

interface ProjectRoadmapProps {
  projectId: string;
  projectType: ProjectType | null;
  workspaceId: string;
}

export interface PhaseData {
  id: string;
  name: string;
  description: string | null;
  helper_text: string | null;
  display_order: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'skipped';
  template_key: string | null;
  is_custom: boolean;
  progress: number;
  items: PhaseItemData[];
}

export interface PhaseItemData {
  id: string;
  title: string;
  description: string | null;
  helper_text: string | null;
  display_order: number;
  is_completed: boolean;
  completed_at: string | null;
  linked_issue_id: string | null;
  linked_issue: {
    id: string;
    title: string;
    status: string;
    priority: string;
  } | null;
  completed_by_profile: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export function ProjectRoadmap({ projectId, projectType, workspaceId }: ProjectRoadmapProps) {
  const [phases, setPhases] = useState<PhaseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInit, setShowInit] = useState(false);
  const [initializing, setInitializing] = useState(false);

  useEffect(() => {
    loadPhases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function loadPhases() {
    setLoading(true);
    const data = await getProjectPhases(projectId);
    setPhases(data as PhaseData[]);
    setLoading(false);

    // Show init dialog if no phases exist
    if (data.length === 0) {
      setShowInit(true);
    }
  }

  async function handleInitialize(type: ProjectType) {
    setInitializing(true);
    const result = await initializeProjectPhases(projectId, type);
    if (result.success) {
      await loadPhases();
      setShowInit(false);
    }
    setInitializing(false);
  }

  // Calculate overall progress
  const totalItems = phases.reduce((sum, p) => sum + (p.items?.length || 0), 0);
  const completedItems = phases.reduce(
    (sum, p) => sum + (p.items?.filter((i) => i.is_completed).length || 0),
    0
  );
  const overallProgress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-qualia-500/10">
            <Map className="h-5 w-5 text-qualia-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Project Roadmap</h2>
            <p className="text-sm text-muted-foreground">
              {completedItems} of {totalItems} tasks completed
            </p>
          </div>
        </div>
        {phases.length > 0 && (
          <AddPhaseDialog
            projectId={projectId}
            workspaceId={workspaceId}
            onSuccess={loadPhases}
            nextOrder={phases.length}
          />
        )}
      </div>

      {/* Overall Progress */}
      {totalItems > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Overall Progress</span>
            <span className="text-sm font-medium">{overallProgress}%</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </div>
      )}

      {/* Phases */}
      {phases.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-12 text-center">
          <Map className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-medium">No roadmap yet</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Start with a template based on your project type
          </p>
          <Button onClick={() => setShowInit(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Initialize Roadmap
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {phases.map((phase, index) => (
            <PhaseCard
              key={phase.id}
              phase={phase}
              phaseNumber={index + 1}
              projectId={projectId}
              onUpdate={loadPhases}
            />
          ))}
        </div>
      )}

      {/* Init Dialog */}
      <InitRoadmapDialog
        open={showInit}
        onOpenChange={setShowInit}
        projectType={projectType}
        onSelect={handleInitialize}
        loading={initializing}
      />
    </div>
  );
}
