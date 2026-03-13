/**
 * Actions Index
 *
 * This file re-exports all server actions for deep imports.
 * Import from '@/app/actions' for the main re-export router,
 * or import from '@/app/actions/[domain]' for domain-specific imports.
 *
 * Domain modules:
 * - shared.ts: Types and authorization helpers
 * - workspace.ts: Workspace management
 * - teams.ts: Team CRUD
 * - activities.ts: Activity feed
 * - notifications.ts: Notification system
 * - clients.ts: Client CRM
 * - meetings.ts: Meeting scheduling
 * - issues.ts: Issue/task management
 * - projects.ts: Project management
 * - auth.ts: Authentication and admin
 * - inbox.ts: Task inbox management
 * - phases.ts: Project roadmap phases
 * - daily-flow.ts: Dashboard data
 * - project-files.ts: Project file storage
 * - health.ts: Health monitoring
 * - logos.ts: Logo upload
 * - payments.ts: Payment tracking
 * - learning.ts: Mentorship features
 */

// ============ SHARED TYPES & HELPERS ============
export type { ActionResult, ActivityType, ProfileRef } from './shared';
export {
  isUserAdmin,
  isUserManagerOrAbove,
  getUserRole,
  canDeleteIssue,
  canDeleteProject,
  canDeleteMeeting,
  canDeleteClient,
  canDeletePhase,
  canDeletePhaseItem,
  canModifyTask,
  canAccessProject,
  canDeleteProjectFile,
  createActivity,
} from './shared';

// ============ UTILITY TYPES ============
export type { FKResponse } from '@/lib/server-utils';
export { normalizeFKResponse } from '@/lib/server-utils';

// ============ WORKSPACE ============
export {
  getCurrentWorkspaceId,
  getCurrentUserProfile,
  getWorkspaces,
  getUserWorkspaces,
  setDefaultWorkspace,
  createWorkspace,
  addWorkspaceMember,
  removeWorkspaceMember,
  getWorkspaceMembers,
} from './workspace';

// ============ TEAMS ============
export { createTeam, getTeams, getTeamById, updateTeam, deleteTeam } from './teams';

// ============ ACTIVITIES ============
export type { Activity } from './activities';
export { getRecentActivities, deleteActivity } from './activities';

// ============ NOTIFICATIONS ============
export type { NotificationType } from './notifications';
export {
  createNotification,
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  notifyTaskAssigned,
} from './notifications';

// ============ CLIENTS ============
export type { LeadStatus } from './clients';
export {
  createClientRecord,
  getClients,
  getClientById,
  updateClientRecord,
  deleteClientRecord,
  logClientActivity,
  toggleClientStatus,
} from './clients';

// ============ MEETINGS ============
export {
  createMeeting,
  getMeetings,
  updateMeeting,
  deleteMeeting,
  createInstantMeeting,
  updateMeetingLink,
  addMeetingAttendee,
  removeMeetingAttendee,
  updateMeetingAttendeeStatus,
} from './meetings';

// ============ ISSUES ============
export {
  createIssue,
  updateIssue,
  deleteIssue,
  getIssueById,
  createComment,
  addIssueAssignee,
  removeIssueAssignee,
  getIssueAssignees,
  getScheduledIssues,
  scheduleIssue,
  unscheduleIssue,
} from './issues';

// ============ PROJECTS ============
export {
  createProject,
  getProjects,
  getProjectStats,
  getProjectById,
  updateProject,
  deleteProject,
  updateProjectPhaseProgress,
  bulkDeleteProjects,
  updateProjectStatus,
  toggleProjectPreProduction,
  reorderProject,
  getBoardTasks,
  createProjectWithRoadmap,
} from './projects';

// ============ AUTH ============
export { loginAction, getAdminStatus, getProfiles } from './auth';

// ============ HEALTH MONITORING ============
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

// ============ INBOX (TASKS) ============
export type { Task } from './inbox';
export {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  reorderTasks,
  getProjectTasks,
  toggleTaskInbox,
  quickUpdateTask,
} from './inbox';

// ============ PHASES (ROADMAP) ============
export {
  createProjectPhase,
  updateProjectPhase,
  deleteProjectPhase,
  getProjectPhases,
  completePhase,
  checkPhaseProgress,
  unlockPhase,
  getPhaseProgressStats,
} from './phases';

// ============ PROJECT FILES ============
export {
  getProjectFiles,
  uploadProjectFile,
  deleteProjectFile,
  getFileDownloadUrl,
} from './project-files';

// ============ LOGOS ============
export { uploadProjectLogo, uploadClientLogo, deleteProjectLogo, deleteClientLogo } from './logos';

// ============ DAILY FLOW ============
export type { DailyFlowData, DailyMeeting, FocusProject, TeamMember } from './daily-flow';
export { getDailyFlowData } from './daily-flow';

// ============ PAYMENTS ============
export type { Payment, RecurringPayment } from './payments';
export {
  getPayments,
  createPayment,
  updatePayment,
  deletePayment,
  clearAllPayments,
  getPaymentsSummary,
  getRecurringPayments,
  createRecurringPayment,
  updateRecurringPayment,
  deleteRecurringPayment,
  getRecurringSummary,
} from './payments';

// ============ LEARNING ============
export {
  updateLearnMode,
  getExtendedProfile,
  completeOnboardingStep,
  getSkillCategories,
  getSkills,
  getUserSkills,
  logSkillPractice,
  getAchievements,
  getUserAchievements,
  awardAchievement,
  markAchievementSeen,
  getTeachingNotes,
  createTeachingNote,
  deleteTeachingNote,
  createTaskReflection,
  submitForReview,
  approveTask,
  requestRevision,
  delegateToMoayad,
  getTodaysFocus,
  getSkillGrowthSummary,
} from './learning';

// ============ DEPLOYMENTS ============
export {
  getProjectDeployments,
  getProjectEnvironments,
  getDeploymentStats,
  checkEnvironmentHealth,
  linkVercelProject,
} from './deployments';

// ============ PIPELINE ============
export {
  getPhaseResources,
  createPhaseResource,
  updatePhaseResource,
  deletePhaseResource,
  getProjectNotes,
  getAllProjectNotes,
  createProjectNote,
  updateProjectNote,
  deleteProjectNote,
  initializeProjectPipeline,
  updatePhaseStatus,
  updatePhaseName,
  deletePhase,
  createPhase,
  getProjectPhasesWithDetails,
  resetAllPhaseTasks,
  linkTasksToPhases,
  initializePipelinesForAllProjects,
  populateDefaultTasksForAllProjects,
  getPhaseTasks,
  updateAllProjectPhaseTasks,
  migrateAllProjectsToGSD,
} from './pipeline';

// ============ INTEGRATIONS ============
export {
  getIntegrations,
  saveIntegrationToken,
  removeIntegration,
  testIntegration,
  updateGitHubTemplates,
  startProvisioning,
  getProjectProvisioningStatus,
  retryProvisioning,
  checkIntegrationsConfigured,
} from './integrations';

// ============ TIME TRACKING ============
import type { Tables } from '@/types/database';
export type TimeEntry = Tables<'time_entries'>;
export {
  startTimer,
  stopTimer,
  createTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
  getDailyTimeEntries,
  getWeeklySummary,
  getRunningTimer,
} from './time-tracking';
