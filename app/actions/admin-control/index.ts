export { loadOverviewTab, type OverviewPayload, type OverviewKpi } from './overview';
export { loadClientsTab, type ClientsPayload, type ClientSummaryRow } from './clients';
export { loadTeamTab, type TeamPayload, type AssignmentProject } from './team';
export {
  loadFinanceTab,
  type FinancePayload,
  type FinanceKpi,
  type FinancePaymentRow,
  type FinanceInvoiceRow,
} from './finance';
export {
  loadSystemTab,
  type SystemPayload,
  type IntegrationHealth,
  type AuditLogEntry,
  type FrameworkReportLite,
} from './system';

export type ControlTab = 'overview' | 'clients' | 'team' | 'finance' | 'system';

export function resolveControlTab(value: string | undefined): ControlTab {
  if (value === 'clients' || value === 'team' || value === 'finance' || value === 'system') {
    return value;
  }
  return 'overview';
}
