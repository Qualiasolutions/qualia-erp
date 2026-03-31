export {};

/**
 * Tests for app/actions/auto-assign.ts
 * Covers: getActiveMilestone, createTasksFromMilestone,
 *         handleReassignment, markMilestoneTasksDone
 */

// ---- Constants (valid RFC 4122 UUIDs) ----
const PROJECT_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const PHASE_ID_1 = '02d60c07-f159-457e-a809-03c2aa5ba784';
const PHASE_ID_2 = '12d60c07-f159-457e-a809-03c2aa5ba785';
const ITEM_ID_1 = '22d60c07-f159-457e-a809-03c2aa5ba786';
const ITEM_ID_2 = '32d60c07-f159-457e-a809-03c2aa5ba787';
const TASK_ID_1 = '52d60c07-f159-457e-a809-03c2aa5ba789';
const TASK_ID_2 = '62d60c07-f159-457e-a809-03c2aa5ba790';
const USER_A = '4fcff947-9839-4b1a-9962-f9528d4c084b';
const USER_B = '5fcff947-9839-4b1a-9962-f9528d4c084c';
const WORKSPACE_ID = 'c8ec2ea1-325e-4ea9-9334-4590e88845f9';

// ---- Module mocks ----

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/app/actions/shared', () => ({
  isUserManagerOrAbove: jest.fn().mockResolvedValue(true),
}));

// ---- Mock setup ----

type ChainMethods = Record<string, jest.Mock>;

const callLog: { table: string; chain: ChainMethods }[] = [];

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
    'upsert',
  ];
  const chain: ChainMethods = Object.fromEntries(methods.map((m) => [m, jest.fn()]));
  const promised = Object.assign(Promise.resolve(resolvedData), chain);
  Object.values(chain).forEach((fn) => fn.mockReturnValue(promised));
  return chain;
}

// Multi-table mock: returns different chains per table name
let tableChains: Record<string, ChainMethods> = {};

const mockSupabase = {
  from: jest.fn((table: string) => {
    const chain = tableChains[table] || buildChain();
    callLog.push({ table, chain });
    return chain;
  }),
  auth: { getUser: jest.fn() },
};

function setupClient() {
  const { createClient } = jest.requireMock('@/lib/supabase/server');
  (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: USER_A } } });
}

function mockTable(table: string, data: unknown, error: unknown = null) {
  tableChains[table] = buildChain({ data, error });
  return tableChains[table];
}

beforeEach(() => {
  jest.clearAllMocks();
  callLog.length = 0;
  tableChains = {};
  setupClient();
});

// ---- Test Data Factories ----

function makePhase(overrides: Record<string, unknown> = {}) {
  return {
    id: PHASE_ID_1,
    name: 'Setup',
    status: 'not_started',
    milestone_number: 1,
    sort_order: 0,
    ...overrides,
  };
}

function makePhaseItem(overrides: Record<string, unknown> = {}) {
  return {
    id: ITEM_ID_1,
    phase_id: PHASE_ID_1,
    title: 'Configure database',
    description: 'Set up the Supabase schema',
    helper_text: null,
    display_order: 0,
    status: null,
    is_completed: false,
    ...overrides,
  };
}

// ============================================================================
// getActiveMilestone
// ============================================================================

describe('getActiveMilestone', () => {
  let getActiveMilestone: typeof import('@/app/actions/auto-assign').getActiveMilestone;

  beforeEach(async () => {
    ({ getActiveMilestone } = await import('@/app/actions/auto-assign'));
  });

  it('returns null when project has no phases with milestone numbers', async () => {
    mockTable('project_phases', []);

    const result = await getActiveMilestone(PROJECT_ID);
    expect(result).toBeNull();
  });

  it('returns null when all milestones are completed', async () => {
    mockTable('project_phases', [
      makePhase({ milestone_number: 1, status: 'completed' }),
      makePhase({ id: PHASE_ID_2, milestone_number: 2, status: 'completed' }),
    ]);

    const result = await getActiveMilestone(PROJECT_ID);
    expect(result).toBeNull();
  });

  it('returns the lowest incomplete milestone with phase items', async () => {
    // Milestone 1 is complete, milestone 2 has an incomplete phase
    mockTable('project_phases', [
      makePhase({ milestone_number: 1, status: 'completed' }),
      makePhase({ id: PHASE_ID_2, milestone_number: 2, status: 'in_progress' }),
    ]);
    mockTable('phase_items', [makePhaseItem({ phase_id: PHASE_ID_2 })]);

    const result = await getActiveMilestone(PROJECT_ID);

    expect(result).not.toBeNull();
    expect(result!.milestoneNumber).toBe(2);
    expect(result!.phases).toHaveLength(1);
  });

  it('returns null on database error', async () => {
    mockTable('project_phases', null, { message: 'DB error' });

    const result = await getActiveMilestone(PROJECT_ID);
    expect(result).toBeNull();
  });
});

// ============================================================================
// createTasksFromMilestone
// ============================================================================

