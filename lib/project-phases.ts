/**
 * Predefined project phases by project type
 * Used for task grouping and progress tracking
 */

export type ProjectType = 'ai_agent' | 'voice_agent' | 'web_design' | 'seo' | 'ads';

export interface Phase {
  name: string;
  order: number;
  description?: string;
}

export const PROJECT_PHASES: Record<ProjectType, Phase[]> = {
  ai_agent: [
    { name: 'Research', order: 1, description: 'Define requirements and explore solutions' },
    { name: 'Design', order: 2, description: 'Architecture and system design' },
    { name: 'Build', order: 3, description: 'Core development and implementation' },
    { name: 'Test', order: 4, description: 'Testing and quality assurance' },
    { name: 'Deploy', order: 5, description: 'Deployment and launch' },
  ],
  voice_agent: [
    { name: 'Script', order: 1, description: 'Write conversation scripts and flows' },
    { name: 'Voice Setup', order: 2, description: 'Configure voice and speech settings' },
    { name: 'Integration', order: 3, description: 'Connect to backend systems' },
    { name: 'Testing', order: 4, description: 'Test conversations and edge cases' },
    { name: 'Launch', order: 5, description: 'Go live and monitor' },
  ],
  web_design: [
    { name: 'Discovery', order: 1, description: 'Understand goals and requirements' },
    { name: 'Wireframes', order: 2, description: 'Create layout and structure' },
    { name: 'Design', order: 3, description: 'Visual design and branding' },
    { name: 'Development', order: 4, description: 'Build and implement' },
    { name: 'Launch', order: 5, description: 'Deploy and handoff' },
  ],
  seo: [
    { name: 'Audit', order: 1, description: 'Analyze current SEO state' },
    { name: 'Strategy', order: 2, description: 'Plan optimization approach' },
    { name: 'Implementation', order: 3, description: 'Execute SEO improvements' },
    { name: 'Monitoring', order: 4, description: 'Track results and adjust' },
  ],
  ads: [
    { name: 'Strategy', order: 1, description: 'Define campaign goals and targeting' },
    { name: 'Creative', order: 2, description: 'Design ads and copy' },
    { name: 'Launch', order: 3, description: 'Deploy campaigns' },
    { name: 'Optimize', order: 4, description: 'Analyze and improve performance' },
  ],
};

/**
 * Get phases for a project type
 */
export function getPhasesForType(projectType: string | null): Phase[] {
  if (!projectType) return [];
  return PROJECT_PHASES[projectType as ProjectType] || [];
}

/**
 * Get all unique phase names across all project types
 */
export function getAllPhaseNames(): string[] {
  const names = new Set<string>();
  Object.values(PROJECT_PHASES).forEach((phases) => {
    phases.forEach((phase) => names.add(phase.name));
  });
  return Array.from(names).sort();
}

/**
 * Get phase by name for a project type
 */
export function getPhase(projectType: string, phaseName: string): Phase | undefined {
  const phases = getPhasesForType(projectType);
  return phases.find((p) => p.name === phaseName);
}
