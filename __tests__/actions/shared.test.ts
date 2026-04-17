export {};

/**
 * Tests for app/actions/shared.ts
 * Covers: isUserAdmin, isUserManagerOrAbove, getUserRole, canDeleteProject,
 *         canDeleteMeeting, canModifyTask, canAccessProject, canDeleteProjectFile
 */

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}));

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

const mockSupabase = {
  from: jest.fn(),
  auth: { getUser: jest.fn() },
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

// ---- Setup helpers ----

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

function setupSupabaseMock(data: unknown, error: unknown = null) {
  const chain = buildChain({ data, error });
  mockSupabase.from.mockReturnValue(chain);
  return chain;
}

/**
 * Route Supabase `.from(table)` calls to the right chain by table name.
 * Resilient to Promise.all ordering — use this instead of mockReturnValueOnce sequences
 * in tests for parallelized helpers (canAccessProject, canModifyTask, etc.).
 */
function setupSupabaseMockByTable(tableMap: Record<string, { data: unknown; error?: unknown }>) {
  const chains: Record<string, ReturnType<typeof buildChain>> = {};
  for (const [table, resolved] of Object.entries(tableMap)) {
    chains[table] = buildChain({ data: resolved.data, error: resolved.error ?? null });
  }
  mockSupabase.from.mockImplementation((table: string) => {
    return chains[table] ?? buildChain({ data: null, error: null });
  });
  return chains;
}

// ---- Tests ----

describe('shared action helpers', () => {
  let createClient: jest.Mock;
  let isUserAdmin: (userId: string) => Promise<boolean>;
  let isUserManagerOrAbove: (userId: string) => Promise<boolean>;
  let getUserRole: (userId: string) => Promise<string | null>;
  let canDeleteProject: (userId: string, projectId: string) => Promise<boolean>;
  let canModifyTask: (userId: string, taskId: string) => Promise<boolean>;
  let canAccessProject: (userId: string, projectId: string) => Promise<boolean>;
  let canDeleteProjectFile: (userId: string, fileId: string) => Promise<boolean>;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    // Re-require after resetModules to pick up fresh cache() mock
    createClient = jest.fn().mockResolvedValue(mockSupabase);
    jest.doMock('@/lib/supabase/server', () => ({ createClient }));
    jest.doMock('react', () => ({
      ...jest.requireActual('react'),
      cache: (fn: (...args: unknown[]) => unknown) => fn,
    }));

    const shared = jest.requireActual('@/app/actions/shared') as {
      isUserAdmin: typeof isUserAdmin;
      isUserManagerOrAbove: typeof isUserManagerOrAbove;
      getUserRole: typeof getUserRole;
      canDeleteProject: typeof canDeleteProject;
      canModifyTask: typeof canModifyTask;
      canAccessProject: typeof canAccessProject;
      canDeleteProjectFile: typeof canDeleteProjectFile;
    };

    isUserAdmin = shared.isUserAdmin;
    isUserManagerOrAbove = shared.isUserManagerOrAbove;
    getUserRole = shared.getUserRole;
    canDeleteProject = shared.canDeleteProject;
    canModifyTask = shared.canModifyTask;
    canAccessProject = shared.canAccessProject;
    canDeleteProjectFile = shared.canDeleteProjectFile;
  });

  describe('isUserAdmin', () => {
    it('returns true for admin role', async () => {
      setupSupabaseMock({ role: 'admin' });
      const result = await isUserAdmin('user-1');
      expect(result).toBe(true);
    });

    it('returns false for employee role', async () => {
      setupSupabaseMock({ role: 'employee' });
      const result = await isUserAdmin('user-1');
      expect(result).toBe(false);
    });

    it('returns false when user not found (null data)', async () => {
      setupSupabaseMock(null);
      const result = await isUserAdmin('user-1');
      expect(result).toBe(false);
    });

    it('returns false when DB error', async () => {
      setupSupabaseMock(null, { message: 'DB error' });
      const result = await isUserAdmin('user-1');
      expect(result).toBe(false);
    });
  });

  describe('isUserManagerOrAbove', () => {
    it('returns true for admin role', async () => {
      setupSupabaseMock({ role: 'admin' });
      const result = await isUserManagerOrAbove('user-1');
      expect(result).toBe(true);
    });

    it('returns true for manager role', async () => {
      setupSupabaseMock({ role: 'manager' });
      const result = await isUserManagerOrAbove('user-1');
      expect(result).toBe(true);
    });

    it('returns false for employee role', async () => {
      setupSupabaseMock({ role: 'employee' });
      const result = await isUserManagerOrAbove('user-1');
      expect(result).toBe(false);
    });
  });

  describe('getUserRole', () => {
    it('returns the role string for a found user', async () => {
      setupSupabaseMock({ role: 'admin' });
      const result = await getUserRole('user-1');
      expect(result).toBe('admin');
    });

    it('returns null when user not found', async () => {
      setupSupabaseMock(null);
      const result = await getUserRole('user-1');
      expect(result).toBeNull();
    });
  });

  describe('canDeleteProject', () => {
    it('returns true when user is admin (skips project lookup)', async () => {
      // First call: role lookup -> admin
      setupSupabaseMock({ role: 'admin' });
      const result = await canDeleteProject('admin-user', 'project-1');
      expect(result).toBe(true);
    });

    it('returns true when user is the project lead', async () => {
      const chain = buildChain({ data: { role: 'employee' }, error: null });
      mockSupabase.from.mockReturnValueOnce(chain);

      // Second call: project lookup
      const chain2 = buildChain({ data: { lead_id: 'user-1' }, error: null });
      mockSupabase.from.mockReturnValue(chain2);

      const result = await canDeleteProject('user-1', 'project-1');
      expect(result).toBe(true);
    });

    it('returns false when user is not the project lead', async () => {
      const chain = buildChain({ data: { role: 'employee' }, error: null });
      mockSupabase.from.mockReturnValueOnce(chain);

      const chain2 = buildChain({ data: { lead_id: 'other-user' }, error: null });
      mockSupabase.from.mockReturnValue(chain2);

      const result = await canDeleteProject('user-1', 'project-1');
      expect(result).toBe(false);
    });
  });

  describe('canModifyTask', () => {
    it('returns true when user is admin', async () => {
      setupSupabaseMock({ role: 'admin' });
      const result = await canModifyTask('admin-user', 'task-1');
      expect(result).toBe(true);
    });

    it('returns true when user is the creator', async () => {
      setupSupabaseMockByTable({
        profiles: { data: { role: 'employee' } },
        tasks: { data: { creator_id: 'user-1', assignee_id: null, project: null } },
      });

      const result = await canModifyTask('user-1', 'task-1');
      expect(result).toBe(true);
    });

    it('returns true when user is the assignee', async () => {
      setupSupabaseMockByTable({
        profiles: { data: { role: 'employee' } },
        tasks: { data: { creator_id: 'other-user', assignee_id: 'user-1', project: null } },
      });

      const result = await canModifyTask('user-1', 'task-1');
      expect(result).toBe(true);
    });

    it('returns false when task not found', async () => {
      setupSupabaseMockByTable({
        profiles: { data: { role: 'employee' } },
        tasks: { data: null },
      });

      const result = await canModifyTask('user-1', 'task-1');
      expect(result).toBe(false);
    });

    it('returns false when user is unrelated', async () => {
      setupSupabaseMockByTable({
        profiles: { data: { role: 'employee' } },
        tasks: { data: { creator_id: 'creator', assignee_id: 'assignee', project: null } },
      });

      const result = await canModifyTask('unrelated-user', 'task-1');
      expect(result).toBe(false);
    });
  });

  describe('canAccessProject', () => {
    it('returns true when user is admin', async () => {
      setupSupabaseMock({ role: 'admin' });
      const result = await canAccessProject('admin-user', 'project-1');
      expect(result).toBe(true);
    });

    it('returns false when project workspace not found', async () => {
      setupSupabaseMockByTable({
        profiles: { data: { role: 'employee' } },
        projects: { data: null },
      });

      const result = await canAccessProject('user-1', 'project-1');
      expect(result).toBe(false);
    });

    it('returns true when user is workspace member', async () => {
      setupSupabaseMockByTable({
        profiles: { data: { role: 'employee' } },
        projects: { data: { workspace_id: 'ws-1' } },
        workspace_members: { data: { id: 'membership-1' } },
      });

      const result = await canAccessProject('user-1', 'project-1');
      expect(result).toBe(true);
    });

    it('returns false when user is not a workspace member', async () => {
      setupSupabaseMockByTable({
        profiles: { data: { role: 'employee' } },
        projects: { data: { workspace_id: 'ws-1' } },
        workspace_members: { data: null },
      });

      const result = await canAccessProject('user-1', 'project-1');
      expect(result).toBe(false);
    });
  });

  describe('canDeleteProjectFile', () => {
    it('returns true when user is admin', async () => {
      setupSupabaseMock({ role: 'admin' });
      const result = await canDeleteProjectFile('admin-user', 'file-1');
      expect(result).toBe(true);
    });

    it('returns false when file not found', async () => {
      const roleChain = buildChain({ data: { role: 'employee' }, error: null });
      mockSupabase.from.mockReturnValueOnce(roleChain);

      const fileChain = buildChain({ data: null, error: null });
      mockSupabase.from.mockReturnValue(fileChain);

      const result = await canDeleteProjectFile('user-1', 'file-1');
      expect(result).toBe(false);
    });

    it('returns true when user is the uploader', async () => {
      const roleChain = buildChain({ data: { role: 'employee' }, error: null });
      mockSupabase.from.mockReturnValueOnce(roleChain);

      const fileChain = buildChain({
        data: { uploaded_by: 'user-1', project: null },
        error: null,
      });
      mockSupabase.from.mockReturnValue(fileChain);

      const result = await canDeleteProjectFile('user-1', 'file-1');
      expect(result).toBe(true);
    });

    it('returns false when user is unrelated', async () => {
      const roleChain = buildChain({ data: { role: 'employee' }, error: null });
      mockSupabase.from.mockReturnValueOnce(roleChain);

      const fileChain = buildChain({
        data: { uploaded_by: 'other-user', project: { lead_id: 'other-lead' } },
        error: null,
      });
      mockSupabase.from.mockReturnValue(fileChain);

      const result = await canDeleteProjectFile('user-1', 'file-1');
      expect(result).toBe(false);
    });
  });
});
