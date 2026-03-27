/**
 * Tests for app/actions/daily-flow.ts
 * Covers: getDailyFlowData — aggregated dashboard data
 */

export {};

// ---- Constants (valid RFC 4122 UUIDs) ----
const WORKSPACE_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const USER_ID = '02d60c07-f159-457e-a809-03c2aa5ba784';

// ---- Module mocks ----

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/app/actions', () => ({
  getCurrentWorkspaceId: jest.fn(),
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
    'filter',
    'ilike',
  ];
  const chain: Record<string, jest.Mock> = Object.fromEntries(methods.map((m) => [m, jest.fn()]));
  const promised = Object.assign(Promise.resolve(resolvedData), chain);
  Object.values(chain).forEach((fn) => fn.mockReturnValue(promised));
  return chain;
}

function setupMockClientForDailyFlow({
  meetings = [] as unknown[],
  tasks = [] as unknown[],
  project = null as unknown,
  profiles = [] as unknown[],
} = {}) {
  // getDailyFlowData does 4 parallel queries via Promise.all
  const meetingsChain = buildChain({ data: meetings, error: null });
  const tasksChain = buildChain({ data: tasks, error: null });
  const projectChain = buildChain({ data: project, error: null });
  projectChain.maybeSingle.mockResolvedValue({ data: project, error: null });
  const profilesChain = buildChain({ data: profiles, error: null });

  // Supabase queries in getDailyFlowData:
  // 1. meetings
  // 2. tasks
  // 3. projects (most recent active)
  // 4. workspace_members
  mockSupabase.from
    .mockReturnValueOnce(meetingsChain)
    .mockReturnValueOnce(tasksChain)
    .mockReturnValueOnce(projectChain)
    .mockReturnValueOnce(profilesChain);

  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id: USER_ID } },
    error: null,
  });

  const { createClient } = jest.requireMock('@/lib/supabase/server');
  (createClient as jest.Mock).mockResolvedValue(mockSupabase);

  const { getCurrentWorkspaceId } = jest.requireMock('@/app/actions');
  (getCurrentWorkspaceId as jest.Mock).mockResolvedValue(WORKSPACE_ID);
}

// ---- Tests ----

describe('daily-flow actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { getCurrentWorkspaceId } = jest.requireMock('@/app/actions');
    (getCurrentWorkspaceId as jest.Mock).mockResolvedValue(WORKSPACE_ID);
  });

  // ============ getDailyFlowData ============
  describe('getDailyFlowData', () => {
    it('returns empty state when no workspace', async () => {
      const { getDailyFlowData } = await import('@/app/actions/daily-flow');
      const { getCurrentWorkspaceId } = jest.requireMock('@/app/actions');
      (getCurrentWorkspaceId as jest.Mock).mockResolvedValue(null);
      const { createClient } = jest.requireMock('@/lib/supabase/server');
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const result = await getDailyFlowData();

      expect(result.meetings).toEqual([]);
      expect(result.tasks).toEqual([]);
      expect(result.focusProject).toBeNull();
      expect(result.teamMembers).toEqual([]);
      expect(result.currentUserId).toBeNull();
    });

    it('returns meetings, tasks, project, and team members', async () => {
      const { getDailyFlowData } = await import('@/app/actions/daily-flow');

      const mockMeetings = [
        {
          id: 'meeting-1',
          title: 'Standup',
          start_time: new Date().toISOString(),
          end_time: new Date().toISOString(),
          meeting_link: null,
          project: { id: WORKSPACE_ID, name: 'Project A' },
          client: null,
          creator: { id: USER_ID, full_name: 'Fawzi' },
        },
      ];

      const mockTasks = [
        {
          id: 'task-1',
          workspace_id: WORKSPACE_ID,
          title: 'Do something',
          status: 'Todo',
          priority: 'High',
          sort_order: 0,
          show_in_inbox: true,
          creator_id: USER_ID,
          assignee_id: null,
          project_id: null,
          description: null,
          item_type: 'task',
          due_date: null,
          completed_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          assignee: null,
          project: null,
        },
      ];

      const mockProject = {
        id: WORKSPACE_ID,
        name: 'Focus Project',
        project_type: 'web_design',
        status: 'Active',
        progress: 50,
        client: null,
      };

      const mockProfiles = [
        {
          profile: {
            id: USER_ID,
            email: 'admin@example.com',
            full_name: 'Admin User',
            role: 'admin',
          },
        },
      ];

      setupMockClientForDailyFlow({
        meetings: mockMeetings,
        tasks: mockTasks,
        project: mockProject,
        profiles: mockProfiles,
      });

      const result = await getDailyFlowData();

      expect(result.meetings).toHaveLength(1);
      expect(result.meetings[0].title).toBe('Standup');
      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].title).toBe('Do something');
      expect(result.focusProject).not.toBeNull();
      expect(result.focusProject?.name).toBe('Focus Project');
      expect(result.teamMembers).toHaveLength(1);
      expect(result.currentUserId).toBe(USER_ID);
    });

    it('returns null focusProject when no active project', async () => {
      const { getDailyFlowData } = await import('@/app/actions/daily-flow');

      setupMockClientForDailyFlow({
        meetings: [],
        tasks: [],
        project: null,
        profiles: [],
      });

      const result = await getDailyFlowData();

      expect(result.focusProject).toBeNull();
    });

    it('handles errors in parallel queries gracefully', async () => {
      const { getDailyFlowData } = await import('@/app/actions/daily-flow');

      // All queries return errors
      const errorChain = buildChain({ data: null, error: { message: 'DB error' } });
      errorChain.maybeSingle.mockResolvedValue({ data: null, error: null });
      mockSupabase.from.mockReturnValue(errorChain);
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
      const { createClient } = jest.requireMock('@/lib/supabase/server');
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const result = await getDailyFlowData();

      // Should return empty arrays, not throw
      expect(result.meetings).toEqual([]);
      expect(result.tasks).toEqual([]);
    });

    it('normalizes array FK responses in meetings', async () => {
      const { getDailyFlowData } = await import('@/app/actions/daily-flow');

      const meetingWithArrayFKs = {
        id: 'meeting-1',
        title: 'Test',
        start_time: new Date().toISOString(),
        end_time: new Date().toISOString(),
        meeting_link: null,
        project: [{ id: WORKSPACE_ID, name: 'Project' }],
        client: [{ id: USER_ID, display_name: 'Client' }],
        creator: [{ id: USER_ID, full_name: 'Creator' }],
      };

      setupMockClientForDailyFlow({ meetings: [meetingWithArrayFKs] });

      const result = await getDailyFlowData();

      expect(result.meetings[0].project).toEqual({ id: WORKSPACE_ID, name: 'Project' });
      expect(Array.isArray(result.meetings[0].project)).toBe(false);
    });

    it('maps admin profiles as lead role', async () => {
      const { getDailyFlowData } = await import('@/app/actions/daily-flow');

      const profiles = [
        { profile: { id: USER_ID, email: 'admin@test.com', full_name: 'Admin', role: 'admin' } },
        {
          profile: {
            id: WORKSPACE_ID,
            email: 'employee@test.com',
            full_name: 'Employee',
            role: 'employee',
          },
        },
      ];

      setupMockClientForDailyFlow({ profiles });

      const result = await getDailyFlowData();

      const adminMember = result.teamMembers.find((m) => m.id === USER_ID);
      const employeeMember = result.teamMembers.find((m) => m.id === WORKSPACE_ID);

      expect(adminMember?.role).toBe('lead');
      expect(employeeMember?.role).toBe('trainee');
    });
  });
});
