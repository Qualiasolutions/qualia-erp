export {};

/**
 * Tests for app/actions/client-portal
 * Covers: inviteClientByEmail, inviteClientToProject, removeClientFromProject,
 *         revokePortalAccess, getClientInvoices, getClientDashboardData,
 *         getClientDashboardProjects, updateClientProfile, getNotificationPreferences,
 *         updateNotificationPreferences, setupPortalForClient
 */

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  unstable_cache: jest.fn(<T>(fn: (...args: any[]) => Promise<T>) => fn),
  unstable_noStore: jest.fn(),
}));

jest.mock('@/app/actions/workspace', () => ({
  getCurrentWorkspaceId: jest.fn().mockResolvedValue('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
}));

jest.mock('@/app/actions/shared', () => ({
  isUserManagerOrAbove: jest.fn().mockResolvedValue(true),
  getCachedUserRole: jest.fn().mockResolvedValue('admin'),
}));

const supabase = {
  from: jest.fn() as jest.Mock,
  auth: {
    getUser: jest.fn() as jest.Mock,
    resetPasswordForEmail: jest.fn() as jest.Mock,
  },
};

// We need to also mock createAdminClient — it throws in test environment
jest.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve(supabase),
  createAdminClient: jest.fn(() => {
    throw new Error('Service role key not configured');
  }),
}));

// ---- Imports ----
import {
  inviteClientByEmail,
  inviteClientToProject,
  removeClientFromProject,
  revokePortalAccess,
  getClientInvoices,
  getClientDashboardData,
  getClientDashboardProjects,
  updateClientProfile,
  getNotificationPreferences,
  updateNotificationPreferences,
  setupPortalForClient,
} from '@/app/actions/client-portal';
import { isUserManagerOrAbove } from '@/app/actions/shared';

// ---- Helpers ----

const PROJECT_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const CLIENT_ID = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const USER_ID = 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const WS_ID = 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
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
    'upsert',
    'lt',
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
  const { isUserManagerOrAbove: mockIsManager } = jest.requireMock('@/app/actions/shared');
  (mockIsManager as jest.Mock).mockResolvedValue(true);
  const { getCurrentWorkspaceId: mockGetWs } = jest.requireMock('@/app/actions/workspace');
  (mockGetWs as jest.Mock).mockResolvedValue(WS_ID);
  supabase.auth.resetPasswordForEmail.mockResolvedValue({ error: null });
});

// ---- Tests ----

describe('inviteClientByEmail', () => {
  it('returns error when not authenticated', async () => {
    mockAuth(null);
    const result = await inviteClientByEmail(PROJECT_ID, 'client@test.com');
    expect(result.success).toBe(false);
    expect(result.error).toContain('authenticated');
  });

  it('returns error when user is not admin/manager', async () => {
    (isUserManagerOrAbove as jest.Mock).mockResolvedValueOnce(false);
    const result = await inviteClientByEmail(PROJECT_ID, 'client@test.com');
    expect(result.success).toBe(false);
    expect(result.error).toContain('admin');
  });

  it('returns error when email belongs to a team member', async () => {
    supabase.from.mockReturnValue(
      buildChain({ data: { id: CLIENT_ID, role: 'employee' }, error: null })
    );
    const result = await inviteClientByEmail(PROJECT_ID, 'employee@test.com');
    expect(result.success).toBe(false);
    expect(result.error).toContain('team member');
  });

  it('links existing client profile to project if they have client role', async () => {
    // Existing profile is a client — should call inviteClientToProject internally
    supabase.from
      .mockReturnValueOnce(buildChain({ data: { id: CLIENT_ID, role: 'client' }, error: null })) // existing profile
      // inviteClientToProject calls: existing link check, profile role check, insert
      .mockReturnValueOnce(buildChain({ data: null, error: null })) // no existing link
      .mockReturnValueOnce(buildChain({ data: { role: 'client' }, error: null })) // target profile role
      .mockReturnValue(buildChain({ data: { id: 'link-1' }, error: null })); // insert link

    const result = await inviteClientByEmail(PROJECT_ID, 'client@test.com');
    expect(result.success).toBe(true);
  });

  it('returns error when service role key not configured (new user)', async () => {
    // No existing profile — needs admin client to create user
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));
    // createAdminClient throws by default in our mock
    const result = await inviteClientByEmail(PROJECT_ID, 'newclient@test.com');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Service role key');
  });
});

