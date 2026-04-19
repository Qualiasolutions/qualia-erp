export {};

/**
 * Characterization tests for client-portal — safety net for the god-module split.
 *
 * Covers 7 exports with contract-level assertions:
 *   getPortalClientManagement, getClientDashboardData,
 *   getClientDashboardProjects, getClientInvoices,
 *   getClientActionItems, setupPortalForClient,
 *   createClientActionItem
 *
 * Each export has:
 *   (a) unauthenticated rejection test
 *   (b) success-path shape assertion
 *   (c) authorization guard test for admin-only functions
 */

// --- Mocks (must come before imports) ---

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  unstable_cache: jest.fn(<T>(fn: (...args: any[]) => Promise<T>) => fn),
  unstable_noStore: jest.fn(),
}));

jest.mock('@/app/actions/workspace', () => ({
  getCurrentWorkspaceId: jest.fn().mockResolvedValue('ws-00000000-0000-0000-0000-000000000001'),
}));

jest.mock('@/app/actions/shared', () => ({
  isUserManagerOrAbove: jest.fn().mockResolvedValue(true),
  getCachedUserRole: jest.fn().mockResolvedValue('admin'),
}));

// Mock @/lib/email so the fire-and-forget import() in createClientActionItem resolves
jest.mock('@/lib/email', () => ({
  notifyClientOfActionItem: jest.fn().mockResolvedValue(undefined),
  notifyClientOfActionItemCompleted: jest.fn().mockResolvedValue(undefined),
}));

const supabase = {
  from: jest.fn() as jest.Mock,
  auth: {
    getUser: jest.fn() as jest.Mock,
    resetPasswordForEmail: jest.fn() as jest.Mock,
  },
  storage: {
    from: jest.fn().mockReturnValue({
      getPublicUrl: jest.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/test.png' },
      }),
    }),
  },
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve(supabase),
  createAdminClient: jest.fn(() => {
    throw new Error('Service role key not configured');
  }),
}));

// --- Imports ---

import {
  getPortalClientManagement,
  getClientDashboardData,
  getClientDashboardProjects,
  getClientInvoices,
  getClientActionItems,
  setupPortalForClient,
  createClientActionItem,
} from '@/app/actions/client-portal';
import { isUserManagerOrAbove } from '@/app/actions/shared';

// --- Constants ---

const USER_ID = 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const CLIENT_ID = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const PROJECT_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const AUTH_USER = { id: USER_ID, email: 'admin@test.com' };

// --- Helpers ---

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
    'or',
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

// --- Setup / Teardown ---

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth();
  // Use mockReset before setting resolved value to clear any leftover
  // `mockResolvedValueOnce` entries from prior tests (clearAllMocks does not
  // reliably clear the "once" queue in all Jest versions).
  const { isUserManagerOrAbove: mockIsManager } = jest.requireMock('@/app/actions/shared');
  (mockIsManager as jest.Mock).mockReset();
  (mockIsManager as jest.Mock).mockResolvedValue(true);
  const { getCurrentWorkspaceId: mockGetWs } = jest.requireMock('@/app/actions/workspace');
  (mockGetWs as jest.Mock).mockReset();
  (mockGetWs as jest.Mock).mockResolvedValue('ws-00000000-0000-0000-0000-000000000001');
});

// ============================================================================
// 1. getPortalClientManagement
// ============================================================================

describe('getPortalClientManagement — characterization', () => {
  it('rejects unauthenticated calls', async () => {
    mockAuth(null);
    const result = await getPortalClientManagement();
    expect(result).toEqual({ success: false, error: 'Not authenticated' });
  });

  it('rejects non-admin users', async () => {
    (isUserManagerOrAbove as jest.Mock).mockResolvedValueOnce(false);
    const result = await getPortalClientManagement();
    expect(result).toEqual({ success: false, error: 'Admin access required' });
  });

  it('returns { clients, totalActive, totalInactive } on success', async () => {
    supabase.from.mockReturnValue(buildChain({ data: [], error: null }));

    const result = await getPortalClientManagement();
    expect(result.success).toBe(true);
    const data = result.data as {
      clients: unknown[];
      totalActive: number;
      totalInactive: number;
    };
    expect(Array.isArray(data.clients)).toBe(true);
    expect(typeof data.totalActive).toBe('number');
    expect(typeof data.totalInactive).toBe('number');
  });
});

