export {};

/**
 * Tests for app/actions/phases.ts
 * Covers: getProjectPhases, createProjectPhase, deleteProjectPhase,
 *         updateProjectPhase, completePhase, checkPhaseProgress,
 *         unlockPhase, getPhaseProgressStats, calculateProjectProgress
 */

// ---- Constants (valid RFC 4122 UUIDs) ----
const PROJECT_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const PHASE_ID = '02d60c07-f159-457e-a809-03c2aa5ba784';
const USER_ID = '4fcff947-9839-4b1a-9962-f9528d4c084b';
const WORKSPACE_ID = 'c8ec2ea1-325e-4ea9-9334-4590e88845f9';

// ---- Module mocks ----

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/lib/gsd-templates', () => ({
  getTemplateForType: jest.fn().mockReturnValue({
    phases: [],
  }),
}));

jest.mock('@/lib/email', () => ({
  notifyClientOfPhaseMilestone: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/app/actions/shared', () => ({
  canAccessProject: jest.fn().mockResolvedValue(true),
  isUserAdmin: jest.fn().mockResolvedValue(true),
  isUserManagerOrAbove: jest.fn().mockResolvedValue(true),
  getCachedUserRole: jest.fn().mockResolvedValue('admin'),
  createActivity: jest.fn().mockResolvedValue(undefined),
}));

// ---- Mock setup ----

const mockSupabase = {
  from: jest.fn(),
  auth: { getUser: jest.fn() },
};

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
    'gt',
    'gte',
    'lte',
    'order',
    'limit',
    'single',
    'maybeSingle',
    'upsert',
    'or',
    'ilike',
    'filter',
  ];
  const chain: Record<string, jest.Mock> = Object.fromEntries(methods.map((m) => [m, jest.fn()]));
  const promised = Object.assign(Promise.resolve(resolvedData), chain);
  Object.values(chain).forEach((fn) => fn.mockReturnValue(promised));
  return chain;
}

function setupMockClient(data: unknown = null, error: unknown = null) {
  const chain = buildChain({ data, error });
  mockSupabase.from.mockReturnValue(chain);
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id: USER_ID, email: 'user@example.com' } },
    error: null,
  });
  const { createClient } = jest.requireMock('@/lib/supabase/server');
  (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  return chain;
}

function setUnauthenticated() {
  mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
  const { createClient } = jest.requireMock('@/lib/supabase/server');
  (createClient as jest.Mock).mockResolvedValue(mockSupabase);
}

