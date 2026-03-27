export {};

/**
 * Tests for app/actions/activities.ts
 * Covers: getRecentActivities, deleteActivity
 */

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('@/app/actions/workspace', () => ({
  getCurrentWorkspaceId: jest.fn().mockResolvedValue('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
}));

jest.mock('@/app/actions/shared', () => ({
  isUserAdmin: jest.fn().mockResolvedValue(true),
}));

const supabase = {
  from: jest.fn() as jest.Mock,
  auth: { getUser: jest.fn() as jest.Mock },
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve(supabase),
}));

// ---- Imports ----
import { getRecentActivities, deleteActivity } from '@/app/actions/activities';
import { isUserAdmin } from '@/app/actions/shared';

// ---- Helpers ----

const USER_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const WS_ID = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const ACTIVITY_ID = 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const AUTH_USER = { id: USER_ID, email: 'user@test.com' };

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
  const { getCurrentWorkspaceId: mockGetWs } = jest.requireMock('@/app/actions/workspace');
  (mockGetWs as jest.Mock).mockResolvedValue(WS_ID);
});

// ---- Tests ----

describe('getRecentActivities', () => {
  it('returns empty array on DB error', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'DB error' } }));
    const result = await getRecentActivities(20, WS_ID);
    expect(result).toEqual([]);
  });

  it('returns normalized activities with FK arrays resolved', async () => {
    const rawActivities = [
      {
        id: ACTIVITY_ID,
        type: 'issue_created',
        created_at: '2024-01-01T00:00:00Z',
        metadata: {},
        actor: [{ id: USER_ID, full_name: 'Fawzi', email: 'f@q.com', avatar_url: null }],
        project: [{ id: 'proj-1', name: 'Test Project' }],
        issue: [{ id: 'issue-1', title: 'Bug Fix' }],
        team: [{ id: 'team-1', name: 'Dev', key: 'D' }],
        meeting: null,
      },
    ];
    supabase.from.mockReturnValue(buildChain({ data: rawActivities, error: null }));
    const result = await getRecentActivities(20, WS_ID);
    expect(result).toHaveLength(1);
    expect(Array.isArray(result[0].actor)).toBe(false);
    expect(Array.isArray(result[0].project)).toBe(false);
    expect(Array.isArray(result[0].issue)).toBe(false);
    expect(Array.isArray(result[0].team)).toBe(false);
  });

  it('returns activities using default workspace when no WS specified', async () => {
    supabase.from.mockReturnValue(buildChain({ data: [], error: null }));
    const result = await getRecentActivities();
    expect(result).toEqual([]);
  });

  it('returns empty array when data is null', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));
    const result = await getRecentActivities(20, WS_ID);
    expect(result).toEqual([]);
  });

  it('queries without workspace filter when wsId is null', async () => {
    const { getCurrentWorkspaceId: mockGetWs } = jest.requireMock('@/app/actions/workspace');
    (mockGetWs as jest.Mock).mockResolvedValueOnce(null);
    supabase.from.mockReturnValue(buildChain({ data: [], error: null }));
    const result = await getRecentActivities();
    expect(result).toEqual([]);
  });
});

describe('deleteActivity', () => {
  it('returns error when not authenticated', async () => {
    mockAuth(null);
    const result = await deleteActivity(ACTIVITY_ID);
    expect(result.success).toBe(false);
    expect(result.error).toContain('authenticated');
  });

  it('returns error when user is not admin', async () => {
    (isUserAdmin as jest.Mock).mockResolvedValueOnce(false);
    const result = await deleteActivity(ACTIVITY_ID);
    expect(result.success).toBe(false);
    expect(result.error).toContain('admin');
  });

  it('deletes activity successfully', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));
    const result = await deleteActivity(ACTIVITY_ID);
    expect(result.success).toBe(true);
  });

  it('returns error on DB failure', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'Delete failed' } }));
    const result = await deleteActivity(ACTIVITY_ID);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Delete failed');
  });
});
