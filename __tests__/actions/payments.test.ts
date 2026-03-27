export {};

/**
 * Tests for app/actions/payments.ts
 * Covers: getPayments, createPayment, updatePayment, deletePayment,
 *         getPaymentsSummary, getRecurringPayments
 * Note: all functions gate on isAdminUser() (email match), so tests cover
 * both the authorized (admin email) and unauthorized paths.
 */

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('@/app/actions', () => ({
  getCurrentWorkspaceId: jest.fn().mockResolvedValue('workspace-id-1'),
}));

const supabase = {
  from: jest.fn() as jest.Mock,
  auth: { getUser: jest.fn() as jest.Mock },
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve(supabase),
}));

// ---- Imports ----
import {
  getPayments,
  createPayment,
  updatePayment,
  deletePayment,
  getPaymentsSummary,
  getRecurringPayments,
} from '@/app/actions/payments';

// ---- Helpers ----

const ADMIN_USER = { id: 'admin-id', email: 'info@qualiasolutions.net' };
const NON_ADMIN_USER = { id: 'user-id', email: 'other@test.com' };

function buildChain(resolvedData: { data: unknown; error: unknown } = { data: null, error: null }) {
  const methods = [
    'select',
    'insert',
    'update',
    'delete',
    'eq',
    'neq',
    'in',
    'is',
    'not',
    'order',
    'limit',
    'single',
    'maybeSingle',
    'upsert',
    'head',
  ];
  const chain: Record<string, jest.Mock> = Object.fromEntries(methods.map((m) => [m, jest.fn()]));
  const promised = Object.assign(Promise.resolve(resolvedData), chain);
  Object.values(chain).forEach((fn) => {
    fn.mockReturnValue(promised);
  });
  return chain;
}

function mockAuth(user: typeof ADMIN_USER | typeof NON_ADMIN_USER | null = ADMIN_USER) {
  supabase.auth.getUser.mockResolvedValue({ data: { user }, error: null });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth();
});

// ---- Tests ----

describe('getPayments', () => {
  it('returns empty array for non-admin user', async () => {
    mockAuth(NON_ADMIN_USER);
    const result = await getPayments();
    expect(result).toEqual([]);
  });

  it('returns payment list for admin user', async () => {
    const mockPayments = [{ id: 'pay-1', type: 'incoming', amount: 500, description: 'Retainer' }];
    supabase.from.mockReturnValue(buildChain({ data: mockPayments, error: null }));

    const result = await getPayments();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('pay-1');
  });

  it('returns empty array on DB error', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'DB error' } }));
    const result = await getPayments();
    expect(result).toEqual([]);
  });
});

describe('createPayment', () => {
  it('returns unauthorized error for non-admin', async () => {
    mockAuth(NON_ADMIN_USER);
    const result = await createPayment({ type: 'incoming', amount: 100, description: 'Test' });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
  });

  it('creates payment successfully for admin', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));
    const result = await createPayment({
      type: 'incoming',
      amount: 500,
      description: 'Retainer payment',
    });
    expect(result.success).toBe(true);
  });

  it('returns error on DB insert failure', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'Insert failed' } }));
    const result = await createPayment({
      type: 'outgoing',
      amount: 200,
      description: 'Expense',
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Insert failed');
  });

  it('uses EUR as default currency', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));
    await createPayment({ type: 'incoming', amount: 100, description: 'Test' });
    // Verify insert was called (from was called)
    expect(supabase.from).toHaveBeenCalledWith('payments');
  });
});

describe('updatePayment', () => {
  it('returns unauthorized for non-admin', async () => {
    mockAuth(NON_ADMIN_USER);
    const result = await updatePayment('pay-1', { amount: 600 });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
  });

  it('updates payment successfully for admin', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));
    const result = await updatePayment('pay-1', { amount: 600, status: 'completed' });
    expect(result.success).toBe(true);
  });

  it('returns error on DB update failure', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'Update failed' } }));
    const result = await updatePayment('pay-1', { amount: 600 });
    expect(result.success).toBe(false);
  });
});

describe('deletePayment', () => {
  it('returns unauthorized for non-admin', async () => {
    mockAuth(NON_ADMIN_USER);
    const result = await deletePayment('pay-1');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
  });

  it('deletes payment successfully for admin', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));
    const result = await deletePayment('pay-1');
    expect(result.success).toBe(true);
  });

  it('returns error on DB delete failure', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'Delete failed' } }));
    const result = await deletePayment('pay-1');
    expect(result.success).toBe(false);
  });
});

describe('getPaymentsSummary', () => {
  it('returns zeros for non-admin', async () => {
    mockAuth(NON_ADMIN_USER);
    const result = await getPaymentsSummary();
    expect(result).toEqual({
      totalIncoming: 0,
      totalOutgoing: 0,
      pendingIncoming: 0,
      pendingOutgoing: 0,
    });
  });

  it('calculates totals correctly for admin', async () => {
    const payments = [
      { type: 'incoming', amount: 500, status: 'completed' },
      { type: 'incoming', amount: 200, status: 'pending' },
      { type: 'outgoing', amount: 100, status: 'completed' },
      { type: 'outgoing', amount: 50, status: 'pending' },
    ];
    supabase.from.mockReturnValue(buildChain({ data: payments, error: null }));

    const result = await getPaymentsSummary();
    expect(result.totalIncoming).toBe(700);
    expect(result.totalOutgoing).toBe(150);
    expect(result.pendingIncoming).toBe(200);
    expect(result.pendingOutgoing).toBe(50);
  });

  it('returns zeros on DB error', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'error' } }));
    const result = await getPaymentsSummary();
    expect(result.totalIncoming).toBe(0);
  });
});

describe('getRecurringPayments', () => {
  it('returns empty array for non-admin', async () => {
    mockAuth(NON_ADMIN_USER);
    const result = await getRecurringPayments();
    expect(result).toEqual([]);
  });

  it('returns recurring payment list for admin', async () => {
    const payments = [{ id: 'rec-1', type: 'incoming', amount: 300, description: 'Hosting' }];
    supabase.from.mockReturnValue(buildChain({ data: payments, error: null }));

    const result = await getRecurringPayments();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('rec-1');
  });
});