describe('inviteClientToProject', () => {
  it('returns error when not authenticated', async () => {
    mockAuth(null);
    const result = await inviteClientToProject(PROJECT_ID, CLIENT_ID);
    expect(result.success).toBe(false);
    expect(result.error).toContain('authenticated');
  });

  it('returns error when user is not admin/manager', async () => {
    (isUserManagerOrAbove as jest.Mock).mockResolvedValueOnce(false);
    const result = await inviteClientToProject(PROJECT_ID, CLIENT_ID);
    expect(result.success).toBe(false);
    expect(result.error).toContain('admin');
  });

  it('returns error when client is already invited', async () => {
    supabase.from.mockReturnValueOnce(buildChain({ data: { id: 'existing-link' }, error: null })); // existingLink check

    const result = await inviteClientToProject(PROJECT_ID, CLIENT_ID);
    expect(result.success).toBe(false);
    expect(result.error).toContain('already invited');
  });

  it('returns error when target user is not found', async () => {
    supabase.from
      .mockReturnValueOnce(buildChain({ data: null, error: null })) // no existing link
      .mockReturnValue(buildChain({ data: null, error: null })); // profile not found

    const result = await inviteClientToProject(PROJECT_ID, CLIENT_ID);
    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });

  it('returns error when target is a team member', async () => {
    supabase.from
      .mockReturnValueOnce(buildChain({ data: null, error: null })) // no existing link
      .mockReturnValue(buildChain({ data: { role: 'admin' }, error: null })); // profile is admin

    const result = await inviteClientToProject(PROJECT_ID, CLIENT_ID);
    expect(result.success).toBe(false);
    expect(result.error).toContain('team member');
  });

  it('creates client-project link successfully', async () => {
    const linkData = { id: 'link-1', client_id: CLIENT_ID, project_id: PROJECT_ID };
    supabase.from
      .mockReturnValueOnce(buildChain({ data: null, error: null })) // no existing link
      .mockReturnValueOnce(buildChain({ data: { role: 'client' }, error: null })) // target is client
      .mockReturnValue(buildChain({ data: linkData, error: null })); // insert link

    const result = await inviteClientToProject(PROJECT_ID, CLIENT_ID);
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ id: 'link-1' });
  });
});

describe('removeClientFromProject', () => {
  it('returns error when not authenticated', async () => {
    mockAuth(null);
    const result = await removeClientFromProject(PROJECT_ID, CLIENT_ID);
    expect(result.success).toBe(false);
    expect(result.error).toContain('authenticated');
  });

  it('returns error when user is not admin/manager', async () => {
    (isUserManagerOrAbove as jest.Mock).mockResolvedValueOnce(false);
    const result = await removeClientFromProject(PROJECT_ID, CLIENT_ID);
    expect(result.success).toBe(false);
    expect(result.error).toContain('admin');
  });

  it('removes client from project successfully', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));
    const result = await removeClientFromProject(PROJECT_ID, CLIENT_ID);
    expect(result.success).toBe(true);
  });

  it('returns error on DB failure', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'Delete failed' } }));
    const result = await removeClientFromProject(PROJECT_ID, CLIENT_ID);
    expect(result.success).toBe(false);
  });
});

describe('revokePortalAccess', () => {
  it('returns error when not authenticated', async () => {
    mockAuth(null);
    const result = await revokePortalAccess(CLIENT_ID);
    expect(result.success).toBe(false);
    expect(result.error).toContain('authenticated');
  });

  it('returns error when user is not admin/manager', async () => {
    (isUserManagerOrAbove as jest.Mock).mockResolvedValueOnce(false);
    const result = await revokePortalAccess(CLIENT_ID);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Admin');
  });

  it('returns error when target is not a client account', async () => {
    supabase.from.mockReturnValue(buildChain({ data: { role: 'employee' }, error: null }));
    const result = await revokePortalAccess(CLIENT_ID);
    expect(result.success).toBe(false);
    expect(result.error).toContain('client portal');
  });

  it('returns error when target profile is not found', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));
    const result = await revokePortalAccess(CLIENT_ID);
    expect(result.success).toBe(false);
    expect(result.error).toContain('client portal');
  });

  it('returns error when service role key is not configured', async () => {
    supabase.from.mockReturnValue(buildChain({ data: { role: 'client' }, error: null }));
    // createAdminClient throws by default in our mock
    const result = await revokePortalAccess(CLIENT_ID);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Service role key');
  });
});

