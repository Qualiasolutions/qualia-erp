export {};

/**
 * Data-contract tests for app/actions/reports.ts.
 *
 * Focus: getAssignedVsDone must use the LIVE project_assignments schema
 *   - employee_id (not profile_id)
 *   - removed_at IS NULL (not status='active')
 * The 2026-04-28 operations diagnosis caught this returning empty silently.
 */

const WORKSPACE_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const ADMIN_USER_ID = '5fcff947-9839-4b1a-9962-f9528d4c084c';

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createAdminClient: jest.fn(),
}));

jest.mock('@/app/actions/shared', () => ({
  isUserAdmin: jest.fn().mockResolvedValue(true),
}));

type ChainMethods = Record<string, jest.Mock>;

function buildChain(resolvedData: { data: unknown; error: unknown } = { data: [], error: null }) {
  const methods = [
    'select',
    'eq',
    'neq',
    'in',
    'is',
    'not',
    'gte',
    'lte',
    'lt',
    'order',
    'limit',
    'range',
    'ilike',
    'single',
    'maybeSingle',
  ];
  const chain: ChainMethods = Object.fromEntries(methods.map((m) => [m, jest.fn()]));
  const promised = Object.assign(Promise.resolve(resolvedData), chain);
  Object.values(chain).forEach((fn) => fn.mockReturnValue(promised));
  return chain;
}

let tableQueues: Record<string, Array<{ data: unknown; error: unknown }>>;
let callLog: { table: string; chain: ChainMethods }[];

const mockSupabase = {
  from: jest.fn((table: string) => {
    const queue = tableQueues[table] || [];
    const response = queue.shift() || { data: [], error: null };
    const chain = buildChain(response);
    callLog.push({ table, chain });
    return chain;
  }),
  auth: { getUser: jest.fn() },
};

function enqueue(table: string, data: unknown, error: unknown = null) {
  if (!tableQueues[table]) tableQueues[table] = [];
  tableQueues[table].push({ data, error });
}

beforeEach(() => {
  jest.clearAllMocks();
  callLog = [];
  tableQueues = {};

  const { createClient } = jest.requireMock('@/lib/supabase/server');
  (createClient as jest.Mock).mockResolvedValue(mockSupabase);

  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id: ADMIN_USER_ID } },
    error: null,
  });
});

describe('getAssignedVsDone — data contract', () => {
  it('queries project_assignments using employee_id and removed_at IS NULL (not the legacy profile_id/status fields)', async () => {
    // Arrange: empty assignments + empty sessions (we only inspect chain calls)
    enqueue('project_assignments', []);
    enqueue('work_sessions', []);

    const { getAssignedVsDone } = await import('@/app/actions/reports');

    // Act
    await getAssignedVsDone(WORKSPACE_ID, '2026-04-01', '2026-04-30');

    // Assert
    const paCall = callLog.find((c) => c.table === 'project_assignments');
    expect(paCall).toBeDefined();
    const chain = paCall!.chain;

    // workspace_id filter
    expect(chain.eq).toHaveBeenCalledWith('workspace_id', WORKSPACE_ID);

    // Active assignments are now removed_at IS NULL — must NOT pass status='active'
    expect(chain.is).toHaveBeenCalledWith('removed_at', null);
    expect(chain.eq).not.toHaveBeenCalledWith('status', 'active');

    // The select string must reference employee_id and the live FK alias.
    // It must NOT use the dropped profile_id column.
    const selectArg = (chain.select.mock.calls[0]?.[0] ?? '') as string;
    expect(selectArg).toContain('employee_id');
    expect(selectArg).toContain('project_assignments_employee_id_fkey');
    expect(selectArg).not.toMatch(/\bprofile_id\b/);
    expect(selectArg).not.toContain('project_assignments_profile_id_fkey');
  });

  it('returns empty array (not an error) when no assignments and no sessions exist', async () => {
    enqueue('project_assignments', []);
    enqueue('work_sessions', []);

    const { getAssignedVsDone } = await import('@/app/actions/reports');
    const result = await getAssignedVsDone(WORKSPACE_ID, '2026-04-01', '2026-04-30');

    expect(result).toEqual([]);
  });

  it('joins assigned employee + project rows correctly through the new FK alias', async () => {
    const employeeId = 'aa11bb22-cc33-4dd5-8ee6-ff7700112233';
    const projectId = 'bb22cc33-dd44-4ee5-9ff6-aa7700112244';
    enqueue('project_assignments', [
      {
        employee_id: employeeId,
        project: { id: projectId, name: 'ACME' },
        employee: { id: employeeId, full_name: 'Alice' },
      },
    ]);
    enqueue('work_sessions', []);

    const { getAssignedVsDone } = await import('@/app/actions/reports');
    const result = await getAssignedVsDone(WORKSPACE_ID, '2026-04-01', '2026-04-30');

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      profileId: employeeId,
      fullName: 'Alice',
      assignedProjects: [{ id: projectId, name: 'ACME' }],
    });
  });
});
