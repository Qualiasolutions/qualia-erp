/**
 * Tests for the milestone cascade logic in the GitHub webhook handler.
 *
 * The cascade flow:
 * 1. Webhook detects phase(s) completed via VERIFICATION.md files
 * 2. Checks if ALL phases in the milestone are now completed
 * 3. If yes: markMilestoneTasksDone → find assignees → createTasksFromMilestone → notify
 *
 * These tests verify the auto-assign engine functions work correctly when
 * called with an external Supabase client (as the webhook does).
 */

export {};

// ---- Constants ----
const PROJECT_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const PHASE_ID_1 = '02d60c07-f159-457e-a809-03c2aa5ba784';
const PHASE_ID_2 = '12d60c07-f159-457e-a809-03c2aa5ba785';
const PHASE_ID_3 = '22d60c07-f159-457e-a809-03c2aa5ba800';
const ITEM_ID_1 = '22d60c07-f159-457e-a809-03c2aa5ba786';
const ITEM_ID_2 = '32d60c07-f159-457e-a809-03c2aa5ba787';
const TASK_ID_1 = '52d60c07-f159-457e-a809-03c2aa5ba789';
const TASK_ID_2 = '62d60c07-f159-457e-a809-03c2aa5ba790';
const USER_A = '4fcff947-9839-4b1a-9962-f9528d4c084b';
const WORKSPACE_ID = 'c8ec2ea1-325e-4ea9-9334-4590e88845f9';

// ---- Module mocks ----

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

// ---- Mock setup ----

type ChainMethods = Record<string, jest.Mock>;

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

let tableChains: Record<string, ChainMethods> = {};

const mockSupabase = {
  from: jest.fn((table: string) => {
    const chain = tableChains[table] || buildChain();
    return chain;
  }),
  auth: { getUser: jest.fn() },
};

function mockTable(table: string, data: unknown, error: unknown = null) {
  tableChains[table] = buildChain({ data, error });
  return tableChains[table];
}

beforeEach(() => {
  jest.clearAllMocks();
  tableChains = {};
});

// ---- Helpers ----

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
// Engine functions accept external Supabase client
// ============================================================================

describe('auto-assign with external Supabase client', () => {
  let getActiveMilestone: typeof import('@/app/actions/auto-assign').getActiveMilestone;
  let createTasksFromMilestone: typeof import('@/app/actions/auto-assign').createTasksFromMilestone;
  let markMilestoneTasksDone: typeof import('@/app/actions/auto-assign').markMilestoneTasksDone;

  beforeEach(async () => {
    ({ getActiveMilestone, createTasksFromMilestone, markMilestoneTasksDone } =
      await import('@/app/actions/auto-assign'));
  });

  describe('getActiveMilestone with external client', () => {
    it('uses the provided client instead of creating one from cookies', async () => {
      mockTable('project_phases', [
        makePhase({ milestone_number: 1, status: 'completed' }),
        makePhase({ id: PHASE_ID_2, milestone_number: 2, status: 'in_progress' }),
      ]);
      mockTable('phase_items', [makePhaseItem({ phase_id: PHASE_ID_2 })]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await getActiveMilestone(PROJECT_ID, mockSupabase as any);

      expect(result).not.toBeNull();
      expect(result!.milestoneNumber).toBe(2);
      // Verify it used our mock client (from() was called)
      expect(mockSupabase.from).toHaveBeenCalledWith('project_phases');
    });
  });

  describe('markMilestoneTasksDone with external client', () => {
    it('marks tasks done using the provided client', async () => {
      // Milestone-level completion now keys on source_milestone_key and
      // updates the tasks table directly — no project_phases lookup needed.
      mockTable('tasks', [{ id: TASK_ID_1 }, { id: TASK_ID_2 }]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await markMilestoneTasksDone(PROJECT_ID, 1, mockSupabase as any);

      expect(result).toBe(2);
      expect(mockSupabase.from).toHaveBeenCalledWith('tasks');
    });

    it('is idempotent — already-done tasks are not affected', async () => {
      // No tasks to update (all already done or none exist)
      mockTable('tasks', []);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await markMilestoneTasksDone(PROJECT_ID, 1, mockSupabase as any);

      expect(result).toBe(0);
    });
  });

  describe('createTasksFromMilestone with external client (milestone_cascade trigger)', () => {
    it('creates tasks with milestone_cascade trigger', async () => {
      const items = [
        makePhaseItem({ id: ITEM_ID_1 }),
        makePhaseItem({ id: ITEM_ID_2, title: 'Write tests', display_order: 1 }),
      ];

      mockTable('projects', { workspace_id: WORKSPACE_ID });
      mockTable('project_phases', [makePhase()]);
      mockTable('phase_items', items);
      mockTable('tasks', []);

      const result = await createTasksFromMilestone(
        PROJECT_ID,
        1,
        USER_A,
        'milestone_cascade',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockSupabase as any
      );

      expect(result.total).toBe(2);
      expect(mockSupabase.from).toHaveBeenCalledWith('tasks');
    });

    it('is idempotent — does not create duplicates when all items have tasks', async () => {
      const items = [makePhaseItem({ id: ITEM_ID_1 })];

      mockTable('projects', { workspace_id: WORKSPACE_ID });
      mockTable('project_phases', [makePhase()]);
      mockTable('phase_items', items);
      // Existing task already covers this item
      mockTable('tasks', [{ source_phase_item_id: ITEM_ID_1 }]);

      const result = await createTasksFromMilestone(
        PROJECT_ID,
        1,
        USER_A,
        'milestone_cascade',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockSupabase as any
      );

      expect(result.total).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.created).toBe(0);
    });
  });
});

// ============================================================================
// Milestone completion detection logic
// ============================================================================

describe('milestone completion detection', () => {
  it('all phases completed = milestone is complete', () => {
    const phases = [
      { id: PHASE_ID_1, status: 'completed' },
      { id: PHASE_ID_2, status: 'completed' },
      { id: PHASE_ID_3, status: 'completed' },
    ];

    const allCompleted = phases.every((p) => p.status === 'completed');
    expect(allCompleted).toBe(true);
  });

  it('partial completion = milestone is NOT complete', () => {
    const phases = [
      { id: PHASE_ID_1, status: 'completed' },
      { id: PHASE_ID_2, status: 'in_progress' },
      { id: PHASE_ID_3, status: 'completed' },
    ];

    const allCompleted = phases.every((p) => p.status === 'completed');
    expect(allCompleted).toBe(false);
  });

  it('single phase milestone — one completion triggers cascade', () => {
    const phases = [{ id: PHASE_ID_1, status: 'completed' }];

    const allCompleted = phases.every((p) => p.status === 'completed');
    expect(allCompleted).toBe(true);
  });

  it('no phases for milestone = no cascade', () => {
    const phases: { id: string; status: string }[] = [];

    // Empty array — every() returns true, but we check length first
    const shouldCascade = phases.length > 0 && phases.every((p) => p.status === 'completed');
    expect(shouldCascade).toBe(false);
  });
});
