export {};

/**
 * Tests for app/actions/workspace.ts
 * Covers: getCurrentWorkspaceId, getCurrentUserProfile, getWorkspaces,
 *         getUserWorkspaces, setDefaultWorkspace, createWorkspace,
 *         addWorkspaceMember, removeWorkspaceMember, getWorkspaceMembers
 */

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

const supabase = {
  from: jest.fn() as jest.Mock,
  auth: { getUser: jest.fn() as jest.Mock },
};

const adminSupabase = {
  from: jest.fn() as jest.Mock,
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve(supabase),
  createAdminClient: () => adminSupabase,
}));

jest.mock('@/app/actions/shared', () => ({
  isUserAdmin: jest.fn().mockResolvedValue(true),
}));

// ---- Imports ----
import {
  getCurrentWorkspaceId,
  getCurrentUserProfile,
  getWorkspaces,
  getUserWorkspaces,
  setDefaultWorkspace,
  createWorkspace,
  addWorkspaceMember,
  removeWorkspaceMember,
  getWorkspaceMembers,
} from '@/app/actions/workspace';
import { isUserAdmin } from '@/app/actions/shared';

// ---- Helpers ----

const WS_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const USER_ID = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const PROFILE_ID = 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
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
    'upsert',
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
  adminSupabase.from.mockReset();
  // Re-set admin mock cleared by clearAllMocks
  (isUserAdmin as jest.Mock).mockResolvedValue(true);
});

// ---- Tests ----

describe('getCurrentWorkspaceId', () => {
  it('returns null when not authenticated', async () => {
    mockAuth(null);
    const result = await getCurrentWorkspaceId();
    expect(result).toBeNull();
  });

  it('returns workspace_id from membership', async () => {
    supabase.from.mockReturnValue(buildChain({ data: { workspace_id: WS_ID }, error: null }));
    const result = await getCurrentWorkspaceId();
    expect(result).toBe(WS_ID);
  });

  it('returns null when no default workspace found', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));
    const result = await getCurrentWorkspaceId();
    expect(result).toBeNull();
  });
});

describe('getCurrentUserProfile', () => {
  it('returns null when not authenticated', async () => {
    mockAuth(null);
    const result = await getCurrentUserProfile();
    expect(result).toBeNull();
  });

  it('returns profile data when authenticated', async () => {
    const mockProfile = {
      id: USER_ID,
      email: 'user@test.com',
      full_name: 'Test User',
      avatar_url: null,
      role: 'admin',
    };
    supabase.from.mockReturnValue(buildChain({ data: mockProfile, error: null }));
    const result = await getCurrentUserProfile();
    expect(result).toMatchObject({ id: USER_ID, role: 'admin' });
  });

  it('returns null when profile query returns nothing', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));
    const result = await getCurrentUserProfile();
    expect(result).toBeNull();
  });
});

describe('getWorkspaces', () => {
  it('returns list of workspaces', async () => {
    const mockWorkspaces = [
      { id: WS_ID, name: 'Main', slug: 'main', logo_url: null, description: null },
    ];
    supabase.from.mockReturnValue(buildChain({ data: mockWorkspaces, error: null }));
    const result = await getWorkspaces();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Main');
  });

  it('returns empty array on error', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'DB error' } }));
    const result = await getWorkspaces();
    expect(result).toEqual([]);
  });
});

describe('getUserWorkspaces', () => {
  it('returns empty array when not authenticated', async () => {
    mockAuth(null);
    const result = await getUserWorkspaces();
    expect(result).toEqual([]);
  });

  it('merges workspace list with membership data', async () => {
    const allWorkspaces = [
      { id: WS_ID, name: 'Qualia', slug: 'qualia', logo_url: null, description: null },
    ];
    const memberships = [{ workspace_id: WS_ID, role: 'admin', is_default: true }];

    supabase.from
      .mockReturnValueOnce(buildChain({ data: allWorkspaces, error: null }))
      .mockReturnValueOnce(buildChain({ data: memberships, error: null }));

    const result = await getUserWorkspaces();
    expect(result).toHaveLength(1);
    expect(result[0].hasAccess).toBe(true);
    expect(result[0].isDefault).toBe(true);
    expect(result[0].role).toBe('admin');
  });
});

describe('setDefaultWorkspace', () => {
  it('returns error when not authenticated', async () => {
    mockAuth(null);
    const result = await setDefaultWorkspace(WS_ID);
    expect(result.success).toBe(false);
    expect(result.error).toContain('authenticated');
  });

  it('returns error when user is not a member of workspace', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));
    const result = await setDefaultWorkspace(WS_ID);
    expect(result.success).toBe(false);
    expect(result.error).toContain('access');
  });

  it('returns success when workspace is set as default', async () => {
    supabase.from
      .mockReturnValueOnce(buildChain({ data: { id: 'member-1' }, error: null }))
      .mockReturnValue(buildChain({ data: null, error: null }));

    const result = await setDefaultWorkspace(WS_ID);
    expect(result.success).toBe(true);
  });
});

