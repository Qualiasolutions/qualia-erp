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
export {
  loadTeamTab,
  type TeamPayload,
  type AssignmentProject,
  type TeamTaskStub,
  type TeamProjectLoad,
  type TeamWorkloadPerson,
} from './team';
export {
  loadFinanceTab,
  type FinancePayload,
  type FinanceKpi,
  type FinancePaymentRow,
  type FinanceInvoiceRow,
  type FinanceRecurringRow,
  type FinanceCashFlowMonth,
  type FinanceUpcomingBucket,
  type FinanceClientHealthRow,
  type FinanceAgingBand,
} from './finance';
export {
  loadSystemTab,
  type SystemPayload,
  type AuditLogEntry,
  type FrameworkReportLite,
  type FrameworkReportCompleteness,
  type TokenAssignableProfile,
} from './system';
export {
  getEmployeeProfile,
  getEmployeeTrends,
  getEmployeeHistory,
  type Period,
  type EmployeeProfilePayload,
  type EmployeeTrendsPayload,
  type EmployeeHistoryPayload,
  type EmployeeTaskStub,
  type EmployeeSummary,
  type EmployeeProjectSplit,
  type HoursHeatmapWeek,
  type LatestCheckin,
  type WeeklyPoint,
  type SessionFeedRow,
} from './employee';

export {
  getReportsPerformance,
  type ReportsPerfPayload,
  type EmployeePerfRow,
  type ProjectPerfRow,
  type ReportFlag,
} from './reports-perf';

export { loadClientsTab, type ClientsPayload } from './clients';
export { loadBillingTab, type BillingPayload, type BillingInvoice } from './billing';
export { loadIntegrationsTab, type IntegrationsPayload, type IntegrationRow } from './integrations';

export type ControlTab =
  | 'overview'
  | 'team'
  | 'finance'
  | 'reports'
  | 'system'
  | 'clients'
  | 'billing'
  | 'integrations';

const VALID_TABS = new Set<ControlTab>([
  'team',
  'finance',
  'reports',
  'system',
  'clients',
  'billing',
  'integrations',
]);

export function resolveControlTab(value: string | undefined): ControlTab {
  if (value && VALID_TABS.has(value as ControlTab)) {
    return value as ControlTab;
  }
  return 'overview';
}
