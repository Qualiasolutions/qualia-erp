export {};

/**
 * Tests for app/actions/admin.ts
 * Covers: getTeamMembers, updateUserRole
 */

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('@/app/actions/shared', () => ({
  isUserAdmin: jest.fn().mockResolvedValue(true),
  isUserManagerOrAbove: jest.fn().mockResolvedValue(true),
}));

const supabase = {
  from: jest.fn() as jest.Mock,
  auth: {
    getUser: jest.fn() as jest.Mock,
    admin: {
      createUser: jest.fn() as jest.Mock,
      updateUserById: jest.fn() as jest.Mock,
    },
  },
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve(supabase),
}));

// ---- Imports ----
import { getTeamMembers, updateUserRole } from '@/app/actions/admin';
import { isUserAdmin, isUserManagerOrAbove } from '@/app/actions/shared';

// ---- Helpers ----

const USER_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const TARGET_USER_ID = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const AUTH_USER = { id: USER_ID, email: 'admin@test.com' };

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

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth();
  const { isUserAdmin: mockIsAdmin } = jest.requireMock('@/app/actions/shared');
  (mockIsAdmin as jest.Mock).mockResolvedValue(true);
  const { isUserManagerOrAbove: mockIsManager } = jest.requireMock('@/app/actions/shared');
  (mockIsManager as jest.Mock).mockResolvedValue(true);
});

// ---- Tests ----

describe('getTeamMembers', () => {
  it('returns error when not authenticated', async () => {
    mockAuth(null);
    const result = await getTeamMembers();
    expect(result.success).toBe(false);
    expect(result.error).toContain('authenticated');
  });

  it('returns error when user lacks permissions', async () => {
    (isUserManagerOrAbove as jest.Mock).mockResolvedValueOnce(false);
    const result = await getTeamMembers();
    expect(result.success).toBe(false);
    expect(result.error).toContain('permissions');
  });

  it('returns team members list', async () => {
    const mockMembers = [
      {
        id: USER_ID,
        email: 'admin@test.com',
        full_name: 'Fawzi',
        role: 'admin',
        avatar_url: null,
        created_at: '2024-01-01',
      },
      {
        id: TARGET_USER_ID,
        email: 'dev@test.com',
        full_name: 'Dev',
        role: 'employee',
        avatar_url: null,
        created_at: '2024-01-02',
      },
    ];
    supabase.from.mockReturnValue(buildChain({ data: mockMembers, error: null }));
    const result = await getTeamMembers();
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
  });

  it('returns error on DB failure', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'DB error' } }));
    const result = await getTeamMembers();
    expect(result.success).toBe(false);
    expect(result.error).toContain('DB error');
  });
});

describe('updateUserRole', () => {
  it('returns error when not authenticated', async () => {
    mockAuth(null);
    const result = await updateUserRole(TARGET_USER_ID, 'employee');
    expect(result.success).toBe(false);
    expect(result.error).toContain('authenticated');
  });

  it('returns error when user is not admin', async () => {
    (isUserAdmin as jest.Mock).mockResolvedValueOnce(false);
    const result = await updateUserRole(TARGET_USER_ID, 'employee');
    expect(result.success).toBe(false);
    expect(result.error).toContain('admin');
  });

  it('returns error when trying to change own role', async () => {
    // targetUserId === user.id
    const result = await updateUserRole(USER_ID, 'employee');
    expect(result.success).toBe(false);
    expect(result.error).toContain('own role');
  });

  it('returns error for invalid role', async () => {
    // @ts-expect-error testing invalid role
    const result = await updateUserRole(TARGET_USER_ID, 'client');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid role');
  });

  it('rejects the removed manager role', async () => {
    // @ts-expect-error testing removed role
    const result = await updateUserRole(TARGET_USER_ID, 'manager');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid role');
  });

  it('updates user role successfully', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));
    const result = await updateUserRole(TARGET_USER_ID, 'employee');
    expect(result.success).toBe(true);
  });

  it('returns error on DB failure', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'Update failed' } }));
    const result = await updateUserRole(TARGET_USER_ID, 'employee');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Update failed');
  });
});
