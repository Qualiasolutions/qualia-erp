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
    .order('payment_date', { ascending: false });

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