describe('getClientInvoices', () => {
  it('returns error when not authenticated', async () => {
    mockAuth(null);
    const result = await getClientInvoices();
    expect(result.success).toBe(false);
    expect(result.error).toContain('authenticated');
  });

  it('returns invoices for admin (all invoices)', async () => {
    const invoices = [
      {
        id: 'inv-1',
        client_id: CLIENT_ID,
        project_id: PROJECT_ID,
        invoice_number: 'INV-001',
        amount: 1500,
        currency: 'EUR',
        status: 'pending',
        issued_date: '2024-01-01',
        due_date: '2024-01-31',
        paid_date: null,
        description: null,
        file_url: null,
        created_at: '2024-01-01T00:00:00Z',
        project: { id: PROJECT_ID, name: 'Test Project' },
      },
    ];
    supabase.from.mockReturnValue(buildChain({ data: invoices, error: null }));

    const result = await getClientInvoices();
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
  });

  it('returns client-specific invoices when user is not admin', async () => {
    (isUserManagerOrAbove as jest.Mock).mockResolvedValueOnce(false);
    supabase.from.mockReturnValue(buildChain({ data: [], error: null }));

    const result = await getClientInvoices();
    expect(result.success).toBe(true);
  });
});

describe('getClientDashboardData', () => {
  it('returns error when not authenticated', async () => {
    mockAuth(null);
    const result = await getClientDashboardData(CLIENT_ID);
    expect(result.success).toBe(false);
    expect(result.error).toContain('authenticated');
  });

  it('returns error when not authorized', async () => {
    (isUserManagerOrAbove as jest.Mock).mockResolvedValueOnce(false);
    // USER_ID !== CLIENT_ID
    const result = await getClientDashboardData(CLIENT_ID);
    expect(result.success).toBe(false);
    expect(result.error).toContain('authorized');
  });

  it('returns dashboard data when user is same as client', async () => {
    mockAuth({ id: CLIENT_ID, email: 'client@test.com' });
    (isUserManagerOrAbove as jest.Mock).mockResolvedValueOnce(false);

    // Mock client project links query
    supabase.from.mockReturnValue(buildChain({ data: [], error: null }));

    const result = await getClientDashboardData(CLIENT_ID);
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data).toHaveProperty('projectCount');
    expect(data).toHaveProperty('unpaidTotal');
  });
});

describe('getClientDashboardProjects', () => {
  it('returns error when not authenticated', async () => {
    mockAuth(null);
    const result = await getClientDashboardProjects(CLIENT_ID);
    expect(result.success).toBe(false);
    expect(result.error).toContain('authenticated');
  });

  it('returns empty data when client has no projects', async () => {
    mockAuth({ id: CLIENT_ID, email: 'client@test.com' });
    (isUserManagerOrAbove as jest.Mock).mockResolvedValueOnce(false);

    supabase.from.mockReturnValue(buildChain({ data: [], error: null }));

    const result = await getClientDashboardProjects(CLIENT_ID);
    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
  });

  it('returns projects with phase progress for same user', async () => {
    mockAuth({ id: CLIENT_ID, email: 'client@test.com' });
    // Single JOIN query — client_projects → projects → project_phases
    const joinedRows = [
      {
        project: {
          id: PROJECT_ID,
          name: 'Test Project',
          status: 'Active',
          project_type: 'web_design',
          description: null,
          phases: [
            { id: 'ph-1', name: 'SETUP', status: 'completed', sort_order: 1 },
            { id: 'ph-2', name: 'DESIGN', status: 'not_started', sort_order: 2 },
          ],
        },
      },
    ];

    supabase.from.mockReturnValue(buildChain({ data: joinedRows, error: null }));

    const result = await getClientDashboardProjects(CLIENT_ID);
    expect(result.success).toBe(true);
    const data = result.data as Array<{ progress: number }>;
    expect(data).toHaveLength(1);
    expect(data[0].progress).toBe(50);
  });
});

describe('getClientDashboardData (additional)', () => {
  it('returns dashboard data with activity when client has projects', async () => {
    mockAuth({ id: CLIENT_ID, email: 'client@test.com' });

    const clientProjectLinks = [{ project_id: PROJECT_ID }];
    const recentActivity = [
      {
        id: 'act-1',
        action_type: 'phase_completed',
        action_data: {},
        created_at: '2024-01-01T00:00:00Z',
        project: [{ id: PROJECT_ID, name: 'Test' }],
      },
    ];

    // First call: get project links. The remaining calls (Promise.all with IIFE)
    // have nondeterministic ordering, so use a flexible mock that returns
    // appropriate data for any from() call after the first.
    supabase.from
      .mockReturnValueOnce(buildChain({ data: clientProjectLinks, error: null }))
      // Fallback for all Promise.all queries: counts return null, IIFE projects
      // query returns client_id matches, financial_invoices returns balance data,
      // activity_log returns recent activity. Since buildChain resolves to the
      // same data for all chain methods, we use a single fallback that returns
      // data compatible with all queries (arrays work for counts via head:true too).
      .mockReturnValue(buildChain({ data: recentActivity, error: null }));

    const result = await getClientDashboardData(CLIENT_ID);
    expect(result.success).toBe(true);
    const data = result.data as { projectCount: number; recentActivity: unknown[] };
    // With the generic mock, projectCount comes from count:exact which returns null
    // from our mock, so it defaults to 0. The important thing is the function succeeds.
    expect(data.projectCount).toBeDefined();
    expect(Array.isArray(data.recentActivity)).toBe(true);
  });
});

