/**
 * Actions Index
 *
 * This file re-exports all server actions for backward compatibility.
 * Actions are organized by domain in separate files:
 * - shared.ts: Types and authorization helpers
 * - workspace.ts: Workspace management (future)
 * - issues.ts: Issue CRUD (future)
 * - projects.ts: Project CRUD (future)
 * - clients.ts: Client CRM (future)
 * - meetings.ts: Meeting/schedule (future)
 * - phases.ts: Project roadmap phases (future)
 *
 * For now, we re-export everything from the main actions.ts file.
 * Domain-specific imports will be migrated gradually.
 */

// Re-export everything from the main actions file for backward compatibility
export * from '../actions';

// Export shared types and helpers
export type { ActionResult, ActivityType, ProfileRef } from './shared';
export {
  isUserAdmin,
  canDeleteIssue,
  canDeleteProject,
  canDeleteMeeting,
  canDeleteClient,
  canDeletePhase,
  canDeletePhaseItem,
} from './shared';

// Export utility types and functions from server-utils
export type { FKResponse } from '@/lib/server-utils';
export { normalizeFKResponse } from '@/lib/server-utils';

// Export health monitoring actions
export {
  getWorkspaceHealthDashboard,
  getProjectHealthDetails,
  recordProjectHealth,
  recordAllProjectsHealth,
  acknowledgeInsight,
  resolveInsight,
  dismissInsight,
} from './health';
export type { HealthMetrics, ProjectHealthData, HealthInsight } from './health';