function createMockPhase(overrides: Record<string, unknown> = {}) {
  return {
    id: PHASE_ID,
    project_id: PROJECT_ID,
    workspace_id: WORKSPACE_ID,
    name: 'Test Phase',
    description: null,
    status: 'not_started',
    sort_order: 0,
    is_locked: false,
    auto_progress: false,
    completed_at: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

// ---- Tests ----

describe('phase actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase.from.mockReset();
    mockSupabase.auth.getUser.mockReset();
    const { canAccessProject, isUserManagerOrAbove, isUserAdmin, getCachedUserRole } =
      jest.requireMock('@/app/actions/shared');
    (canAccessProject as jest.Mock).mockResolvedValue(true);
    (isUserManagerOrAbove as jest.Mock).mockResolvedValue(true);
    (isUserAdmin as jest.Mock).mockResolvedValue(true);
    (getCachedUserRole as jest.Mock).mockResolvedValue('admin');
  });

  // ============ getProjectPhases ============
  describe('getProjectPhases', () => {
    it('returns phases for a project', async () => {
      const { getProjectPhases } = await import('@/app/actions/phases');
      const phases = [createMockPhase(), createMockPhase({ id: WORKSPACE_ID, name: 'Phase 2' })];
      setupMockClient(phases, null);

      const result = await getProjectPhases(PROJECT_ID);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Test Phase');
    });

    it('returns empty array when no phases', async () => {
      const { getProjectPhases } = await import('@/app/actions/phases');
      setupMockClient([], null);

      const result = await getProjectPhases(PROJECT_ID);

      expect(result).toEqual([]);
    });

    it('returns empty array on error', async () => {
      const { getProjectPhases } = await import('@/app/actions/phases');
      setupMockClient(null, { message: 'DB error' });

      const result = await getProjectPhases(PROJECT_ID);

      expect(result).toEqual([]);
    });

    it('orders phases by sort_order ascending', async () => {
      const { getProjectPhases } = await import('@/app/actions/phases');
      const chain = setupMockClient([], null);

      await getProjectPhases(PROJECT_ID);

      expect(chain.order).toHaveBeenCalledWith('sort_order', { ascending: true });
    });
  });

  // ============ createProjectPhase ============
  describe('createProjectPhase', () => {
    /**
     * createProjectPhase hits three tables:
     *   1. projects (lookup workspace_id, terminal .single)
     *   2. project_phases (existing phases, terminal .limit — resolves to array)
     *   3. project_phases (insert → .select().single())
     * We route by table name and use a flag on the 2nd+ project_phases call to
     * distinguish the existing-phases query from the insert.
     */
    function setupCreatePhaseMocks(
      existingPhases: unknown[],
      insertResult: { data: unknown; error: unknown }
    ) {
      const projectChain = buildChain({ data: { workspace_id: WORKSPACE_ID }, error: null });
      projectChain.single.mockResolvedValue({ data: { workspace_id: WORKSPACE_ID }, error: null });

      let phasesCallCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'projects') return projectChain;
        if (table === 'project_phases') {
          phasesCallCount++;
          if (phasesCallCount === 1) {
            // First call: existing phases list (resolves to array via .limit terminal)
            return buildChain({ data: existingPhases, error: null });
          }
          // Second call: insert chain — terminal is .single()
          const insertChain = buildChain({ data: insertResult.data, error: insertResult.error });
          insertChain.single.mockResolvedValue(insertResult);
          return insertChain;
        }
        return buildChain({ data: null, error: null });
      });
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: USER_ID } },
        error: null,
      });
      const { createClient } = jest.requireMock('@/lib/supabase/server');
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    }

    it('creates phase with valid input', async () => {
      const { createProjectPhase } = await import('@/app/actions/phases');
      setupCreatePhaseMocks([], { data: createMockPhase(), error: null });

      const result = await createProjectPhase(PROJECT_ID, 'New Phase');

      expect(result.success).toBe(true);
    });

    it('returns error when not authenticated', async () => {
      const { createProjectPhase } = await import('@/app/actions/phases');
      setUnauthenticated();

      const result = await createProjectPhase(PROJECT_ID, 'New Phase');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not authenticated');
    });

    it('returns error when Supabase insert fails', async () => {
      const { createProjectPhase } = await import('@/app/actions/phases');
      setupCreatePhaseMocks([], { data: null, error: { message: 'Insert error' } });

      const result = await createProjectPhase(PROJECT_ID, 'New Phase');

      expect(result.success).toBe(false);
    });

    it('uses sort_order 0 when no existing phases', async () => {
      const { createProjectPhase } = await import('@/app/actions/phases');
      const newPhase = createMockPhase({ sort_order: 0 });
      setupCreatePhaseMocks([], { data: newPhase, error: null });

      const result = await createProjectPhase(PROJECT_ID, 'First Phase');

      expect(result.success).toBe(true);
    });

    // Note: phases.ts does not call revalidatePath (removed project-wide for SWR).
  });

  // ============ deleteProjectPhase ============
  describe('deleteProjectPhase', () => {
    it('deletes phase successfully', async () => {
      const { deleteProjectPhase } = await import('@/app/actions/phases');
      setupMockClient([{ id: PHASE_ID }], null);

      const result = await deleteProjectPhase(PHASE_ID, PROJECT_ID);

      expect(result.success).toBe(true);
    });

    it('returns error when not authenticated', async () => {
      const { deleteProjectPhase } = await import('@/app/actions/phases');
      setUnauthenticated();

      const result = await deleteProjectPhase(PHASE_ID, PROJECT_ID);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not authenticated');
    });

    it('returns error when Supabase delete fails', async () => {
      const { deleteProjectPhase } = await import('@/app/actions/phases');
      setupMockClient(null, { message: 'Delete error' });

      const result = await deleteProjectPhase(PHASE_ID, PROJECT_ID);

      expect(result.success).toBe(false);
    });

    it('returns permission error when RLS filters out the row', async () => {
      const { deleteProjectPhase } = await import('@/app/actions/phases');
      setupMockClient([], null);

      const result = await deleteProjectPhase(PHASE_ID, PROJECT_ID);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/permission/i);
    });

    // revalidatePath removed project-wide for SWR cache invalidation.
  });

  // ============ updateProjectPhase ============
  describe('updateProjectPhase', () => {
    it('updates phase name', async () => {
      const { updateProjectPhase } = await import('@/app/actions/phases');
      setupMockClient(null, null);

      const result = await updateProjectPhase(PHASE_ID, 'Updated Name', PROJECT_ID);

      expect(result.success).toBe(true);
    });

    it('returns error when not authenticated', async () => {
      const { updateProjectPhase } = await import('@/app/actions/phases');
      setUnauthenticated();

      const result = await updateProjectPhase(PHASE_ID, 'Updated Name', PROJECT_ID);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not authenticated');
    });

    it('returns error when Supabase update fails', async () => {
      const { updateProjectPhase } = await import('@/app/actions/phases');
      setupMockClient(null, { message: 'Update error' });

      const result = await updateProjectPhase(PHASE_ID, 'Updated Name', PROJECT_ID);

      expect(result.success).toBe(false);
    });
  });

  // ============ unlockPhase ============
  describe('unlockPhase', () => {
    it('unlocks phase successfully', async () => {
      const { unlockPhase } = await import('@/app/actions/phases');
      const chain = setupMockClient(null, null);
      chain.single.mockResolvedValue({ data: { project_id: PROJECT_ID }, error: null });

      const result = await unlockPhase(PHASE_ID);

      expect(result.success).toBe(true);
    });

    it('returns error when not authenticated', async () => {
      const { unlockPhase } = await import('@/app/actions/phases');
      setUnauthenticated();

      const result = await unlockPhase(PHASE_ID);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not authenticated');
    });

    it('returns error when phase not found', async () => {
      const { unlockPhase } = await import('@/app/actions/phases');
      const chain = setupMockClient(null, null);
      chain.single.mockResolvedValue({ data: null, error: { message: 'Not found' } });

      const result = await unlockPhase(PHASE_ID);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('returns error when Supabase update fails', async () => {
      const { unlockPhase } = await import('@/app/actions/phases');
      const chain = setupMockClient(null, { message: 'Update error' });
      chain.single.mockResolvedValueOnce({ data: { project_id: PROJECT_ID }, error: null });

      const result = await unlockPhase(PHASE_ID);

      expect(result.success).toBe(false);
    });
  });

  // ============ checkPhaseProgress ============
  describe('checkPhaseProgress', () => {
    it('returns false for autoCompleted when phase is already completed', async () => {
      const { checkPhaseProgress } = await import('@/app/actions/phases');
      const chain = setupMockClient(null, null);
      chain.single.mockResolvedValue({
        data: { id: PHASE_ID, project_id: PROJECT_ID, auto_progress: true, status: 'completed' },
        error: null,
      });

      const result = await checkPhaseProgress(PHASE_ID);

      expect(result.success).toBe(true);
      expect(result.autoCompleted).toBe(false);
    });

    it('returns false for autoCompleted when auto_progress is disabled', async () => {
      const { checkPhaseProgress } = await import('@/app/actions/phases');
      const chain = setupMockClient(null, null);
      chain.single.mockResolvedValue({
        data: { id: PHASE_ID, project_id: PROJECT_ID, auto_progress: false, status: 'in_progress' },
        error: null,
      });

      const result = await checkPhaseProgress(PHASE_ID);

      expect(result.success).toBe(true);
      expect(result.autoCompleted).toBe(false);
    });

    it('returns error when phase not found', async () => {
      const { checkPhaseProgress } = await import('@/app/actions/phases');
      const chain = setupMockClient(null, null);
      chain.single.mockResolvedValue({ data: null, error: { message: 'Not found' } });

      const result = await checkPhaseProgress(PHASE_ID);

      expect(result.success).toBe(false);
    });
  });

  // ============ calculateProjectProgress ============
  describe('calculateProjectProgress', () => {
    it('calculates progress as percentage of completed phases', async () => {
      const { calculateProjectProgress } = await import('@/app/actions/phases');
      const phases = [
        { status: 'completed' },
        { status: 'completed' },
        { status: 'in_progress' },
        { status: 'not_started' },
      ];
      setupMockClient(phases, null);

      const result = await calculateProjectProgress(PROJECT_ID);

      expect(result).toBe(50);
    });

    it('returns 0 when no phases', async () => {
      const { calculateProjectProgress } = await import('@/app/actions/phases');
      setupMockClient([], null);

      const result = await calculateProjectProgress(PROJECT_ID);

      expect(result).toBe(0);
    });

    it('returns 0 on error', async () => {
      const { calculateProjectProgress } = await import('@/app/actions/phases');
      setupMockClient(null, { message: 'DB error' });

      const result = await calculateProjectProgress(PROJECT_ID);

      expect(result).toBe(0);
    });

    it('returns 100 when all phases are completed', async () => {
      const { calculateProjectProgress } = await import('@/app/actions/phases');
      const phases = [{ status: 'completed' }, { status: 'done' }, { status: 'completed' }];
      setupMockClient(phases, null);

      const result = await calculateProjectProgress(PROJECT_ID);

      expect(result).toBe(100);
    });
  });

  // ============ getPhaseProgressStats ============
  describe('getPhaseProgressStats', () => {
    it('returns phase stats with progress percentages', async () => {
      const { getPhaseProgressStats } = await import('@/app/actions/phases');
      const phases = [
        {
          ...createMockPhase(),
          phase_items: [
            { id: 'item-1', status: 'Done' },
            { id: 'item-2', status: 'Todo' },
          ],
        },
      ];
      setupMockClient(phases, null);

      const result = await getPhaseProgressStats(PROJECT_ID);

      expect(result).toHaveLength(1);
      expect(result[0].progress.total).toBe(2);
      expect(result[0].progress.completed).toBe(1);
      expect(result[0].progress.percentage).toBe(50);
    });

    it('returns empty array on error', async () => {
      const { getPhaseProgressStats } = await import('@/app/actions/phases');
      setupMockClient(null, { message: 'DB error' });

      const result = await getPhaseProgressStats(PROJECT_ID);

      expect(result).toEqual([]);
    });

    it('handles phases with no items (0% progress)', async () => {
      const { getPhaseProgressStats } = await import('@/app/actions/phases');
      const phases = [{ ...createMockPhase(), phase_items: [] }];
      setupMockClient(phases, null);

      const result = await getPhaseProgressStats(PROJECT_ID);

      expect(result[0].progress.percentage).toBe(0);
    });
  });
});
