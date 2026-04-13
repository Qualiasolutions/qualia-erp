'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createExpenseSchema, updateExpenseSchema } from '@/lib/validation';
import { isUserAdmin } from '@/app/actions';
import { getZohoAllInvoices, getZohoPayments } from '@/lib/integrations/zoho';

const TRACKING_START_DATE = '2026-01-15';

// Zoho Invoice customer names → portal project names
// Only customers in this map appear in financials
const ZOHO_CUSTOMER_TO_PROJECT: Record<string, string> = {
  'CSC Zyprus Property Group Ltd': 'Sophia - Zyprus',
  'GSC UNDERDOG SALES LTD': 'Underdog',
  'K.T.E CAR COLOURING LTD': 'LuxCars',
  'Mr. Marco Pellizzeri': 'Doctor Marco',
  'PETA TRADING LTD': 'Peta',
  'Sakani (Smart IT Buildings L.L.C.)': 'Sakani',
  'Sofian & Shehadeh (sslaw)': 'SS Law',
  "Urban's & Melon's & Kids Festive": 'Urban',
  Woodlocation: 'Wood Location',
};

const ALLOWED_CUSTOMERS = new Set(Object.keys(ZOHO_CUSTOMER_TO_PROJECT));

function mapCustomerName(zohoName: string): string {
  return ZOHO_CUSTOMER_TO_PROJECT[zohoName] ?? zohoName;
}

/** Check if the current session user is an admin via role-based lookup */
async function checkAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  return isUserAdmin(user.id);
}

export type FinancialInvoice = {
  zoho_id: string;
  invoice_number: string;
  customer_name: string;
  status: string;
  date: string;
  due_date: string | null;
  total: number;
  balance: number;
  currency_code: string;
  last_payment_date: string | null;
  is_hidden: boolean;
};

export type FinancialPayment = {
  zoho_id: string;
  payment_number: string;
  customer_name: string;
  date: string;
  amount: number;
  payment_mode: string;
  description: string;
  invoice_numbers: string;
};

export type MonthlyExpenseBreakdown = {
  month: string; // YYYY-MM
  total: number;
  byCategory: { category: string; amount: number }[];
};

export type RecurringClient = {
  customer_name: string;
  monthly_total: number;
  frequency: string; // e.g. "Monthly"
  last_invoice_date: string;
};

export type FinancialSummary = {
  totalInvoiced: number;
  totalCollected: number;
  totalOutstanding: number;
  totalOverdue: number;
  overdueCount: number;
  thisMonthCollected: number;
  lastMonthCollected: number;
  recentPayments: FinancialPayment[];
  overdueInvoices: FinancialInvoice[];
  draftInvoices: FinancialInvoice[];
  hiddenInvoices: FinancialInvoice[];
  clientBalances: {
    customer_name: string;
    total_invoiced: number;
    total_outstanding: number;
    invoice_count: number;
  }[];
  monthlyRevenue: { month: string; amount: number }[];
  lastSyncedAt: string | null;
  monthlyExpenses: MonthlyExpenseBreakdown[];
  totalExpensesThisMonth: number;
  netCashFlowByMonth: { month: string; revenue: number; expenses: number; net: number }[];
  recurringClients: RecurringClient[];
  allInvoices: FinancialInvoice[];
  allPayments: FinancialPayment[];
};