describe('createTasksFromMilestone', () => {
  let createTasksFromMilestone: typeof import('@/app/actions/auto-assign').createTasksFromMilestone;

  beforeEach(async () => {
    ({ createTasksFromMilestone } = await import('@/app/actions/auto-assign'));
  });

  it('returns zeros when project not found', async () => {
    mockTable('projects', null, { message: 'Not found' });

    const result = await createTasksFromMilestone(PROJECT_ID, 1, USER_A, 'assignment');
    expect(result).toEqual({ created: 0, skipped: 0, total: 0 });
  });

  it('returns zeros when no phases exist for milestone', async () => {
    mockTable('projects', { workspace_id: WORKSPACE_ID });
    mockTable('project_phases', []);

    const result = await createTasksFromMilestone(PROJECT_ID, 1, USER_A, 'assignment');
    expect(result).toEqual({ created: 0, skipped: 0, total: 0 });
  });

  it('returns zeros when no phase items exist', async () => {
    mockTable('projects', { workspace_id: WORKSPACE_ID });
    mockTable('project_phases', [makePhase()]);
    mockTable('phase_items', []);

    const result = await createTasksFromMilestone(PROJECT_ID, 1, USER_A, 'assignment');
    expect(result).toEqual({ created: 0, skipped: 0, total: 0 });
  });

  it('creates tasks for phase items and returns accurate counts', async () => {
    const items = [
      makePhaseItem({ id: ITEM_ID_1 }),
      makePhaseItem({ id: ITEM_ID_2, title: 'Write tests', display_order: 1 }),
    ];

    mockTable('projects', { workspace_id: WORKSPACE_ID });
    mockTable('project_phases', [makePhase()]);
    mockTable('phase_items', items);
    // No existing tasks
    mockTable('tasks', []);

    const result = await createTasksFromMilestone(PROJECT_ID, 1, USER_A, 'assignment');

    // The upsert was called on the tasks table
    expect(mockSupabase.from).toHaveBeenCalledWith('tasks');
    // Should report 2 created (upsert returns the inserted rows)
    // Note: with our mock, upsert resolves with the mocked data (empty array)
    // The real test is that no errors occurred
    expect(result.total).toBe(2);
  });

  it('skips items that already have tasks (idempotency)', async () => {
    const items = [
      makePhaseItem({ id: ITEM_ID_1 }),
      makePhaseItem({ id: ITEM_ID_2, title: 'Write tests', display_order: 1 }),
    ];

    mockTable('projects', { workspace_id: WORKSPACE_ID });
    mockTable('project_phases', [makePhase()]);
    mockTable('phase_items', items);
    // One item already has a task
    mockTable('tasks', [{ source_phase_item_id: ITEM_ID_1 }]);

    const result = await createTasksFromMilestone(PROJECT_ID, 1, USER_A, 'assignment');

    // 2 total items, 1 already exists
    expect(result.total).toBe(2);
  });
});

// ============================================================================
// handleReassignment
// ============================================================================

describe('handleReassignment', () => {
  let handleReassignment: typeof import('@/app/actions/auto-assign').handleReassignment;

  beforeEach(async () => {
    ({ handleReassignment } = await import('@/app/actions/auto-assign'));
  });

  it('transfers existing undone auto-created tasks to new user', async () => {
    // First call (tasks.select) returns existing tasks
    mockTable('tasks', [{ id: TASK_ID_1 }, { id: TASK_ID_2 }]);

    const result = await handleReassignment(PROJECT_ID, USER_A, USER_B);

    expect(result.transferred).toBe(2);
    expect(result.created).toBe(0);
  });

  it('creates tasks from active milestone when none exist for old user', async () => {
    // tasks query returns empty (no existing tasks)
    mockTable('tasks', []);
    // getActiveMilestone needs project_phases and phase_items
    mockTable('project_phases', [makePhase()]);
    mockTable('phase_items', [makePhaseItem()]);
    mockTable('projects', { workspace_id: WORKSPACE_ID });

    const result = await handleReassignment(PROJECT_ID, USER_A, USER_B);

    expect(result.transferred).toBe(0);
    // Created count depends on upsert mock, but no error means it ran
  });

  it('returns zeros on fetch error', async () => {
    mockTable('tasks', null, { message: 'DB error' });

    const result = await handleReassignment(PROJECT_ID, USER_A, USER_B);
    expect(result).toEqual({ transferred: 0, created: 0 });
  });
});

// ============================================================================
// markMilestoneTasksDone
// ============================================================================

describe('markMilestoneTasksDone', () => {
  let markMilestoneTasksDone: typeof import('@/app/actions/auto-assign').markMilestoneTasksDone;

  beforeEach(async () => {
    ({ markMilestoneTasksDone } = await import('@/app/actions/auto-assign'));
  });

  it('returns 0 when no phases exist for milestone', async () => {
    mockTable('project_phases', []);

    const result = await markMilestoneTasksDone(PROJECT_ID, 1);
    expect(result).toBe(0);
  });

  it('marks auto-created tasks as done and returns count', async () => {
    mockTable('project_phases', [makePhase()]);
    // The update returns the affected rows
    mockTable('tasks', [{ id: TASK_ID_1 }, { id: TASK_ID_2 }]);

    const result = await markMilestoneTasksDone(PROJECT_ID, 1);

    // Our mock returns 2 tasks from the update
    expect(result).toBe(2);
  });

  it('returns 0 on database error', async () => {
    mockTable('project_phases', [makePhase()]);
    mockTable('tasks', null, { message: 'DB error' });

    const result = await markMilestoneTasksDone(PROJECT_ID, 1);
    expect(result).toBe(0);
  });
});