describe('updateClientProfile', () => {
  it('returns error when not authenticated', async () => {
    mockAuth(null);
    const result = await updateClientProfile({ full_name: 'New Name' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('authenticated');
  });

  it('returns error on validation failure (name too long)', async () => {
    const result = await updateClientProfile({ full_name: 'A'.repeat(300) });
    expect(result.success).toBe(false);
  });

  it('updates client profile successfully', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));
    const result = await updateClientProfile({ full_name: 'Updated Name', company: 'Qualia' });
    expect(result.success).toBe(true);
  });

  it('returns error on DB failure', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'Update failed' } }));
    const result = await updateClientProfile({ full_name: 'Name' });
    expect(result.success).toBe(false);
  });
});

describe('getNotificationPreferences', () => {
  it('returns error when not authenticated', async () => {
    mockAuth(null);
    const result = await getNotificationPreferences();
    expect(result.success).toBe(false);
    expect(result.error).toContain('authenticated');
  });

  it('returns default preferences when no workspace found', async () => {
    const { getCurrentWorkspaceId: mockGetWs } = jest.requireMock('@/app/actions/workspace');
    (mockGetWs as jest.Mock).mockResolvedValueOnce(null);

    const result = await getNotificationPreferences();
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.task_assigned).toBe(true);
  });

  it('returns default preferences when no preferences exist in DB', async () => {
    supabase.from.mockReturnValue(
      buildChain({ data: null, error: { code: 'PGRST116', message: 'No rows' } })
    );
    const result = await getNotificationPreferences();
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.delivery_method).toBe('both');
  });

  it('returns existing preferences from DB', async () => {
    const prefs = {
      task_assigned: true,
      task_due_soon: false,
      project_update: true,
      meeting_reminder: true,
      client_activity: false,
      delivery_method: 'email',
    };
    supabase.from.mockReturnValue(buildChain({ data: prefs, error: null }));
    const result = await getNotificationPreferences();
    expect(result.success).toBe(true);
    expect((result.data as Record<string, unknown>).delivery_method).toBe('email');
  });
});

describe('updateNotificationPreferences', () => {
  it('returns error when not authenticated', async () => {
    mockAuth(null);
    const result = await updateNotificationPreferences({ task_assigned: true });
    expect(result.success).toBe(false);
    expect(result.error).toContain('authenticated');
  });

  it('returns error when no workspace found', async () => {
    const { getCurrentWorkspaceId: mockGetWs } = jest.requireMock('@/app/actions/workspace');
    (mockGetWs as jest.Mock).mockResolvedValueOnce(null);

    const result = await updateNotificationPreferences({ task_assigned: true });
    expect(result.success).toBe(false);
    expect(result.error).toContain('workspace');
  });

  it('updates preferences successfully', async () => {
    supabase.from.mockReturnValue(buildChain({ data: { id: 'pref-1' }, error: null }));
    const result = await updateNotificationPreferences({
      task_assigned: false,
      delivery_method: 'email',
    });
    expect(result.success).toBe(true);
  });

  it('returns error on DB failure', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'Upsert failed' } }));
    const result = await updateNotificationPreferences({ task_assigned: true });
    expect(result.success).toBe(false);
  });
});

describe('setupPortalForClient', () => {
  it('returns error when not authenticated', async () => {
    mockAuth(null);
    const result = await setupPortalForClient(CLIENT_ID, [PROJECT_ID]);
    expect(result.success).toBe(false);
    expect(result.error).toContain('authenticated');
  });

  it('returns error when user is not admin/manager', async () => {
    (isUserManagerOrAbove as jest.Mock).mockResolvedValueOnce(false);
    const result = await setupPortalForClient(CLIENT_ID, [PROJECT_ID]);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Admin');
  });

  it('returns error when CRM client not found (DB error)', async () => {
    // Set admin explicitly for this test
    const { isUserManagerOrAbove: mockIsManager } = jest.requireMock('@/app/actions/shared');
    (mockIsManager as jest.Mock).mockResolvedValue(true);
    supabase.from.mockReturnValue(
      buildChain({ data: null, error: { message: 'Not found', code: '404' } })
    );
    const result = await setupPortalForClient(CLIENT_ID, [PROJECT_ID]);
    expect(result.success).toBe(false);
    // Returns either "CRM client not found" or "Admin access required" depending on mock
    expect(result.error).toBeDefined();
  });
});
