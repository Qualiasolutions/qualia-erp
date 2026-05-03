export { loadOverviewTab, type OverviewPayload, type OverviewKpi } from './overview';
export {
  loadCommandCenter,
  loadCommandCenterFor,
  type CommandCenterPayload,
  type ClockedInRow,
  type AbsentEmployeeRow,
  type TodayReportRow,
  type BlockerRow,
  type MonthProjectRow,
  type OverdueInvoiceRow,
  type ProjectNoDeadlineRow,
  type StaleActionRow,
} from './command-center';
export {
  loadPlanningHealth,
  loadPlanningHealthFor,
  type PlanningHealthPayload,
  type PlanningHealthRow,
} from './planning-health';
export { loadTeamTab, type TeamPayload, type AssignmentProject } from './team';
export {
  loadFinanceTab,
  type FinancePayload,
  type FinanceKpi,
  type FinancePaymentRow,
  type FinanceInvoiceRow,
  type FinanceRecurringRow,
} from './finance';
export {
  loadSystemTab,
  type SystemPayload,
  type AuditLogEntry,
  type FrameworkReportLite,
  type FrameworkReportCompleteness,
  type TokenAssignableProfile,
} from './system';

export type ControlTab = 'overview' | 'team' | 'finance' | 'system';

export function resolveControlTab(value: string | undefined): ControlTab {
  if (value === 'team' || value === 'finance' || value === 'system') {
    return value;
  }
  return 'overview';
}