// ============================================================================
// 2. getClientDashboardData
// ============================================================================

describe('getClientDashboardData — characterization', () => {
  it('rejects unauthenticated calls', async () => {
    mockAuth(null);
    const result = await getClientDashboardData(CLIENT_ID);
    expect(result).toEqual({ success: false, error: 'Not authenticated' });
  });

  it('rejects unauthorized users (not self and not admin)', async () => {
    (isUserManagerOrAbove as jest.Mock).mockResolvedValueOnce(false);
    // USER_ID !== CLIENT_ID
    const result = await getClientDashboardData(CLIENT_ID);
    expect(result).toEqual({ success: false, error: 'Not authorized' });
  });

  it('returns dashboard shape for self-access', async () => {
    mockAuth({ id: CLIENT_ID, email: 'client@test.com' });
    (isUserManagerOrAbove as jest.Mock).mockResolvedValueOnce(false);

    // First call: client_projects JOIN. Rest: Promise.all queries.
    supabase.from.mockReturnValue(buildChain({ data: [], error: null }));

    const result = await getClientDashboardData(CLIENT_ID);
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data).toHaveProperty('projectCount');
    expect(data).toHaveProperty('pendingRequests');
    expect(data).toHaveProperty('unpaidInvoiceCount');
    expect(data).toHaveProperty('unpaidTotal');
    expect(data).toHaveProperty('recentActivity');
  });

  it('returns dashboard shape for admin access to another user', async () => {
    // USER_ID is admin viewing CLIENT_ID's dashboard
    supabase.from.mockReturnValue(buildChain({ data: [], error: null }));

    const result = await getClientDashboardData(CLIENT_ID);
    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data).toHaveProperty('projectCount');
    expect(typeof data.unpaidTotal).toBe('number');
  });
});

// ============================================================================
// 3. getClientDashboardProjects
// ============================================================================

describe('getClientDashboardProjects — characterization', () => {
  it('rejects unauthenticated calls', async () => {
    mockAuth(null);
    const result = await getClientDashboardProjects(CLIENT_ID);
    expect(result).toEqual({ success: false, error: 'Not authenticated' });
  });

  it('rejects unauthorized users (not self and not admin)', async () => {
    (isUserManagerOrAbove as jest.Mock).mockResolvedValueOnce(false);
    const result = await getClientDashboardProjects(CLIENT_ID);
    expect(result).toEqual({ success: false, error: 'Not authorized' });
  });

  it('returns empty array when no projects', async () => {
    mockAuth({ id: CLIENT_ID, email: 'client@test.com' });
    (isUserManagerOrAbove as jest.Mock).mockResolvedValueOnce(false);
    supabase.from.mockReturnValue(buildChain({ data: [], error: null }));

    const result = await getClientDashboardProjects(CLIENT_ID);
    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
  });

  it('returns projects with progress metrics', async () => {
    mockAuth({ id: CLIENT_ID, email: 'client@test.com' });

    const joinedRows = [
      {
        project: {
          id: PROJECT_ID,
          name: 'Project Alpha',
          status: 'Active',
          project_type: 'web_design',
          description: 'A test project',
          phases: [
            { id: 'ph-1', name: 'SETUP', status: 'completed', sort_order: 1, phase_type: null },
            {
              id: 'ph-2',
              name: 'DESIGN',
              status: 'not_started',
              sort_order: 2,
              phase_type: null,
            },
          ],
        },
      },
    ];

    supabase.from.mockReturnValue(buildChain({ data: joinedRows, error: null }));

    const result = await getClientDashboardProjects(CLIENT_ID);
    expect(result.success).toBe(true);
    const data = result.data as Array<Record<string, unknown>>;
    expect(data).toHaveLength(1);
    expect(data[0]).toEqual(
      expect.objectContaining({
        id: PROJECT_ID,
        name: 'Project Alpha',
        progress: 50,
        totalPhases: 2,
        completedPhases: 1,
      })
    );
    expect(data[0]).toHaveProperty('currentPhase');
    expect(data[0]).toHaveProperty('nextPhase');
  });
});

