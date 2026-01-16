'use client';

import { useProjectPipeline, type ProjectsByPhase } from '@/lib/swr';
import { ProjectPipelineKanban } from '@/components/project-pipeline-kanban';

interface ProjectsPipelineClientProps {
  initialData: ProjectsByPhase;
}

export function ProjectsPipelineClient({ initialData }: ProjectsPipelineClientProps) {
  const { projectsByPhase } = useProjectPipeline(initialData);

  return <ProjectPipelineKanban projectsByPhase={projectsByPhase} />;
}
