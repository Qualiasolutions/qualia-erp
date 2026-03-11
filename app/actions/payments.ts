'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/app/actions';

const ADMIN_EMAIL = 'info@qualiasolutions.net';

export type Payment = {
  id: string;
  type: 'incoming' | 'outgoing';
  amount: number;
  currency: string;
  description: string;
  category: string | null;
  client_id: string | null;
  project_id: string | null;
  payment_date: string;
  status: 'pending' | 'completed' | 'cancelled';
  notes: string | null;
  created_at: string;
  client?: { display_name: string | null; name: string } | null;
  project?: { name: string } | null;
};

export type RecurringPayment = {
  id: string;
  type: 'incoming' | 'outgoing';
  amount: number;
  currency: string;
  description: string;
  category: string | null;
  client_id: string | null;
  project_id: string | null;
  day_of_month: number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  client?: { display_name: string | null; name: string } | null;
  project?: { name: string } | null;
};

async function isAdminUser(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.email === ADMIN_EMAIL;
}

export async function getPayments(): Promise<Payment[]> {
  if (!(await isAdminUser())) {
    return [];
  }

  const supabase = await createClient();
  const workspaceId = await getCurrentWorkspaceId();

  const { data, error } = await supabase
    .from('payments')
    .select(
      `
      *,
      client:clients(display_name, name),
      project:projects(name)
    `
    )
    .eq('workspace_id', workspaceId)
    .order('payment_date', { ascending: true });

  if (error) {
    console.error('Error fetching payments:', error);
    return [];
  }

  return data || [];
}

