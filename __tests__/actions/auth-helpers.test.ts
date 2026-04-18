export {};

/**
 * Tests for auth/permission helpers from app/actions/shared.ts
 * Covers: isUserAdmin, isUserManagerOrAbove, canDeleteProject, canDeleteIssue,
 *         canDeleteClient, canDeleteMeeting
 */

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}));

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

// Use a module-level object whose `from` is set in beforeEach
// The factory captures `supabase` by reference — this works because jest.mock
// factories are hoisted but the `supabase` object is mutated, not replaced.
const supabase = {
  from: jest.fn() as jest.Mock,
  auth: { getUser: jest.fn() as jest.Mock },
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve(supabase),
}));

// ---- Imports after mocks ----
import {
  canDeleteProject,
  canDeleteIssue,
  canDeleteClient,
  canDeleteMeeting,
  isUserAdmin,
  isUserManagerOrAbove,
} from '@/app/actions/shared';

// ---- Helpers ----

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
  ];
  const chain: Record<string, jest.Mock> = Object.fromEntries(methods.map((m) => [m, jest.fn()]));
  const promised = Object.assign(Promise.resolve(resolvedData), chain);
  Object.values(chain).forEach((fn) => {
    fn.mockReturnValue(promised);
  });
  return chain;
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ---- Tests ----

describe('isUserAdmin', () => {
  it('returns true for admin', async () => {
    supabase.from.mockReturnValue(buildChain({ data: { role: 'admin' }, error: null }));
    expect(await isUserAdmin('user-1')).toBe(true);
  });

  it('returns false for employee', async () => {
    supabase.from.mockReturnValue(buildChain({ data: { role: 'employee' }, error: null }));
    expect(await isUserAdmin('user-1')).toBe(false);
  });

  it('returns false when data is null', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));
    expect(await isUserAdmin('user-1')).toBe(false);
  });
});

describe('isUserManagerOrAbove (aliased to isUserAdmin after manager role removal)', () => {
  it('returns true for admin', async () => {
    supabase.from.mockReturnValue(buildChain({ data: { role: 'admin' }, error: null }));
    expect(await isUserManagerOrAbove('user-1')).toBe(true);
  });

  it('returns false for employee', async () => {
    supabase.from.mockReturnValue(buildChain({ data: { role: 'employee' }, error: null }));
    expect(await isUserManagerOrAbove('user-1')).toBe(false);
  });

  it('returns false for client', async () => {
    supabase.from.mockReturnValue(buildChain({ data: { role: 'client' }, error: null }));
    expect(await isUserManagerOrAbove('user-1')).toBe(false);
  });
});

describe('canDeleteProject', () => {
  it('returns true when user is admin — no project lookup needed', async () => {
    supabase.from.mockReturnValue(buildChain({ data: { role: 'admin' }, error: null }));
    expect(await canDeleteProject('admin-user', 'project-1')).toBe(true);
  });

  it('returns true when user is the project lead', async () => {
    supabase.from
      .mockReturnValueOnce(buildChain({ data: { role: 'employee' }, error: null }))
      .mockReturnValue(buildChain({ data: { lead_id: 'user-1' }, error: null }));
    expect(await canDeleteProject('user-1', 'project-1')).toBe(true);
  });

  it('returns false when user is not the project lead', async () => {
    supabase.from
      .mockReturnValueOnce(buildChain({ data: { role: 'employee' }, error: null }))
      .mockReturnValue(buildChain({ data: { lead_id: 'other-user' }, error: null }));
    expect(await canDeleteProject('user-1', 'project-1')).toBe(false);
  });

  it('returns false when project not found', async () => {
    supabase.from
      .mockReturnValueOnce(buildChain({ data: { role: 'employee' }, error: null }))
      .mockReturnValue(buildChain({ data: null, error: null }));
    expect(await canDeleteProject('user-1', 'non-existent')).toBe(false);
  });
});

