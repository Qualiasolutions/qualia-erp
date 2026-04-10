export {};

/**
 * Tests for app/actions/projects.ts
 * Covers: createProject, getProjects, getProjectStats, getProjectById,
 *         updateProject, deleteProject, updateProjectStatus
 */

// ---- Constants (valid RFC 4122 UUIDs) ----
const WORKSPACE_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const USER_ID = '02d60c07-f159-457e-a809-03c2aa5ba784';
const PROJECT_ID = '4fcff947-9839-4b1a-9962-f9528d4c084b';
const TEAM_ID = 'c8ec2ea1-325e-4ea9-9334-4590e88845f9';
// CLIENT_ID available for future tests
// const CLIENT_ID = 'f1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c';

// ---- Module mocks ----

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/app/actions/workspace', () => ({
  getCurrentWorkspaceId: jest.fn(),
}));

jest.mock('@/app/actions/shared', () => ({
  createActivity: jest.fn().mockResolvedValue(undefined),
  canDeleteProject: jest.fn(),
  isUserAdmin: jest.fn(),
}));

jest.mock('@/lib/email', () => ({
  notifyProjectCreated: jest.fn().mockResolvedValue(undefined),
  notifyClientOfProjectStatusChange: jest.fn().mockResolvedValue(undefined),
}));

// ---- Mock setup ----

const mockSupabase = {
  from: jest.fn(),
  auth: { getUser: jest.fn() },
  rpc: jest.fn().mockResolvedValue({ data: [], error: null }),
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
    'filter',
    'range',
  ];
  const chain: Record<string, jest.Mock> = Object.fromEntries(methods.map((m) => [m, jest.fn()]));
  const promised = Object.assign(Promise.resolve(resolvedData), chain);
  Object.values(chain).forEach((fn) => fn.mockReturnValue(promised));
  return chain;
}

function setupMockClient(data: unknown = null, error: unknown = null) {
  const chain = buildChain({ data, error });
  mockSupabase.from.mockReturnValue(chain);
  mockSupabase.rpc.mockResolvedValue({ data: [], error: null });
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id: USER_ID, email: 'admin@example.com' } },
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