export async function createPayment(formData: {
  type: 'incoming' | 'outgoing';
  amount: number;
  currency?: string;
  description: string;
  category?: string;
  client_id?: string;
  project_id?: string;
  payment_date?: string;
  status?: 'pending' | 'completed' | 'cancelled';
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!(await isAdminUser())) {
    return { success: false, error: 'Unauthorized' };
  }

  const supabase = await createClient();
  const workspaceId = await getCurrentWorkspaceId();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from('payments').insert({
    workspace_id: workspaceId,
    type: formData.type,
    amount: formData.amount,
    currency: formData.currency || 'EUR',
    description: formData.description,
    category: formData.category || null,
    client_id: formData.client_id || null,
    project_id: formData.project_id || null,
    payment_date: formData.payment_date || new Date().toISOString().split('T')[0],
    status: formData.status || 'pending',
    notes: formData.notes || null,
    created_by: user?.id,
  });

  if (error) {
    console.error('Error creating payment:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/payments');
  return { success: true };
}

export async function updatePayment(
  id: string,
  formData: Partial<{
    type: 'incoming' | 'outgoing';
    amount: number;
    currency: string;
    description: string;
    category: string;
    client_id: string;
    project_id: string;
    payment_date: string;
    status: 'pending' | 'completed' | 'cancelled';
    notes: string;
  }>
): Promise<{ success: boolean; error?: string }> {
  if (!(await isAdminUser())) {
    return { success: false, error: 'Unauthorized' };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from('payments')
    .update({ ...formData, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('Error updating payment:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/payments');
  return { success: true };
}

export async function deletePayment(id: string): Promise<{ success: boolean; error?: string }> {
  if (!(await isAdminUser())) {
    return { success: false, error: 'Unauthorized' };
  }

  const supabase = await createClient();

  const { error } = await supabase.from('payments').delete().eq('id', id);

  if (error) {
    console.error('Error deleting payment:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/payments');
  return { success: true };
}

export async function clearAllPayments(): Promise<{
  success: boolean;
  error?: string;
  count?: number;
}> {
  if (!(await isAdminUser())) {
    return { success: false, error: 'Unauthorized' };
  }

  const supabase = await createClient();
  const workspaceId = await getCurrentWorkspaceId();

  // First count how many will be deleted
  const { count } = await supabase
    .from('payments')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId);

  // Delete all payments for this workspace
  const { error } = await supabase.from('payments').delete().eq('workspace_id', workspaceId);

  if (error) {
    console.error('Error clearing payments:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/payments');
  return { success: true, count: count || 0 };
}

export async function getPaymentsSummary(): Promise<{
  totalIncoming: number;
  totalOutgoing: number;
  pendingIncoming: number;
  pendingOutgoing: number;
}> {
  if (!(await isAdminUser())) {
    return { totalIncoming: 0, totalOutgoing: 0, pendingIncoming: 0, pendingOutgoing: 0 };
  }

  const supabase = await createClient();
  const workspaceId = await getCurrentWorkspaceId();

  const { data, error } = await supabase
    .from('payments')
    .select('type, amount, status')
    .eq('workspace_id', workspaceId);

  if (error || !data) {
    return { totalIncoming: 0, totalOutgoing: 0, pendingIncoming: 0, pendingOutgoing: 0 };
  }

  return data.reduce(
    (acc, payment) => {
      const amount = Number(payment.amount);
      if (payment.type === 'incoming') {
        acc.totalIncoming += amount;
        if (payment.status === 'pending') acc.pendingIncoming += amount;
      } else {
        acc.totalOutgoing += amount;
        if (payment.status === 'pending') acc.pendingOutgoing += amount;
      }
      return acc;
    },
    { totalIncoming: 0, totalOutgoing: 0, pendingIncoming: 0, pendingOutgoing: 0 }
  );
}

// ============ RECURRING PAYMENTS ============

export async function getRecurringPayments(): Promise<RecurringPayment[]> {
  if (!(await isAdminUser())) {
    return [];
  }

  const supabase = await createClient();
  const workspaceId = await getCurrentWorkspaceId();

  const { data, error } = await supabase
    .from('recurring_payments')
    .select(
      `
      *,
      client:clients(display_name, name),
      project:projects(name)
    `
    )
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
    .order('type', { ascending: true })
    .order('amount', { ascending: false });

  if (error) {
    console.error('Error fetching recurring payments:', error);
    return [];
  }

  return data || [];
}

export async function createRecurringPayment(formData: {
  type: 'incoming' | 'outgoing';
  amount: number;
  currency?: string;
  description: string;
  category?: string;
  client_id?: string;
  project_id?: string;
  day_of_month?: number;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!(await isAdminUser())) {
    return { success: false, error: 'Unauthorized' };
  }

  const supabase = await createClient();
  const workspaceId = await getCurrentWorkspaceId();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from('recurring_payments').insert({
    workspace_id: workspaceId,
    type: formData.type,
    amount: formData.amount,
    currency: formData.currency || 'EUR',
    description: formData.description,
    category: formData.category || null,
    client_id: formData.client_id || null,
    project_id: formData.project_id || null,
    day_of_month: formData.day_of_month || 1,
    notes: formData.notes || null,
    created_by: user?.id,
  });

  if (error) {
    console.error('Error creating recurring payment:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/payments');
  return { success: true };
}

export async function updateRecurringPayment(
  id: string,
  formData: Partial<{
    type: 'incoming' | 'outgoing';
    amount: number;
    currency: string;
    description: string;
    category: string;
    client_id: string;
    project_id: string;
    day_of_month: number;
    is_active: boolean;
    notes: string;
  }>
): Promise<{ success: boolean; error?: string }> {
  if (!(await isAdminUser())) {
    return { success: false, error: 'Unauthorized' };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from('recurring_payments')
    .update({ ...formData, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('Error updating recurring payment:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/payments');
  return { success: true };
}

export async function deleteRecurringPayment(
  id: string
): Promise<{ success: boolean; error?: string }> {
  if (!(await isAdminUser())) {
    return { success: false, error: 'Unauthorized' };
  }

  const supabase = await createClient();

  const { error } = await supabase.from('recurring_payments').delete().eq('id', id);

  if (error) {
    console.error('Error deleting recurring payment:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/payments');
  return { success: true };
}

export async function getRecurringSummary(): Promise<{
  monthlyIncome: number;
  monthlyExpenses: number;
  netMonthly: number;
}> {
  if (!(await isAdminUser())) {
    return { monthlyIncome: 0, monthlyExpenses: 0, netMonthly: 0 };
  }

  const supabase = await createClient();
  const workspaceId = await getCurrentWorkspaceId();

  const { data, error } = await supabase
    .from('recurring_payments')
    .select('type, amount')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true);

  if (error || !data) {
    return { monthlyIncome: 0, monthlyExpenses: 0, netMonthly: 0 };
  }

  const summary = data.reduce(
    (acc, payment) => {
      const amount = Number(payment.amount);
      if (payment.type === 'incoming') {
        acc.monthlyIncome += amount;
      } else {
        acc.monthlyExpenses += amount;
      }
      return acc;
    },
    { monthlyIncome: 0, monthlyExpenses: 0, netMonthly: 0 }
  );

  summary.netMonthly = summary.monthlyIncome - summary.monthlyExpenses;
  return summary;
}

// ============ CLIENT BALANCES ============

export type ClientBalance = {
  client_id: string;
  client_name: string;
  display_name: string | null;
  total_paid: number;
  total_pending: number;
  total_owed: number;
  last_payment_date: string | null;
};

export async function getClientBalances(): Promise<ClientBalance[]> {
  if (!(await isAdminUser())) {
    return [];
  }

  const supabase = await createClient();
  const workspaceId = await getCurrentWorkspaceId();

  // Get all clients
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, display_name')
    .eq('workspace_id', workspaceId)
    .order('name');

  if (!clients) return [];

  // Get all incoming payments grouped by client
  const { data: payments } = await supabase
    .from('payments')
    .select('client_id, amount, status, payment_date')
    .eq('workspace_id', workspaceId)
    .eq('type', 'incoming')
    .not('client_id', 'is', null);

  const balanceMap = new Map<string, { paid: number; pending: number; lastDate: string | null }>();

  // Initialize all clients
  clients.forEach((client) => {
    balanceMap.set(client.id, { paid: 0, pending: 0, lastDate: null });
  });

  // Aggregate payments
  payments?.forEach((p) => {
    if (!p.client_id) return;
    const current = balanceMap.get(p.client_id) || { paid: 0, pending: 0, lastDate: null };
    const amount = Number(p.amount);

    if (p.status === 'completed') {
      current.paid += amount;
    } else if (p.status === 'pending') {
      current.pending += amount;
    }

    if (!current.lastDate || p.payment_date > current.lastDate) {
      current.lastDate = p.payment_date;
    }

    balanceMap.set(p.client_id, current);
  });

  // Build result
  return clients.map((client) => {
    const balance = balanceMap.get(client.id) || { paid: 0, pending: 0, lastDate: null };
    return {
      client_id: client.id,
      client_name: client.name,
      display_name: client.display_name,
      total_paid: balance.paid,
      total_pending: balance.pending,
      total_owed: balance.paid + balance.pending,
      last_payment_date: balance.lastDate,
    };
  });
}

// ============ BULK PAYMENT GENERATORS ============

export async function generateRetainerPayments(data: {
  client_id: string;
  amount: number;
  frequency: 'monthly' | 'annual';
  start_date: string; // YYYY-MM-DD (first day of start month)
  description: string;
  currency?: string;
}): Promise<{ success: boolean; error?: string; count?: number }> {
  if (!(await isAdminUser())) {
    return { success: false, error: 'Unauthorized' };
  }

  const supabase = await createClient();
  const workspaceId = (await getCurrentWorkspaceId()) as string;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Build payment entries
  const entries: Array<{
    workspace_id: string;
    type: string;
    amount: number;
    currency: string;
    description: string;
    client_id: string;
    payment_date: string;
    status: string;
    created_by: string | undefined;
  }> = [];

  const startDate = new Date(data.start_date + 'T00:00:00');

  if (data.frequency === 'monthly') {
    // Generate 12 monthly entries
    for (let i = 0; i < 12; i++) {
      const d = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
      entries.push({
        workspace_id: workspaceId,
        type: 'incoming',
        amount: data.amount,
        currency: data.currency || 'EUR',
        description: data.description,
        client_id: data.client_id,
        payment_date: d.toISOString().split('T')[0],
        status: 'pending',
        created_by: user?.id,
      });
    }
  } else {
    // annual: 1 entry per year, on start_date
    entries.push({
      workspace_id: workspaceId,
      type: 'incoming',
      amount: data.amount,
      currency: data.currency || 'EUR',
      description: data.description,
      client_id: data.client_id,
      payment_date: startDate.toISOString().split('T')[0],
      status: 'pending',
      created_by: user?.id,
    });
  }

  const { error } = await supabase.from('payments').insert(entries);

  if (error) {
    console.error('Error generating retainer payments:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/payments');
  return { success: true, count: entries.length };
}

export async function generateInstallmentPayments(data: {
  client_id: string;
  description: string;
  installments: Array<{ amount: number; date: string }>;
  currency?: string;
}): Promise<{ success: boolean; error?: string; count?: number }> {
  if (!(await isAdminUser())) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!data.installments || data.installments.length === 0) {
    return { success: false, error: 'No installments provided' };
  }

  const supabase = await createClient();
  const workspaceId = (await getCurrentWorkspaceId()) as string;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const entries = data.installments.map((inst, i) => ({
    workspace_id: workspaceId,
    type: 'incoming',
    amount: inst.amount,
    currency: data.currency || 'EUR',
    description: `${data.description} — Installment ${i + 1}/${data.installments.length}`,
    client_id: data.client_id,
    payment_date: inst.date,
    status: 'pending',
    created_by: user?.id,
  }));

  const { error } = await supabase.from('payments').insert(entries);

  if (error) {
    console.error('Error generating installment payments:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/payments');
  return { success: true, count: entries.length };
}

export async function updateClientOwed(
  clientId: string,
  amount: number,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  if (!(await isAdminUser())) {
    return { success: false, error: 'Unauthorized' };
  }

  const supabase = await createClient();
  const workspaceId = await getCurrentWorkspaceId();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get client name
  const { data: client } = await supabase
    .from('clients')
    .select('name, display_name')
    .eq('id', clientId)
    .single();

  if (!client) {
    return { success: false, error: 'Client not found' };
  }

  // Create a pending payment for the adjusted amount
  const { error } = await supabase.from('payments').insert({
    workspace_id: workspaceId,
    type: 'incoming',
    amount: Math.abs(amount),
    currency: 'EUR',
    description: `Balance adjustment for ${client.display_name || client.name}`,
    client_id: clientId,
    payment_date: new Date().toISOString().split('T')[0],
    status: amount > 0 ? 'pending' : 'completed',
    notes: notes || 'Manual balance adjustment',
    created_by: user?.id,
  });

  if (error) {
    console.error('Error updating client owed:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/payments');
  return { success: true };
}