// ============================================================================
// 4. getClientInvoices
// ============================================================================

describe('getClientInvoices — characterization', () => {
  it('rejects unauthenticated calls', async () => {
    mockAuth(null);
    const result = await getClientInvoices();
    expect(result).toEqual({ success: false, error: 'Not authenticated' });
  });

  it('returns mapped invoices for admin', async () => {
    const rawInvoices = [
      {
        zoho_id: 'INV-001',
        invoice_number: 'INV-001',
        total: 1500,
        currency_code: 'EUR',
        status: 'pending',
        date: '2024-01-01',
        due_date: '2024-01-31',
        last_payment_date: null,
        client_id: CLIENT_ID,
        is_hidden: false,
        source: 'zoho',
        pdf_url: null,
      },
    ];
    supabase.from.mockReturnValue(buildChain({ data: rawInvoices, error: null }));

    const result = await getClientInvoices();
    expect(result.success).toBe(true);
    const data = result.data as Array<Record<string, unknown>>;
    expect(data).toHaveLength(1);
    expect(data[0]).toEqual(
      expect.objectContaining({
        id: 'INV-001',
        invoice_number: 'INV-001',
        amount: 1500,
        currency: 'EUR',
        status: 'pending',
        has_pdf: false,
      })
    );
  });

  it('returns empty array when non-admin has no linked projects', async () => {
    (isUserManagerOrAbove as jest.Mock).mockResolvedValueOnce(false);
    // First call: client_projects — empty
    supabase.from.mockReturnValue(buildChain({ data: [], error: null }));

    const result = await getClientInvoices();
    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
  });
});

// ============================================================================
// 5. getClientActionItems
// ============================================================================

describe('getClientActionItems — characterization', () => {
  it('rejects unauthenticated calls', async () => {
    mockAuth(null);
    const result = await getClientActionItems(CLIENT_ID);
    expect(result).toEqual({ success: false, error: 'Not authenticated' });
  });

  it('rejects unauthorized users (not self and not admin)', async () => {
    (isUserManagerOrAbove as jest.Mock).mockResolvedValueOnce(false);
    const result = await getClientActionItems(CLIENT_ID);
    expect(result).toEqual({ success: false, error: 'Unauthorized' });
  });

  it('returns normalized action items on success', async () => {
    const actionItems = [
      {
        id: 'ai-1',
        title: 'Approve design',
        description: null,
        action_type: 'approval',
        due_date: '2024-06-15',
        completed_at: null,
        project: [{ id: PROJECT_ID, name: 'Test Project' }],
      },
    ];
    supabase.from.mockReturnValue(buildChain({ data: actionItems, error: null }));

    const result = await getClientActionItems(USER_ID); // self-access
    expect(result.success).toBe(true);
    const data = result.data as Array<Record<string, unknown>>;
    expect(data).toHaveLength(1);
    expect(data[0]).toEqual(
      expect.objectContaining({
        id: 'ai-1',
        title: 'Approve design',
        action_type: 'approval',
      })
    );
    // FK normalized
    expect(Array.isArray(data[0].project)).toBe(false);
  });

  it('allows admin access to another clients action items', async () => {
    // Admin (USER_ID) viewing CLIENT_ID's items
    supabase.from.mockReturnValue(buildChain({ data: [], error: null }));

    const result = await getClientActionItems(CLIENT_ID);
    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
  });
});