function createMockProject(overrides: Record<string, unknown> = {}) {
  return {
    id: PROJECT_ID,
    name: 'Test Project',
    description: 'A test project',
    status: 'Active',
    project_type: 'web_design',
    project_group: 'active',
    deployment_platform: 'vercel',
    workspace_id: WORKSPACE_ID,
    team_id: TEAM_ID,
    lead_id: USER_ID,
    client_id: null,
    target_date: null,
    sort_order: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

// ---- Tests ----

describe('project actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { canDeleteProject, isUserAdmin } = jest.requireMock('@/app/actions/shared');
    (canDeleteProject as jest.Mock).mockResolvedValue(true);
    (isUserAdmin as jest.Mock).mockResolvedValue(true);
    const { createActivity } = jest.requireMock('@/app/actions/shared');
    (createActivity as jest.Mock).mockResolvedValue(undefined);
    const { notifyProjectCreated } = jest.requireMock('@/lib/email');
    (notifyProjectCreated as jest.Mock).mockResolvedValue(undefined);

    // Mock workspace lookup in projects.ts (it imports from './workspace')
    jest.doMock('@/app/actions/workspace', () => ({
      getCurrentWorkspaceId: jest.fn().mockResolvedValue(WORKSPACE_ID),
    }));
  });

  // ============ createProject ============
  describe('createProject', () => {
    it('creates project with valid input', async () => {
      const { createProject } = await import('@/app/actions/projects');
      const project = createMockProject();
      setupMockClient(project, null);

      const formData = new FormData();
      formData.set('name', 'Test Project');
      formData.set('status', 'Active');
      formData.set('team_id', TEAM_ID);
      formData.set('workspace_id', WORKSPACE_ID);
      formData.set('project_group', 'active');

      const result = await createProject(formData);

      expect(result.success).toBe(true);
    });

    it('returns error when not authenticated', async () => {
      const { createProject } = await import('@/app/actions/projects');
      setUnauthenticated();

      const formData = new FormData();
      formData.set('name', 'Test Project');
      formData.set('team_id', TEAM_ID);

      const result = await createProject(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not authenticated');
    });

    it('returns error when team_id missing', async () => {
      const { createProject } = await import('@/app/actions/projects');
      setupMockClient(null, null);

      const formData = new FormData();
      formData.set('name', 'Test Project');
      formData.set('workspace_id', WORKSPACE_ID);
      formData.set('project_group', 'active');
      formData.set('status', 'Active');
      // No team_id

      const result = await createProject(formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Team');
    });

    it('returns error when Supabase insert fails', async () => {
      const { createProject } = await import('@/app/actions/projects');
      setupMockClient(null, { message: 'Insert error' });

      const formData = new FormData();
      formData.set('name', 'Test Project');
      formData.set('team_id', TEAM_ID);
      formData.set('workspace_id', WORKSPACE_ID);
      formData.set('project_group', 'active');
      formData.set('status', 'Active');

      const result = await createProject(formData);

      expect(result.success).toBe(false);
    });

    it('calls revalidatePath after successful create', async () => {
      const { createProject } = await import('@/app/actions/projects');
      const { revalidatePath } = jest.requireMock('next/cache');
      setupMockClient(createMockProject(), null);

      const formData = new FormData();
      formData.set('name', 'Test Project');
      formData.set('team_id', TEAM_ID);
      formData.set('workspace_id', WORKSPACE_ID);
      formData.set('project_group', 'active');
      formData.set('status', 'Active');

      await createProject(formData);

      expect(revalidatePath).toHaveBeenCalledWith('/projects');
    });
  });

  // ============ getProjects ============
  describe('getProjects', () => {
    it('returns projects for workspace', async () => {
      const { getProjects } = await import('@/app/actions/projects');
      const projects = [{ id: PROJECT_ID, name: 'Test Project' }];
      const chain = setupMockClient(projects, null);

      // Admin profile check
      chain.single.mockResolvedValue({ data: { role: 'admin' }, error: null });

      const result = await getProjects(WORKSPACE_ID);

      expect(Array.isArray(result)).toBe(true);
    });

    it('filters to assigned projects for non-admin users', async () => {
      const { getProjects } = await import('@/app/actions/projects');
      const projects = [
        { id: PROJECT_ID, name: 'Project 1' },
        { id: TEAM_ID, name: 'Project 2' },
      ];

      // projects query chain (first from())
      const projectsChain = buildChain({ data: projects, error: null });
      // profiles query (second from() - non-admin profile)
      const profileChain = buildChain({ data: { role: 'employee' }, error: null });
      profileChain.single.mockResolvedValue({ data: { role: 'employee' }, error: null });
      // assignments query (third from() - only assigned to PROJECT_ID)
      const assignmentsChain = buildChain({
        data: [{ project_id: PROJECT_ID }],
        error: null,
      });

      mockSupabase.from
        .mockReturnValueOnce(projectsChain)
        .mockReturnValueOnce(profileChain)
        .mockReturnValueOnce(assignmentsChain);

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: USER_ID } },
        error: null,
      });
      const { createClient } = jest.requireMock('@/lib/supabase/server');
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const result = await getProjects(WORKSPACE_ID);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(PROJECT_ID);
    });

    it('returns empty array on error', async () => {
      const { getProjects } = await import('@/app/actions/projects');
      setupMockClient(null, null);

      const result = await getProjects(WORKSPACE_ID);

      expect(Array.isArray(result)).toBe(true);
    });
  });

  // ============ getProjectById ============
  describe('getProjectById', () => {
    function setupProjectByIdMock(projectData: unknown, error: unknown = null) {
      const projectChain = buildChain({ data: projectData, error });
      projectChain.single.mockResolvedValue({ data: projectData, error });
      // issues query returns array (stats computed from same result — no second query)
      const issuesChain = buildChain({ data: [], error: null });

      mockSupabase.from
        .mockReturnValueOnce(projectChain) // projects query
        .mockReturnValueOnce(issuesChain); // issues list query

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: USER_ID } },
        error: null,
      });
      const { createClient } = jest.requireMock('@/lib/supabase/server');
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);
      return projectChain;
    }

    it('returns project with relations', async () => {
      const { getProjectById } = await import('@/app/actions/projects');
      const project = {
        ...createMockProject(),
        lead: [{ id: USER_ID, full_name: 'Lead', email: null, avatar_url: null }],
        team: [{ id: TEAM_ID, name: 'Team', key: 'TST' }],
        client: null,
      };
      setupProjectByIdMock(project);

      const result = await getProjectById(PROJECT_ID);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(PROJECT_ID);
    });

    it('returns null on error', async () => {
      const { getProjectById } = await import('@/app/actions/projects');
      const errorChain = buildChain({ data: null, error: { message: 'Not found' } });
      errorChain.single.mockResolvedValue({ data: null, error: { message: 'Not found' } });
      mockSupabase.from.mockReturnValue(errorChain);
      const { createClient } = jest.requireMock('@/lib/supabase/server');
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const result = await getProjectById(PROJECT_ID);

      expect(result).toBeNull();
    });

    it('normalizes array FK responses for lead/team/client', async () => {
      const { getProjectById } = await import('@/app/actions/projects');
      const project = {
        ...createMockProject(),
        lead: [{ id: USER_ID, full_name: 'Lead', email: null, avatar_url: null }],
        team: [{ id: TEAM_ID, name: 'Team', key: 'TST' }],
        client: null,
      };
      setupProjectByIdMock(project);

      const result = await getProjectById(PROJECT_ID);

      // Lead should be object, not array
      expect(Array.isArray(result?.lead)).toBe(false);
    });
  });

  // ============ updateProject ============
  describe('updateProject', () => {
    it('updates project with valid input', async () => {
      const { updateProject } = await import('@/app/actions/projects');
      const updatedProject = createMockProject({ name: 'Updated Project' });
      const chain = setupMockClient(updatedProject, null);
      chain.single.mockResolvedValue({ data: updatedProject, error: null });

      const formData = new FormData();
      formData.set('id', PROJECT_ID);
      formData.set('name', 'Updated Project');

      const result = await updateProject(formData);

      expect(result.success).toBe(true);
    });

    it('returns error when not authenticated', async () => {
      const { updateProject } = await import('@/app/actions/projects');
      setUnauthenticated();

      const formData = new FormData();
      formData.set('id', PROJECT_ID);
      formData.set('name', 'Updated Project');

      const result = await updateProject(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not authenticated');
    });

    it('returns error when project ID missing', async () => {
      const { updateProject } = await import('@/app/actions/projects');
      setupMockClient(null, null);

      const formData = new FormData();
      formData.set('name', 'Updated Project');
      // No id

      const result = await updateProject(formData);

      expect(result.success).toBe(false);
    });

    it('returns error when Supabase update fails', async () => {
      const { updateProject } = await import('@/app/actions/projects');
      const chain = setupMockClient(null, { message: 'Update failed' });
      chain.single.mockResolvedValue({ data: null, error: { message: 'Update failed' } });

      const formData = new FormData();
      formData.set('id', PROJECT_ID);
      formData.set('name', 'Test Project');

      const result = await updateProject(formData);

      expect(result.success).toBe(false);
    });

    it('returns error for invalid metadata JSON', async () => {
      const { updateProject } = await import('@/app/actions/projects');
      setupMockClient(null, null);

      const formData = new FormData();
      formData.set('id', PROJECT_ID);
      formData.set('metadata', 'not-valid-json');

      const result = await updateProject(formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('metadata');
    });
  });

  // ============ deleteProject ============
  describe('deleteProject', () => {
    it('deletes project when user has permission', async () => {
      const { deleteProject } = await import('@/app/actions/projects');
      setupMockClient(null, null);

      const result = await deleteProject(PROJECT_ID);

      expect(result.success).toBe(true);
    });

    it('returns error when not authenticated', async () => {
      const { deleteProject } = await import('@/app/actions/projects');
      setUnauthenticated();

      const result = await deleteProject(PROJECT_ID);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not authenticated');
    });

    it('returns error when user cannot delete project', async () => {
      const { deleteProject } = await import('@/app/actions/projects');
      setupMockClient(null, null);
      const { canDeleteProject } = jest.requireMock('@/app/actions/shared');
      (canDeleteProject as jest.Mock).mockResolvedValue(false);

      const result = await deleteProject(PROJECT_ID);

      expect(result.success).toBe(false);
      expect(result.error).toContain('permission');
    });

    it('returns error when Supabase delete fails', async () => {
      const { deleteProject } = await import('@/app/actions/projects');
      setupMockClient(null, { message: 'Delete error' });

      const result = await deleteProject(PROJECT_ID);

      expect(result.success).toBe(false);
    });

    it('calls revalidatePath after successful delete', async () => {
      const { deleteProject } = await import('@/app/actions/projects');
      const { revalidatePath } = jest.requireMock('next/cache');
      setupMockClient(null, null);

      await deleteProject(PROJECT_ID);

      expect(revalidatePath).toHaveBeenCalledWith('/projects');
    });
  });

  // ============ updateProjectStatus ============
  describe('updateProjectStatus', () => {
    it('updates project status', async () => {
      const { updateProjectStatus } = await import('@/app/actions/projects');
      const chain = setupMockClient(null, null);
      chain.single.mockResolvedValue({ data: { status: 'Active' }, error: null });

      const result = await updateProjectStatus(PROJECT_ID, 'Launched');

      expect(result.success).toBe(true);
    });

    it('returns error when not authenticated', async () => {
      const { updateProjectStatus } = await import('@/app/actions/projects');
      setUnauthenticated();

      const result = await updateProjectStatus(PROJECT_ID, 'Launched');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not authenticated');
    });

    it('returns error when Supabase update fails', async () => {
      const { updateProjectStatus } = await import('@/app/actions/projects');
      setupMockClient(null, { message: 'Update error' });

      const result = await updateProjectStatus(PROJECT_ID, 'Launched');

      expect(result.success).toBe(false);
    });
  });

  // ============ getProjectStats ============
  describe('getProjectStats', () => {
    it('returns empty stats object when RPC returns empty array', async () => {
      const { getProjectStats } = await import('@/app/actions/projects');
      setupMockClient(null, null);
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

      const result = await getProjectStats(WORKSPACE_ID);

      expect(result).toHaveProperty('demos');
      expect(result).toHaveProperty('building');
      expect(result).toHaveProperty('live');
      expect(result).toHaveProperty('archived');
      expect(result.demos).toEqual([]);
    });

    it('returns empty stats on RPC error', async () => {
      const { getProjectStats } = await import('@/app/actions/projects');
      setupMockClient(null, null);
      mockSupabase.rpc.mockResolvedValue({ data: null, error: { message: 'RPC error' } });

      const result = await getProjectStats(WORKSPACE_ID);

      expect(result.demos).toEqual([]);
      expect(result.building).toEqual([]);
    });

    it('categorizes projects by status', async () => {
      const { getProjectStats } = await import('@/app/actions/projects');
      const chain = setupMockClient(null, null);

      const rpcData = [
        {
          id: PROJECT_ID,
          name: 'Demo Project',
          status: 'Demos',
          start_date: null,
          target_date: null,
          project_group: 'demos',
          project_type: 'web_design',
          deployment_platform: 'vercel',
          client_id: null,
          client_name: null,
          logo_url: null,
          lead_id: USER_ID,
          lead_full_name: 'Lead',
          lead_email: null,
          total_issues: 0,
          done_issues: 0,
          roadmap_progress: 0,
          is_pre_production: false,
          metadata: null,
        },
      ];
      mockSupabase.rpc.mockResolvedValue({ data: rpcData, error: null });
      // sort_order query
      chain.in.mockReturnValue(
        Object.assign(
          Promise.resolve({ data: [{ id: PROJECT_ID, sort_order: 0 }], error: null }),
          chain
        )
      );
      // Auth check for admin profile
      chain.single.mockResolvedValue({ data: { role: 'admin' }, error: null });

      const result = await getProjectStats(WORKSPACE_ID);

      expect(result.demos).toHaveLength(1);
      expect(result.demos[0].name).toBe('Demo Project');
    });
  });
});