describe('createWorkspace', () => {
  it('returns error when not authenticated', async () => {
    mockAuth(null);
    const formData = new FormData();
    const result = await createWorkspace(formData);
    expect(result.success).toBe(false);
    expect(result.error).toContain('authenticated');
  });

  it('returns error when name is missing', async () => {
    const formData = new FormData();
    formData.set('slug', 'test-slug');
    const result = await createWorkspace(formData);
    expect(result.success).toBe(false);
    expect(result.error).toContain('name');
  });

  it('returns error when slug is missing', async () => {
    const formData = new FormData();
    formData.set('name', 'Test WS');
    const result = await createWorkspace(formData);
    expect(result.success).toBe(false);
    expect(result.error).toContain('slug');
  });

  it('returns success on valid workspace creation', async () => {
    const newWorkspace = { id: WS_ID, name: 'Test WS', slug: 'test-ws' };
    // Regular client: workspace insert
    supabase.from.mockReturnValue(buildChain({ data: newWorkspace, error: null }));
    // Admin client: check existing defaults + insert membership
    adminSupabase.from
      .mockReturnValueOnce(buildChain({ data: [], error: null })) // existing defaults check
      .mockReturnValue(buildChain({ data: null, error: null })); // membership insert

    const formData = new FormData();
    formData.set('name', 'Test WS');
    formData.set('slug', 'test-ws');

    const result = await createWorkspace(formData);
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ name: 'Test WS' });
  });

  it('returns error on DB insert failure', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'Slug conflict' } }));

    const formData = new FormData();
    formData.set('name', 'Test WS');
    formData.set('slug', 'test-ws');

    const result = await createWorkspace(formData);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Slug conflict');
  });
});

describe('addWorkspaceMember', () => {
  it('returns error when not authenticated', async () => {
    mockAuth(null);
    const result = await addWorkspaceMember(WS_ID, PROFILE_ID);
    expect(result.success).toBe(false);
    expect(result.error).toContain('authenticated');
  });

  it('returns success on valid member add', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));
    const result = await addWorkspaceMember(WS_ID, PROFILE_ID, 'member');
    expect(result.success).toBe(true);
  });

  it('returns error on DB failure', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'Already member' } }));
    const result = await addWorkspaceMember(WS_ID, PROFILE_ID);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Already member');
  });
});

describe('removeWorkspaceMember', () => {
  it('returns error when not authenticated', async () => {
    mockAuth(null);
    const result = await removeWorkspaceMember(WS_ID, PROFILE_ID);
    expect(result.success).toBe(false);
    expect(result.error).toContain('authenticated');
  });

  it('returns success on valid member removal', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));
    const result = await removeWorkspaceMember(WS_ID, PROFILE_ID);
    expect(result.success).toBe(true);
  });

  it('returns error on DB failure', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'Not found' } }));
    const result = await removeWorkspaceMember(WS_ID, PROFILE_ID);
    expect(result.success).toBe(false);
  });
});

describe('getWorkspaceMembers', () => {
  it('returns empty array on DB error', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'DB error' } }));
    const result = await getWorkspaceMembers(WS_ID);
    expect(result).toEqual([]);
  });

  it('returns normalized members list', async () => {
    const rawMembers = [
      { profile: [{ id: PROFILE_ID, full_name: 'Hasan', email: 'h@q.com', avatar_url: null }] },
    ];
    supabase.from.mockReturnValue(buildChain({ data: rawMembers, error: null }));
    const result = await getWorkspaceMembers(WS_ID);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: PROFILE_ID });
  });

  it('returns empty array when members is null', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));
    const result = await getWorkspaceMembers(WS_ID);
    expect(result).toEqual([]);
  });

  it('handles non-array profile objects', async () => {
    const rawMembers = [
      { profile: { id: PROFILE_ID, full_name: 'Hasan', email: 'h@q.com', avatar_url: null } },
    ];
    supabase.from.mockReturnValue(buildChain({ data: rawMembers, error: null }));
    const result = await getWorkspaceMembers(WS_ID);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: PROFILE_ID });
  });
});

describe('getUserWorkspaces (workspace without membership)', () => {
  it('marks workspace as inaccessible when user has no membership', async () => {
    const allWorkspaces = [
      { id: WS_ID, name: 'Main', slug: 'main', logo_url: null, description: null },
      {
        id: 'd4eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        name: 'Other',
        slug: 'other',
        logo_url: null,
        description: null,
      },
    ];
    const memberships = [{ workspace_id: WS_ID, role: 'member', is_default: false }];

    supabase.from
      .mockReturnValueOnce(buildChain({ data: allWorkspaces, error: null }))
      .mockReturnValueOnce(buildChain({ data: memberships, error: null }));

    const result = await getUserWorkspaces();
    const inaccessible = result.find((ws) => ws.id === 'd4eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
    expect(inaccessible?.hasAccess).toBe(false);
    expect(inaccessible?.role).toBeNull();
    expect(inaccessible?.isDefault).toBe(false);
  });
});
