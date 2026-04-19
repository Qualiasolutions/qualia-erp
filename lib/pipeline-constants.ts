/**
 * Pipeline constants for the unified project page
 */

import {
  Link,
  FileText,
  Figma,
  BookOpen,
  Github,
  MoreHorizontal,
  Lightbulb,
  Hammer,
  Rocket,
  Settings,
  MessageCircle,
  CheckCircle2,
} from 'lucide-react';

// ============================================================================
// QUALIA FRAMEWORK 6-STAGE PIPELINE
// ============================================================================

export interface PipelinePhase {
  name: string;
  order: number;
  description: string;
  icon: typeof Lightbulb;
  color: string;
  bgColor: string;
}

/**
 * Qualia Framework Workflow Phases:
 * SETUP → DISCUSS → PLAN → EXECUTE → VERIFY → SHIP
 *
 * This is the universal pipeline applied to all projects.
 * Type-specific tasks are loaded from qualia-framework-templates.ts
 */
export const UNIVERSAL_PIPELINE: PipelinePhase[] = [
  {
    name: 'SETUP',
    order: 1,
    description: 'Gather requirements and configure environment',
    icon: Settings,
    color: 'text-slate-500',
    bgColor: 'bg-slate-500/10',
  },
  {
    name: 'DISCUSS',
    order: 2,
    description: 'Clarify scope and align with stakeholders',
    icon: MessageCircle,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
  {
    name: 'PLAN',
    order: 3,
    description: 'Create detailed implementation plan',
    icon: Lightbulb,
    color: 'text-violet-500',
    bgColor: 'bg-violet-500/10',
  },
  {
    name: 'EXECUTE',
    order: 4,
    description: 'Build and implement the solution',
    icon: Hammer,
    color: 'text-sky-500',
    bgColor: 'bg-sky-500/10',
  },
  {
    name: 'VERIFY',
    order: 5,
    description: 'Test and validate the implementation',
    icon: CheckCircle2,
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
  },
  {
    name: 'SHIP',
    order: 6,
    description: 'Deploy to production and hand off',
    icon: Rocket,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
  },
];

// ============================================================================
// PHASE STATUS
// ============================================================================

export type PhaseStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped';

export const PHASE_STATUS_CONFIG: Record<
  PhaseStatus,
  {
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
    dotColor: string;
    stripColor: string;
  }
> = {
  not_started: {
    label: 'Not Started',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/30',
    borderColor: 'border-border/40',
    dotColor: 'bg-muted-foreground/50',
    stripColor: 'bg-border/50',
  },
  in_progress: {
    label: 'In Progress',
    color: 'text-primary',
    bgColor: 'bg-primary/5',
    borderColor: 'border-primary/40',
    dotColor: 'bg-primary',
    stripColor: 'bg-primary',
  },
  completed: {
    label: 'Completed',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/5',
    borderColor: 'border-emerald-500/40',
    dotColor: 'bg-emerald-500',
    stripColor: 'bg-emerald-500',
  },
  skipped: {
    label: 'Skipped',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/20',
    borderColor: 'border-border/30',
    dotColor: 'bg-muted-foreground/30',
    stripColor: 'bg-muted-foreground/30',
  },
};

// ============================================================================
// RESOURCE TYPES
// ============================================================================

export type ResourceType = 'link' | 'document' | 'figma' | 'notion' | 'github' | 'other';

export const RESOURCE_TYPE_CONFIG: Record<
  ResourceType,
  {
    label: string;
    icon: typeof Link;
    color: string;
    bgColor: string;
  }
> = {
  link: {
    label: 'Link',
    icon: Link,
    color: 'text-sky-500',
    bgColor: 'bg-sky-500/10',
  },
  document: {
    label: 'Document',
    icon: FileText,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  figma: {
    label: 'Figma',
    icon: Figma,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  notion: {
    label: 'Notion',
    icon: BookOpen,
    color: 'text-neutral-600 dark:text-neutral-300',
    bgColor: 'bg-neutral-500/10',
  },
  github: {
    label: 'GitHub',
    icon: Github,
    color: 'text-neutral-800 dark:text-neutral-200',
    bgColor: 'bg-neutral-500/10',
  },
  other: {
    label: 'Other',
    icon: MoreHorizontal,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
  },
};

// ============================================================================
// HELPERS
// ============================================================================

export function getPipelinePhaseConfig(phaseName: string): PipelinePhase | undefined {
  return UNIVERSAL_PIPELINE.find((p) => p.name.toLowerCase() === phaseName.toLowerCase());
}

export function getResourceTypeConfig(type: ResourceType) {
  return RESOURCE_TYPE_CONFIG[type] || RESOURCE_TYPE_CONFIG.other;
}

export function getPhaseStatusConfig(status: PhaseStatus) {
  return PHASE_STATUS_CONFIG[status] || PHASE_STATUS_CONFIG.not_started;
}

// Auto-detect resource type from URL
export function detectResourceType(url: string): ResourceType {
  const lowerUrl = url.toLowerCase();

  if (lowerUrl.includes('figma.com')) return 'figma';
  if (lowerUrl.includes('notion.so') || lowerUrl.includes('notion.site')) return 'notion';
  if (lowerUrl.includes('github.com') || lowerUrl.includes('gitlab.com')) return 'github';
  if (
    lowerUrl.endsWith('.pdf') ||
    lowerUrl.endsWith('.doc') ||
    lowerUrl.endsWith('.docx') ||
    lowerUrl.includes('docs.google.com')
  ) {
    return 'document';
  }

  return 'link';
}
