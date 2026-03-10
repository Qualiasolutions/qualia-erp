/**
 * Actions Re-export Router
 *
 * This file re-exports all server actions from domain-specific modules for backward compatibility.
 * All existing imports like `import { getProjects } from '@/app/actions'` continue working.
 *
 * Note: This file does NOT have 'use server' because it's a pure re-export router.
 * Each domain module has its own 'use server' directive.
 *
 * Domain modules:
 * - workspace.ts: Workspace management
 * - teams.ts: Team CRUD
 * - activities.ts: Activity feed
 * - notifications.ts: Notification system
 * - clients.ts: Client CRM
 * - meetings.ts: Meeting scheduling
 * - issues.ts: Issue/task management
 * - projects.ts: Project management
 * - auth.ts: Authentication and admin
 * - zoho.ts: Zoho integration (invoices, email, contacts)
 * - shared.ts: Types and authorization helpers
 */

// ============ SHARED TYPES & HELPERS ============
export type { ActionResult, ActivityType, ProfileRef } from './actions/shared';
export {
  isUserAdmin,
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
} from './actions/shared';

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
} from './actions/workspace';

// ============ TEAMS ============
export { createTeam, getTeams, getTeamById, updateTeam, deleteTeam } from './actions/teams';

// ============ ACTIVITIES ============
export type { Activity } from './actions/activities';
export { getRecentActivities, deleteActivity } from './actions/activities';

// ============ NOTIFICATIONS ============
export type { NotificationType } from './actions/notifications';
export {
  createNotification,
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  notifyTaskAssigned,
} from './actions/notifications';

// ============ CLIENTS ============
export type { LeadStatus } from './actions/clients';
export {
  createClientRecord,
  getClients,
  getClientById,
  updateClientRecord,
  deleteClientRecord,
  logClientActivity,
  toggleClientStatus,
} from './actions/clients';

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
} from './actions/meetings';

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
} from './actions/issues';

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
} from './actions/projects';

// ============ AUTH ============
export { loginAction, getAdminStatus, getProfiles } from './actions/auth';

// ============ ZOHO ============
export {
  createInvoice,
  fetchInvoices,
  sendEmail,
  searchContacts,
  syncZohoToERP,
} from './actions/zoho';
