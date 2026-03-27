export {};

/**
 * Tests for app/actions/deployments.ts
 * Covers: getProjectDeployments, getProjectEnvironments, getDeploymentStats, linkVercelProject
 */

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
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
  getProjectDeployments,
  getProjectEnvironments,
  getDeploymentStats,
  linkVercelProject,
} from '@/app/actions/deployments';

// ---- Helpers ----

const PROJECT_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const ENV_ID = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const USER_ID = 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
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
    'gte',
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
});

// ---- Tests ----

describe('getProjectDeployments', () => {
  it('returns empty array when not authenticated', async () => {
    mockAuth(null);
    const result = await getProjectDeployments(PROJECT_ID);
    expect(result).toEqual([]);
  });

  it('returns deployments list', async () => {
    const deployments = [
      { id: 'd1', project_id: PROJECT_ID, status: 'ready', environment: 'production' },
    ];
    supabase.from.mockReturnValue(buildChain({ data: deployments, error: null }));
    const result = await getProjectDeployments(PROJECT_ID);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('ready');
  });

  it('returns empty array on DB error', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'DB error' } }));
    const result = await getProjectDeployments(PROJECT_ID);
    expect(result).toEqual([]);
  });

  it('returns empty array when data is null', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));
    const result = await getProjectDeployments(PROJECT_ID);
    expect(result).toEqual([]);
  });
});

describe('getProjectEnvironments', () => {
  it('returns empty array when not authenticated', async () => {
    mockAuth(null);
    const result = await getProjectEnvironments(PROJECT_ID);
    expect(result).toEqual([]);
  });

  it('returns normalized environments list', async () => {
    const environments = [
      {
        id: ENV_ID,
        project_id: PROJECT_ID,
        name: 'production',
        url: 'https://example.com',
        health_status: 'healthy',
        last_deployment: [{ id: 'd1', status: 'ready' }],
      },
    ];
    supabase.from.mockReturnValue(buildChain({ data: environments, error: null }));
    const result = await getProjectEnvironments(PROJECT_ID);
    expect(result).toHaveLength(1);
    expect(Array.isArray(result[0].last_deployment)).toBe(false);
  });

  it('returns empty array on DB error', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'DB error' } }));
    const result = await getProjectEnvironments(PROJECT_ID);
    expect(result).toEqual([]);
  });

  it('handles non-array last_deployment', async () => {
    const environments = [
      {
        id: ENV_ID,
        project_id: PROJECT_ID,
        name: 'production',
        url: 'https://example.com',
        health_status: 'healthy',
        last_deployment: { id: 'd1', status: 'ready' }, // not an array
      },
    ];
    supabase.from.mockReturnValue(buildChain({ data: environments, error: null }));
    const result = await getProjectEnvironments(PROJECT_ID);
    expect(result[0].last_deployment).toMatchObject({ id: 'd1' });
  });
});

describe('getDeploymentStats', () => {
  it('returns zero stats when not authenticated', async () => {
    mockAuth(null);
    const result = await getDeploymentStats(PROJECT_ID);
    expect(result.total).toBe(0);
    expect(result.successful).toBe(0);
    expect(result.failed).toBe(0);
  });

  it('returns deployment stats', async () => {
    const deployments = [
      { status: 'ready', environment: 'production' },
      { status: 'ready', environment: 'production' },
      { status: 'error', environment: 'staging' },
    ];
    supabase.from.mockReturnValue(buildChain({ data: deployments, error: null }));
    const result = await getDeploymentStats(PROJECT_ID);
    expect(result.total).toBe(3);
    expect(result.successful).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.byEnvironment['production']).toBe(2);
    expect(result.byEnvironment['staging']).toBe(1);
  });

  it('returns zero stats on DB error', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'DB error' } }));
    const result = await getDeploymentStats(PROJECT_ID);
    expect(result.total).toBe(0);
  });
});

describe('linkVercelProject', () => {
  it('returns error when not authenticated', async () => {
    mockAuth(null);
    const result = await linkVercelProject(PROJECT_ID, 'prj_abc123');
    expect(result.success).toBe(false);
    expect(result.error).toContain('authenticated');
  });

  it('links Vercel project successfully', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));
    const result = await linkVercelProject(PROJECT_ID, 'prj_abc123');
    expect(result.success).toBe(true);
  });

  it('returns error on DB failure', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'Update failed' } }));
    const result = await linkVercelProject(PROJECT_ID, 'prj_abc123');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Update failed');
  });
});