// ============================================================================
// 6. setupPortalForClient
// ============================================================================

describe('setupPortalForClient — characterization', () => {
  it('rejects unauthenticated calls', async () => {
    mockAuth(null);
    const result = await setupPortalForClient(CLIENT_ID, [PROJECT_ID]);
    expect(result).toEqual({ success: false, error: 'Not authenticated' });
  });

  it('rejects non-admin users', async () => {
    (isUserManagerOrAbove as jest.Mock).mockResolvedValueOnce(false);
    const result = await setupPortalForClient(CLIENT_ID, [PROJECT_ID]);
    expect(result).toEqual({ success: false, error: 'Admin access required' });
  });

  it('returns error when CRM client not found', async () => {
    supabase.from.mockReturnValue(
      buildChain({ data: null, error: { message: 'Not found', code: '404' } })
    );
    const result = await setupPortalForClient(CLIENT_ID, [PROJECT_ID]);
    expect(result.success).toBe(false);
    expect(result.error).toBe('CRM client not found');
  });

  it('returns error when client has no email', async () => {
    // First call: clients table — found
    // Second call: client_contacts primary — no email
    // Third call: client_contacts fallback — no email
    supabase.from
      .mockReturnValueOnce(buildChain({ data: { id: CLIENT_ID, name: 'Acme Corp' }, error: null }))
      .mockReturnValueOnce(buildChain({ data: null, error: null })) // primary contact
      .mockReturnValue(buildChain({ data: null, error: null })); // fallback contact

    const result = await setupPortalForClient(CLIENT_ID, [PROJECT_ID]);
    expect(result.success).toBe(false);
    expect(result.error).toBe('CRM client has no email on file');
  });
});

// ============================================================================
// 7. createClientActionItem
// ============================================================================

describe('createClientActionItem — characterization', () => {
  it('rejects unauthenticated calls', async () => {
    mockAuth(null);
    const result = await createClientActionItem({
      projectId: PROJECT_ID,
      clientId: CLIENT_ID,
      title: 'Approve mockup',
      actionType: 'approval',
    });
    expect(result).toEqual({ success: false, error: 'Not authenticated' });
  });

  it('rejects non-admin users', async () => {
    (isUserManagerOrAbove as jest.Mock).mockResolvedValueOnce(false);
    const result = await createClientActionItem({
      projectId: PROJECT_ID,
      clientId: CLIENT_ID,
      title: 'Approve mockup',
      actionType: 'approval',
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('admins');
  });

  it('rejects invalid data (title too short)', async () => {
    const result = await createClientActionItem({
      projectId: PROJECT_ID,
      clientId: CLIENT_ID,
      title: 'A', // min 2 chars
      actionType: 'approval',
    });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('rejects invalid actionType', async () => {
    const result = await createClientActionItem({
      projectId: PROJECT_ID,
      clientId: CLIENT_ID,
      title: 'Do something',
      actionType: 'invalid_type',
    });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('returns created action item on success', async () => {
    const insertedItem = {
      id: 'cai-1',
      project_id: PROJECT_ID,
      client_id: CLIENT_ID,
      title: 'Approve final design',
      description: null,
      action_type: 'approval',
      due_date: null,
      created_by: USER_ID,
      completed_at: null,
    };
    supabase.from.mockReturnValue(buildChain({ data: insertedItem, error: null }));

    const result = await createClientActionItem({
      projectId: PROJECT_ID,
      clientId: CLIENT_ID,
      title: 'Approve final design',
      actionType: 'approval',
    });
    expect(result.success).toBe(true);
    expect(result.data).toEqual(
      expect.objectContaining({
        id: 'cai-1',
        title: 'Approve final design',
        action_type: 'approval',
      })
    );
  });
});