describe('canDeleteIssue', () => {
  it('returns true when user is admin', async () => {
    supabase.from.mockReturnValue(buildChain({ data: { role: 'admin' }, error: null }));
    expect(await canDeleteIssue('admin-user', 'issue-1')).toBe(true);
  });

  it('returns true when user is the issue creator', async () => {
    supabase.from
      .mockReturnValueOnce(buildChain({ data: { role: 'employee' }, error: null }))
      .mockReturnValue(buildChain({ data: { creator_id: 'user-1' }, error: null }));
    expect(await canDeleteIssue('user-1', 'issue-1')).toBe(true);
  });

  it('returns false when user did not create the issue', async () => {
    supabase.from
      .mockReturnValueOnce(buildChain({ data: { role: 'employee' }, error: null }))
      .mockReturnValue(buildChain({ data: { creator_id: 'other-user' }, error: null }));
    expect(await canDeleteIssue('user-1', 'issue-1')).toBe(false);
  });
});

describe('canDeleteClient', () => {
  it('returns true when user is admin', async () => {
    supabase.from.mockReturnValue(buildChain({ data: { role: 'admin' }, error: null }));
    expect(await canDeleteClient('admin-user', 'client-1')).toBe(true);
  });

  it('returns false when client has no workspace_id', async () => {
    supabase.from
      .mockReturnValueOnce(buildChain({ data: { role: 'employee' }, error: null }))
      .mockReturnValue(buildChain({ data: null, error: null }));
    expect(await canDeleteClient('user-1', 'client-1')).toBe(false);
  });

  it('returns true when user is workspace owner', async () => {
    supabase.from
      .mockReturnValueOnce(buildChain({ data: { role: 'employee' }, error: null }))
      .mockReturnValueOnce(buildChain({ data: { workspace_id: 'ws-1' }, error: null }))
      .mockReturnValue(buildChain({ data: { role: 'owner' }, error: null }));
    expect(await canDeleteClient('user-1', 'client-1')).toBe(true);
  });

  it('returns true when user is workspace admin', async () => {
    supabase.from
      .mockReturnValueOnce(buildChain({ data: { role: 'employee' }, error: null }))
      .mockReturnValueOnce(buildChain({ data: { workspace_id: 'ws-1' }, error: null }))
      .mockReturnValue(buildChain({ data: { role: 'admin' }, error: null }));
    expect(await canDeleteClient('user-1', 'client-1')).toBe(true);
  });

  it('returns false when user has no workspace membership', async () => {
    supabase.from
      .mockReturnValueOnce(buildChain({ data: { role: 'employee' }, error: null }))
      .mockReturnValueOnce(buildChain({ data: { workspace_id: 'ws-1' }, error: null }))
      .mockReturnValue(buildChain({ data: null, error: null }));
    expect(await canDeleteClient('user-1', 'client-1')).toBe(false);
  });
});

describe('canDeleteMeeting', () => {
  it('returns true when user is admin', async () => {
    supabase.from.mockReturnValue(buildChain({ data: { role: 'admin' }, error: null }));
    expect(await canDeleteMeeting('admin-user', 'meeting-1')).toBe(true);
  });

  it('returns true when user created the meeting', async () => {
    supabase.from
      .mockReturnValueOnce(buildChain({ data: { role: 'employee' }, error: null }))
      .mockReturnValue(buildChain({ data: { created_by: 'user-1' }, error: null }));
    expect(await canDeleteMeeting('user-1', 'meeting-1')).toBe(true);
  });

  it('returns false when user did not create the meeting', async () => {
    supabase.from
      .mockReturnValueOnce(buildChain({ data: { role: 'employee' }, error: null }))
      .mockReturnValue(buildChain({ data: { created_by: 'other-user' }, error: null }));
    expect(await canDeleteMeeting('user-1', 'meeting-1')).toBe(false);
  });
});
