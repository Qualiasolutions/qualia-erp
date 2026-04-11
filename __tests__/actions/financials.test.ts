export {};

/**
 * Tests for app/actions/financials.ts
 * Covers: getFinancialSummary, getExpenses, createExpense, updateExpense, deleteExpense
 */

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}));

jest.mock('@/lib/integrations/zoho', () => ({
  getZohoAllInvoices: jest.fn(),
  getZohoPayments: jest.fn(),
}));

// Mock isUserAdmin from the re-export router
jest.mock('@/app/actions', () => ({
  isUserAdmin: jest.fn(),
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
  getFinancialSummary,
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
} from '@/app/actions/financials';
import { isUserAdmin } from '@/app/actions';

// ---- Helpers ----

const AUTH_USER = { id: 'user-id-1', email: 'admin@test.com' };

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
    'ilike',
  ];
  const chain: Record<string, jest.Mock> = Object.fromEntries(methods.map((m) => [m, jest.fn()]));
  const promised = Object.assign(Promise.resolve(resolvedData), chain);
  Object.values(chain).forEach((fn) => {
    fn.mockReturnValue(promised);
  });
  return chain;
}

function mockAuth(user: typeof AUTH_USER | null = AUTH_USER) {
  supabase.auth.getUser.mockResolvedValue({ data: { user }, error: null });
}

function mockAdmin(isAdmin: boolean = true) {
  (isUserAdmin as jest.Mock).mockResolvedValue(isAdmin);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth();
  mockAdmin(true);
});

// ---- Tests ----

describe('getFinancialSummary', () => {
  it('returns null when user is not authenticated', async () => {
    mockAuth(null);
    const result = await getFinancialSummary();
    expect(result).toBeNull();
  });

  it('returns null when user is not admin', async () => {
    mockAdmin(false);
    const result = await getFinancialSummary();
    expect(result).toBeNull();
  });

  it('returns summary for authenticated admin', async () => {
    const chain = buildChain({ data: [], error: null });
    supabase.from.mockReturnValue(chain);

    const result = await getFinancialSummary();
    expect(result).not.toBeNull();
    expect(result!.totalInvoiced).toBe(0);
    expect(result!.totalCollected).toBe(0);
    expect(result!.totalOutstanding).toBe(0);
  });

  it('returns null when DB query fails', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'DB error' } }));
    const result = await getFinancialSummary();
    expect(result).toBeNull();
  });
});

describe('getExpenses', () => {
  it('returns empty array when not admin', async () => {
    mockAdmin(false);
    const result = await getExpenses();
    expect(result).toEqual([]);
  });

  it('returns expenses on success', async () => {
    const mockExpenses = [
      {
        id: 'exp-1',
        amount: 100,
        category: 'Software',
        date: '2026-03-01',
        description: null,
        created_at: '2026-03-01T00:00:00Z',
      },
    ];
    supabase.from.mockReturnValue(buildChain({ data: mockExpenses, error: null }));
    const result = await getExpenses();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('exp-1');
  });

  it('returns empty array on DB error', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'fail' } }));
    const result = await getExpenses();
    expect(result).toEqual([]);
  });
});

describe('createExpense', () => {
  it('returns error when not admin', async () => {
    mockAdmin(false);
    const result = await createExpense({ amount: 50, category: 'Office', date: '2026-03-01' });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
  });

  it('returns error on validation failure', async () => {
    const result = await createExpense({ amount: -10, category: '', date: 'bad' });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('returns success on valid input', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));
    const result = await createExpense({ amount: 200, category: 'Software', date: '2026-03-15' });
    expect(result.success).toBe(true);
  });

  it('returns error on DB insert failure', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'Insert failed' } }));
    const result = await createExpense({ amount: 50, category: 'Office', date: '2026-03-01' });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Insert failed');
  });
});

describe('updateExpense', () => {
  const EXPENSE_UUID = '625935ca-5525-4449-a67b-0893dea291b7';

  it('returns error when not admin', async () => {
    mockAdmin(false);
    const result = await updateExpense({
      id: EXPENSE_UUID,
      amount: 100,
      category: 'Office',
      date: '2026-03-01',
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
  });

  it('returns error on validation failure (missing id)', async () => {
    const result = await updateExpense({ amount: 100, category: 'Office', date: '2026-03-01' });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('returns error on invalid id format', async () => {
    const result = await updateExpense({
      id: 'not-a-uuid',
      amount: 100,
      category: 'Office',
      date: '2026-03-01',
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid expense ID');
  });

  it('returns success on valid update', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));
    const result = await updateExpense({
      id: EXPENSE_UUID,
      amount: 300,
      category: 'Hardware',
      date: '2026-03-20',
    });
    expect(result.success).toBe(true);
  });

  it('returns error on DB update failure', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'Update failed' } }));
    const result = await updateExpense({
      id: EXPENSE_UUID,
      amount: 300,
      category: 'Hardware',
      date: '2026-03-20',
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Update failed');
  });
});

describe('deleteExpense', () => {
  it('returns error when not admin', async () => {
    mockAdmin(false);
    const result = await deleteExpense('exp-1');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
  });

  it('returns success on valid delete', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));
    const result = await deleteExpense('exp-1');
    expect(result.success).toBe(true);
  });

  it('returns error on DB delete failure', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'Delete failed' } }));
    const result = await deleteExpense('exp-1');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Delete failed');
  });
});