export async function getFinancialSummary(): Promise<FinancialSummary | null> {
  if (!(await checkAdmin())) return null;

  const supabase = await createClient();

  const [{ data: invoices }, { data: payments }, { data: expensesRaw }] = await Promise.all([
    supabase.from('financial_invoices').select('*').order('date', { ascending: false }),
    supabase.from('financial_payments').select('*').order('date', { ascending: false }),
    supabase.from('expenses').select('*').order('date', { ascending: false }),
  ]);

  if (!invoices || !payments) return null;
  const expenses = expensesRaw ?? [];

  // Filter to only Zoho customers that match portal projects and map names
  const filteredInvoices = invoices
    .filter((i) => ALLOWED_CUSTOMERS.has(i.customer_name))
    .map((i) => ({ ...i, customer_name: mapCustomerName(i.customer_name) }));
  const filteredPayments = payments
    .filter((p) => ALLOWED_CUSTOMERS.has(p.customer_name))
    .map((p) => ({ ...p, customer_name: mapCustomerName(p.customer_name) }));

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;

  // Separate hidden invoices
  const hiddenInvoices = filteredInvoices.filter((i) => i.is_hidden) as FinancialInvoice[];
  const visibleInvoices = filteredInvoices.filter((i) => !i.is_hidden);

  // Only count invoices from tracking start date for totals
  const trackedInvoices = visibleInvoices.filter((i) => i.date >= TRACKING_START_DATE);
  const trackedPayments = filteredPayments.filter((p) => p.date >= TRACKING_START_DATE);

  // KPIs
  const totalInvoiced = trackedInvoices
    .filter((i) => i.status !== 'void')
    .reduce((sum, i) => sum + Number(i.total), 0);

  const totalCollected = trackedPayments.reduce((sum, p) => sum + Number(p.amount), 0);

  // Outstanding includes ALL visible unpaid invoices (debt is debt)
  const allUnpaid = visibleInvoices.filter(
    (i) => i.status !== 'paid' && i.status !== 'void' && Number(i.balance) > 0
  );
  const totalOutstanding = allUnpaid.reduce((sum, i) => sum + Number(i.balance), 0);

  const overdueInvoices = visibleInvoices.filter(
    (i) => i.status === 'overdue'
  ) as FinancialInvoice[];
  const totalOverdue = overdueInvoices.reduce((sum, i) => sum + Number(i.balance), 0);

  const draftInvoices = allUnpaid.filter((i) => i.status === 'draft') as FinancialInvoice[];

  // This month / last month
  const thisMonthCollected = trackedPayments
    .filter((p) => p.date.startsWith(thisMonth))
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const lastMonthCollected = trackedPayments
    .filter((p) => p.date.startsWith(lastMonth))
    .reduce((sum, p) => sum + Number(p.amount), 0);

  // Client balances (from all visible unpaid invoices)
  const clientMap = new Map<
    string,
    { total_invoiced: number; total_outstanding: number; invoice_count: number }
  >();
  for (const inv of allUnpaid) {
    const existing = clientMap.get(inv.customer_name) || {
      total_invoiced: 0,
      total_outstanding: 0,
      invoice_count: 0,
    };
    existing.total_invoiced += Number(inv.total);
    existing.total_outstanding += Number(inv.balance);
    existing.invoice_count += 1;
    clientMap.set(inv.customer_name, existing);
  }
  const clientBalances = Array.from(clientMap.entries())
    .map(([customer_name, data]) => ({ customer_name, ...data }))
    .sort((a, b) => b.total_outstanding - a.total_outstanding);

  // Monthly revenue (from tracked payments)
  const monthMap = new Map<string, number>();
  for (const p of trackedPayments) {
    const m = p.date.substring(0, 7); // YYYY-MM
    monthMap.set(m, (monthMap.get(m) || 0) + Number(p.amount));
  }
  const monthlyRevenue = Array.from(monthMap.entries())
    .map(([month, amount]) => ({ month, amount }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // Monthly expense breakdown by category
  const expenseMonthMap = new Map<string, Map<string, number>>();
  for (const e of expenses) {
    const m = (e.date as string).substring(0, 7);
    if (!expenseMonthMap.has(m)) expenseMonthMap.set(m, new Map());
    const catMap = expenseMonthMap.get(m)!;
    catMap.set(e.category, (catMap.get(e.category) || 0) + Number(e.amount));
  }
  const monthlyExpenses: MonthlyExpenseBreakdown[] = Array.from(expenseMonthMap.entries())
    .map(([month, catMap]) => {
      const byCategory = Array.from(catMap.entries())
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount);
      const total = byCategory.reduce((s, c) => s + c.amount, 0);
      return { month, total, byCategory };
    })
    .sort((a, b) => a.month.localeCompare(b.month));

  // Total expenses this month
  const totalExpensesThisMonth = expenses
    .filter((e) => (e.date as string).startsWith(thisMonth))
    .reduce((sum, e) => sum + Number(e.amount), 0);

  // Net cash flow by month (merge revenue + expenses)
  const allMonths = new Set([
    ...monthlyRevenue.map((r) => r.month),
    ...monthlyExpenses.map((e) => e.month),
  ]);
  const netCashFlowByMonth = Array.from(allMonths)
    .sort()
    .map((month) => {
      const revenue = monthlyRevenue.find((r) => r.month === month)?.amount ?? 0;
      const expensesAmt = monthlyExpenses.find((e) => e.month === month)?.total ?? 0;
      return { month, revenue, expenses: expensesAmt, net: revenue - expensesAmt };
    });

  // Recurring clients — same customer_name in 3+ invoices
  const invoiceCustomerMap = new Map<
    string,
    { total: number; months: Set<string>; lastDate: string }
  >();
  for (const inv of filteredInvoices) {
    const existing = invoiceCustomerMap.get(inv.customer_name) || {
      total: 0,
      months: new Set<string>(),
      lastDate: inv.date,
    };
    existing.total += Number(inv.total);
    existing.months.add((inv.date as string).substring(0, 7));
    if (inv.date > existing.lastDate) existing.lastDate = inv.date;
    invoiceCustomerMap.set(inv.customer_name, existing);
  }
  // Count raw invoice occurrences per customer
  const invoiceCountMap = new Map<string, number>();
  for (const inv of filteredInvoices) {
    invoiceCountMap.set(inv.customer_name, (invoiceCountMap.get(inv.customer_name) || 0) + 1);
  }
  const recurringClients: RecurringClient[] = Array.from(invoiceCustomerMap.entries())
    .filter(([name]) => (invoiceCountMap.get(name) || 0) >= 3)
    .map(([customer_name, data]) => {
      const monthCount = Math.max(data.months.size, 1);
      const monthly_total = Math.round(data.total / monthCount);
      return {
        customer_name,
        monthly_total,
        frequency: 'Monthly',
        last_invoice_date: data.lastDate,
      };
    })
    .sort((a, b) => b.monthly_total - a.monthly_total);

  // Last synced
  const latestSync = filteredInvoices[0]?.synced_at || filteredPayments[0]?.synced_at || null;

  return {
    totalInvoiced,
    totalCollected,
    totalOutstanding,
    totalOverdue,
    overdueCount: overdueInvoices.length,
    thisMonthCollected,
    lastMonthCollected,
    recentPayments: (trackedPayments as FinancialPayment[]).slice(0, 10),
    overdueInvoices: overdueInvoices.sort((a, b) => Number(b.balance) - Number(a.balance)),
    draftInvoices: draftInvoices.sort(
      (a, b) => Number(b.balance) - Number(a.balance)
    ) as FinancialInvoice[],
    hiddenInvoices,
    clientBalances,
    monthlyRevenue,
    lastSyncedAt: latestSync,
    monthlyExpenses,
    totalExpensesThisMonth,
    netCashFlowByMonth,
    recurringClients,
    allInvoices: visibleInvoices as FinancialInvoice[],
    allPayments: filteredPayments as FinancialPayment[],
  };
}

// ─── Zoho Sync ──────────────────────────────────────────

/**
 * Sync all invoices + payments from Zoho Books into financial_invoices / financial_payments.
 * Uses service role client so it works from cron (no user session).
 * Filters to ALLOWED_CUSTOMERS only.
 */
export async function syncZohoFinancials(): Promise<{
  success: boolean;
  invoiceCount?: number;
  paymentCount?: number;
  error?: string;
}> {
  const workspaceId = process.env.DEFAULT_WORKSPACE_ID;
  if (!workspaceId) {
    return { success: false, error: 'DEFAULT_WORKSPACE_ID env var not set' };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return { success: false, error: 'Missing Supabase credentials' };
  }

  const supabase = createSupabaseClient(supabaseUrl, serviceRoleKey);
  const syncedAt = new Date().toISOString();

  // Fetch from Zoho
  const [invoicesResult, paymentsResult] = await Promise.all([
    getZohoAllInvoices(workspaceId),
    getZohoPayments(workspaceId),
  ]);

  if (!invoicesResult.success) {
    return { success: false, error: `Invoices fetch failed: ${invoicesResult.error}` };
  }
  if (!paymentsResult.success) {
    return { success: false, error: `Payments fetch failed: ${paymentsResult.error}` };
  }

  const zohoInvoices = (invoicesResult.data ?? []).filter((inv) =>
    ALLOWED_CUSTOMERS.has(inv.customer_name)
  );
  const zohoPayments = (paymentsResult.data ?? []).filter((p) =>
    ALLOWED_CUSTOMERS.has(p.customer_name)
  );

  // Build customer_name -> client_id map from projects table
  const projectNames = Object.values(ZOHO_CUSTOMER_TO_PROJECT);
  const { data: projects } = await supabase
    .from('projects')
    .select('name, client_id')
    .in('name', projectNames)
    .not('client_id', 'is', null);

  const customerToClientId = new Map<string, string>();
  if (projects) {
    const projectNameToClientId = new Map(projects.map((p) => [p.name, p.client_id as string]));
    for (const [zohoName, projectName] of Object.entries(ZOHO_CUSTOMER_TO_PROJECT)) {
      const clientId = projectNameToClientId.get(projectName);
      if (clientId) customerToClientId.set(zohoName, clientId);
    }
  }

  // Upsert invoices
  if (zohoInvoices.length > 0) {
    const invoiceRows = zohoInvoices.map((inv) => ({
      zoho_id: inv.invoice_id,
      invoice_number: inv.invoice_number,
      customer_name: inv.customer_name,
      customer_id: inv.customer_id,
      status: inv.status,
      date: inv.date,
      due_date: inv.due_date || null,
      total: inv.total,
      balance: inv.balance,
      currency_code: inv.currency_code,
      last_payment_date: inv.last_payment_date || null,
      synced_at: syncedAt,
      client_id: customerToClientId.get(inv.customer_name) ?? null,
    }));

    const { error } = await supabase
      .from('financial_invoices')
      .upsert(invoiceRows, { onConflict: 'zoho_id' });

    if (error) {
      console.error('[zoho-sync] Invoice upsert error:', error);
      return { success: false, error: `Invoice upsert failed: ${error.message}` };
    }
  }

  // Upsert payments
  if (zohoPayments.length > 0) {
    const paymentRows = zohoPayments.map((p) => ({
      zoho_id: p.payment_id,
      payment_number: p.payment_number,
      customer_name: p.customer_name,
      customer_id: p.customer_id,
      date: p.date,
      amount: p.amount,
      currency_code: p.currency_code,
      payment_mode: p.payment_mode || null,
      description: p.description || null,
      invoice_numbers: (p.invoices ?? []).map((i) => i.invoice_number).join(', ') || null,
      synced_at: syncedAt,
    }));

    const { error } = await supabase
      .from('financial_payments')
      .upsert(paymentRows, { onConflict: 'zoho_id' });

    if (error) {
      console.error('[zoho-sync] Payment upsert error:', error);
      return { success: false, error: `Payment upsert failed: ${error.message}` };
    }
  }

  return {
    success: true,
    invoiceCount: zohoInvoices.length,
    paymentCount: zohoPayments.length,
  };
}

// ─── Hide / Unhide / Delete invoices ──────────────────────

export async function hideInvoice(zohoId: string): Promise<{ success: boolean; error?: string }> {
  if (!(await checkAdmin())) return { success: false, error: 'Unauthorized' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('financial_invoices')
    .update({ is_hidden: true })
    .eq('zoho_id', zohoId);

  if (error) return { success: false, error: error.message };

  return { success: true };
}

export async function unhideInvoice(zohoId: string): Promise<{ success: boolean; error?: string }> {
  if (!(await checkAdmin())) return { success: false, error: 'Unauthorized' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('financial_invoices')
    .update({ is_hidden: false })
    .eq('zoho_id', zohoId);

  if (error) return { success: false, error: error.message };

  return { success: true };
}

export async function deleteInvoice(zohoId: string): Promise<{ success: boolean; error?: string }> {
  if (!(await checkAdmin())) return { success: false, error: 'Unauthorized' };

  const supabase = await createClient();
  const { error } = await supabase.from('financial_invoices').delete().eq('zoho_id', zohoId);

  if (error) return { success: false, error: error.message };

  return { success: true };
}

// ─── Expenses CRUD ────────────────────────────────────────

export type Expense = {
  id: string;
  amount: number;
  category: string;
  date: string;
  description: string | null;
  created_at: string;
};

export async function getExpenses(): Promise<Expense[]> {
  if (!(await checkAdmin())) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from('expenses')
    .select('id, amount, category, date, description, created_at')
    .order('date', { ascending: false });
  return (data as Expense[]) ?? [];
}

export async function createExpense(data: unknown): Promise<{ success: boolean; error?: string }> {
  if (!(await checkAdmin())) return { success: false, error: 'Unauthorized' };

  const parsed = createExpenseSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Validation failed' };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('expenses').insert(parsed.data);

  if (error) return { success: false, error: error.message };

  return { success: true };
}

export async function updateExpense(data: unknown): Promise<{ success: boolean; error?: string }> {
  if (!(await checkAdmin())) return { success: false, error: 'Unauthorized' };

  const parsed = updateExpenseSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Validation failed' };
  }

  const { id, ...fields } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from('expenses')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return { success: false, error: error.message };

  return { success: true };
}

export async function deleteExpense(id: string): Promise<{ success: boolean; error?: string }> {
  if (!(await checkAdmin())) return { success: false, error: 'Unauthorized' };

  const supabase = await createClient();
  const { error } = await supabase.from('expenses').delete().eq('id', id);

  if (error) return { success: false, error: error.message };

  return { success: true };
}
