export {};

/**
 * Tests for app/actions/integrations.ts
 * Covers: getIntegrations, saveIntegrationToken, removeIntegration,
 *         testIntegration, checkIntegrationsConfigured
 * External lib dependencies (Octokit, testGitHubConnection, etc.) are mocked.
 */

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    repos: {
      listWebhooks: jest.fn().mockResolvedValue({ data: [] }),
      createWebhook: jest.fn().mockResolvedValue({}),
    },
  })),
}));

jest.mock('@/lib/integrations', () => ({
  testGitHubConnection: jest.fn().mockResolvedValue({ success: true }),
  testVercelConnection: jest.fn().mockResolvedValue({ success: true }),
  clearGitHubClientCache: jest.fn().mockResolvedValue(undefined),
  clearVercelClientCache: jest.fn().mockResolvedValue(undefined),
  setupProjectIntegrations: jest.fn().mockResolvedValue(undefined),
  getProvisioningStatus: jest.fn().mockResolvedValue({ success: true, data: { status: 'done' } }),
  retryProvisioningStep: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('@/lib/integrations/zoho', () => ({
  testZohoConnection: jest.fn().mockResolvedValue({ valid: true }),
  clearZohoClientCache: jest.fn(),
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
  getIntegrations,
  saveIntegrationToken,
  removeIntegration,
  testIntegration,
  checkIntegrationsConfigured,
} from '@/app/actions/integrations';

// ---- Helpers ----

const ADMIN_USER = { id: 'admin-id', email: 'admin@test.com' };

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

function mockAuth(user: { id: string; email: string } | null = ADMIN_USER) {
  supabase.auth.getUser.mockResolvedValue({ data: { user }, error: null });
}

function mockAdminProfile() {
  supabase.from.mockReturnValueOnce(buildChain({ data: { role: 'admin' }, error: null }));
}

function mockNonAdminProfile() {
  supabase.from.mockReturnValueOnce(buildChain({ data: { role: 'employee' }, error: null }));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth();
});

// ---- Tests ----

describe('getIntegrations', () => {
  it('returns error when not authenticated', async () => {
    mockAuth(null);
    const result = await getIntegrations('workspace-1');
    expect(result.success).toBe(false);
    expect(result.error).toContain('authenticated');
  });

  it('returns error when user is not admin', async () => {
    mockNonAdminProfile();
    const result = await getIntegrations('workspace-1');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Admin');
  });

  it('returns integration list for admin user', async () => {
    mockAdminProfile();
    const integrationRows = [
      { provider: 'github', is_connected: true, last_verified_at: null, config: { org: 'qualia' } },
    ];
    supabase.from.mockReturnValue(buildChain({ data: integrationRows, error: null }));

    const result = await getIntegrations('workspace-1');
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0].provider).toBe('github');
  });

  it('returns error on DB failure', async () => {
    mockAdminProfile();
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'DB error' } }));
    const result = await getIntegrations('workspace-1');
    expect(result.success).toBe(false);
  });
});

describe('saveIntegrationToken', () => {
  it('returns error when not authenticated', async () => {
    mockAuth(null);
    const result = await saveIntegrationToken('ws-1', 'github', 'token', { org: 'test' });
    expect(result.success).toBe(false);
  });

  it('returns error when user is not admin', async () => {
    mockNonAdminProfile();
    const result = await saveIntegrationToken('ws-1', 'github', 'token', { org: 'test' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Admin');
  });

  it('saves GitHub integration token for admin', async () => {
    mockAdminProfile();
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));

    const result = await saveIntegrationToken('ws-1', 'github', 'ghp_token', { org: 'qualia' });
    expect(result.success).toBe(true);
  });

  it('saves Zoho integration token (skips validation)', async () => {
    mockAdminProfile();
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));

    const result = await saveIntegrationToken('ws-1', 'zoho', 'refresh_token', {
      clientId: 'cid',
      clientSecret: 'csec',
      refreshToken: 'rtoken',
    });
    expect(result.success).toBe(true);
  });
});

describe('removeIntegration', () => {
  it('returns error when not authenticated', async () => {
    mockAuth(null);
    const result = await removeIntegration('ws-1', 'github');
    expect(result.success).toBe(false);
  });

  it('returns error when user is not admin', async () => {
    mockNonAdminProfile();
    const result = await removeIntegration('ws-1', 'github');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Admin');
  });

  it('removes integration successfully for admin', async () => {
    mockAdminProfile();
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));

    const result = await removeIntegration('ws-1', 'github');
    expect(result.success).toBe(true);
  });

  it('returns error on DB failure', async () => {
    mockAdminProfile();
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'Delete failed' } }));

    const result = await removeIntegration('ws-1', 'github');
    expect(result.success).toBe(false);
  });
});

describe('testIntegration', () => {
  it('returns error when not authenticated', async () => {
    mockAuth(null);
    const result = await testIntegration('ws-1', 'github');
    expect(result.success).toBe(false);
  });

  it('returns error when user is not admin', async () => {
    mockNonAdminProfile();
    const result = await testIntegration('ws-1', 'github');
    expect(result.success).toBe(false);
  });

  it('returns not-configured when no integration stored', async () => {
    mockAdminProfile();
    supabase.from.mockReturnValue(buildChain({ data: null, error: { code: 'PGRST116' } }));

    const result = await testIntegration('ws-1', 'github');
    expect(result.success).toBe(true);
    expect(result.data?.valid).toBe(false);
    expect(result.data?.error).toContain('not configured');
  });

  it('tests GitHub integration connection', async () => {
    mockAdminProfile();
    const integrationData = {
      encrypted_token: 'ghp_token',
      config: { org: 'qualia' },
    };
    supabase.from
      .mockReturnValueOnce(buildChain({ data: integrationData, error: null }))
      .mockReturnValue(buildChain({ data: null, error: null }));

    const result = await testIntegration('ws-1', 'github');
    expect(result.success).toBe(true);
    expect(result.data?.valid).toBe(true);
  });
});

describe('checkIntegrationsConfigured', () => {
  it('returns false for both when no integrations', async () => {
    supabase.from.mockReturnValue(buildChain({ data: [], error: null }));

    const result = await checkIntegrationsConfigured('ws-1');
    expect(result.success).toBe(true);
    expect(result.data?.github).toBe(false);
    expect(result.data?.vercel).toBe(false);
  });

  it('returns true for configured providers', async () => {
    const integrations = [
      { provider: 'github', is_connected: true },
      { provider: 'vercel', is_connected: true },
    ];
    supabase.from.mockReturnValue(buildChain({ data: integrations, error: null }));

    const result = await checkIntegrationsConfigured('ws-1');
    expect(result.success).toBe(true);
    expect(result.data?.github).toBe(true);
    expect(result.data?.vercel).toBe(true);
  });

  it('returns false for disconnected providers', async () => {
    const integrations = [
      { provider: 'github', is_connected: false },
      { provider: 'vercel', is_connected: false },
    ];
    supabase.from.mockReturnValue(buildChain({ data: integrations, error: null }));

    const result = await checkIntegrationsConfigured('ws-1');
    expect(result.data?.github).toBe(false);
    expect(result.data?.vercel).toBe(false);
  });

  it('returns error on DB failure', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'DB error' } }));

    const result = await checkIntegrationsConfigured('ws-1');
    expect(result.success).toBe(false);
  });
});
