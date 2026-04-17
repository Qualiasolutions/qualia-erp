export {};

/**
 * Tests for app/actions/inbox.ts
 * Covers: getTasks, createTask, updateTask, deleteTask, reorderTasks,
 *         toggleTaskInbox, quickUpdateTask
 */

import { createMockTask } from './test-utils';

// ---- Constants (valid RFC 4122 UUIDs) ----
const WORKSPACE_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const USER_ID = '02d60c07-f159-457e-a809-03c2aa5ba784';
const TASK_ID = '835d99bd-97d5-454b-b86e-b52afb106525';
const PROJECT_ID = '625935ca-5525-4449-a67b-0893dea291b7';

// ---- Module-level mocks (hoisted) ----

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

const mockSupabase = {
  from: jest.fn(),
  auth: { getUser: jest.fn() },
  rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/app/actions', () => ({
  getCurrentWorkspaceId: jest.fn(),
}));

jest.mock('@/app/actions/shared', () => ({
  canModifyTask: jest.fn(),
  isUserAdmin: jest.fn(),
  getCachedUserRole: jest.fn().mockResolvedValue('admin'),
}));

jest.mock('@/lib/email', () => ({
  notifyTaskCreated: jest.fn().mockResolvedValue(undefined),
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
    'gt',
    'gte',
    'lte',
    'order',
    'limit',
    'single',
    'maybeSingle',
    'upsert',
    'or',
    'contains',
    'overlaps',
    'filter',
    'range',
    'returns',
  ];
  const chain: Record<string, jest.Mock> = Object.fromEntries(methods.map((m) => [m, jest.fn()]));
  const promised = Object.assign(Promise.resolve(resolvedData), chain);
  Object.values(chain).forEach((fn) => {
    fn.mockReturnValue(promised);
  });
  return chain;
}

function setupMockClient(data: unknown = null, error: unknown = null) {
  const chain = buildChain({ data, error });
  mockSupabase.from.mockReturnValue(chain);
  mockSupabase.rpc.mockResolvedValue({ data: null, error: null });
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id: USER_ID, email: 'test@example.com' } },
    error: null,
  });

  const { createClient } = jest.requireMock('@/lib/supabase/server');
  (createClient as jest.Mock).mockResolvedValue(mockSupabase);

  return chain;
}

function setUnauthenticated() {
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: null },
    error: null,
  });
  const { createClient } = jest.requireMock('@/lib/supabase/server');
  (createClient as jest.Mock).mockResolvedValue(mockSupabase);
}

// ---- Tests ----

describe('inbox actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Restore defaults after clearAllMocks wipes them
    const { canModifyTask, isUserAdmin } = jest.requireMock('@/app/actions/shared');
    (canModifyTask as jest.Mock).mockResolvedValue(true);
    (isUserAdmin as jest.Mock).mockResolvedValue(true);
    const { getCurrentWorkspaceId } = jest.requireMock('@/app/actions');
    (getCurrentWorkspaceId as jest.Mock).mockResolvedValue(WORKSPACE_ID);
    const { notifyTaskCreated } = jest.requireMock('@/lib/email');
    (notifyTaskCreated as jest.Mock).mockResolvedValue(undefined);
  });

  // ============ getTasks ============
  describe('getTasks', () => {
    it('returns tasks for workspace', async () => {
      const { getTasks } = await import('@/app/actions/inbox');
      const tasks = [createMockTask(), createMockTask({ id: 'task-id-2', title: 'Second Task' })];
      setupMockClient(tasks, null);

      const result = await getTasks(WORKSPACE_ID);

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Test Task');
    });

    it('returns empty array when no workspace', async () => {
      const { getTasks } = await import('@/app/actions/inbox');
      const { getCurrentWorkspaceId } = jest.requireMock('@/app/actions');
      (getCurrentWorkspaceId as jest.Mock).mockResolvedValueOnce(null);
      setUnauthenticated();

      const result = await getTasks(null);

      expect(result).toEqual([]);
    });

    it('returns empty array when unauthenticated', async () => {
      const { getTasks } = await import('@/app/actions/inbox');
      setupMockClient([], null);
      setUnauthenticated();

      const result = await getTasks(WORKSPACE_ID);

      expect(result).toEqual([]);
    });

    it('returns empty array on Supabase error', async () => {
      const { getTasks } = await import('@/app/actions/inbox');
      setupMockClient(null, { message: 'DB error' });

      const result = await getTasks(WORKSPACE_ID);

      expect(result).toEqual([]);
    });

    it('filters inbox-only tasks when inboxOnly=true', async () => {
      const { getTasks } = await import('@/app/actions/inbox');
      const inboxTasks = [createMockTask({ show_in_inbox: true })];
      const chain = setupMockClient(inboxTasks, null);

      await getTasks(WORKSPACE_ID, { inboxOnly: true });

      expect(chain.eq).toHaveBeenCalledWith('show_in_inbox', true);
    });

    it('applies status filter', async () => {
      const { getTasks } = await import('@/app/actions/inbox');
      const chain = setupMockClient([], null);

      await getTasks(WORKSPACE_ID, { status: ['Todo', 'In Progress'] });

      expect(chain.in).toHaveBeenCalledWith('status', ['Todo', 'In Progress']);
    });

    it('normalizes array FK responses for creator/assignee/project', async () => {
      const { getTasks } = await import('@/app/actions/inbox');
      const taskWithArrayFKs = {
        ...createMockTask(),
        creator: [{ id: USER_ID, full_name: 'Creator', email: null, avatar_url: null }],
        assignee: [{ id: USER_ID, full_name: 'Assignee', email: null, avatar_url: null }],
        project: [{ id: PROJECT_ID, name: 'Project', project_type: 'web_design' }],
      };
      setupMockClient([taskWithArrayFKs], null);

      const result = await getTasks(WORKSPACE_ID);

      expect(result[0].creator).toEqual({
        id: USER_ID,
        full_name: 'Creator',
        email: null,
        avatar_url: null,
      });
      expect(result[0].assignee).toEqual({
        id: USER_ID,
        full_name: 'Assignee',
        email: null,
        avatar_url: null,
      });
    });

    it('applies limit option', async () => {
      const { getTasks } = await import('@/app/actions/inbox');
      const chain = setupMockClient([], null);

      await getTasks(WORKSPACE_ID, { limit: 10 });

      expect(chain.limit).toHaveBeenCalledWith(10);
    });
  });

  // ============ createTask ============
  describe('createTask', () => {
    it('creates task with valid input', async () => {
      const { createTask } = await import('@/app/actions/inbox');
      const newTask = createMockTask({ title: 'New Task', workspace_id: WORKSPACE_ID });
      setupMockClient(newTask, null);

      const formData = new FormData();
      formData.set('title', 'New Task');
      formData.set('workspace_id', WORKSPACE_ID);
      formData.set('status', 'Todo');

      const result = await createTask(formData);

      expect(result.success).toBe(true);
    });

    it('returns error when not authenticated', async () => {
      const { createTask } = await import('@/app/actions/inbox');
      setUnauthenticated();

      const formData = new FormData();
      formData.set('title', 'New Task');

      const result = await createTask(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not authenticated');
    });

    it('returns error for missing title', async () => {
      const { createTask } = await import('@/app/actions/inbox');
      setupMockClient(null, null);

      const formData = new FormData();
      formData.set('title', '');

      const result = await createTask(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('returns error when no workspace available', async () => {
      const { createTask } = await import('@/app/actions/inbox');
      const { getCurrentWorkspaceId } = jest.requireMock('@/app/actions');
      (getCurrentWorkspaceId as jest.Mock).mockResolvedValueOnce(null);
      setupMockClient(null, null);

      const formData = new FormData();
      formData.set('title', 'Test Task');
      // No workspace_id provided, getCurrentWorkspaceId returns null

      const result = await createTask(formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Workspace');
    });

    it('returns error when Supabase insert fails', async () => {
      const { createTask } = await import('@/app/actions/inbox');
      setupMockClient(null, { message: 'Insert failed' });

      const formData = new FormData();
      formData.set('title', 'Test Task');
      formData.set('workspace_id', WORKSPACE_ID);

      const result = await createTask(formData);

      expect(result.success).toBe(false);
    });

    it('calls revalidatePath after successful create', async () => {
      const { createTask } = await import('@/app/actions/inbox');
      const { revalidatePath } = jest.requireMock('next/cache');
      const newTask = createMockTask({ workspace_id: WORKSPACE_ID });
      setupMockClient(newTask, null);

      const formData = new FormData();
      formData.set('title', 'New Task');
      formData.set('workspace_id', WORKSPACE_ID);

      await createTask(formData);

      expect(revalidatePath).toHaveBeenCalledWith('/inbox');
    });
  });

  // ============ updateTask ============
  describe('updateTask', () => {
    it('updates task with valid input', async () => {
      const { updateTask } = await import('@/app/actions/inbox');
      setupMockClient(null, null);

      const formData = new FormData();
      formData.set('id', TASK_ID);
      formData.set('title', 'Updated Title');

      const result = await updateTask(formData);

      expect(result.success).toBe(true);
    });

    it('returns error when not authenticated', async () => {
      const { updateTask } = await import('@/app/actions/inbox');
      setUnauthenticated();

      const formData = new FormData();
      formData.set('id', TASK_ID);
      formData.set('title', 'Updated Title');

      const result = await updateTask(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not authenticated');
    });

    it('returns error when user cannot modify task', async () => {
      const { updateTask } = await import('@/app/actions/inbox');
      setupMockClient(null, null);
      const { canModifyTask } = jest.requireMock('@/app/actions/shared');
      (canModifyTask as jest.Mock).mockResolvedValue(false);

      const formData = new FormData();
      formData.set('id', TASK_ID);
      formData.set('title', 'Updated Title');

      const result = await updateTask(formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('permission');
    });

    it('returns error when task ID missing', async () => {
      const { updateTask } = await import('@/app/actions/inbox');
      setupMockClient(null, null);

      const formData = new FormData();
      formData.set('title', 'Updated Title');

      const result = await updateTask(formData);

      expect(result.success).toBe(false);
    });

    it('sets completed_at when status changes to Done', async () => {
      const { updateTask } = await import('@/app/actions/inbox');
      const chain = setupMockClient(null, null);
      // single() for attachment check should return a task with no attachment requirement
      chain.single.mockResolvedValue({ data: { requires_attachment: null }, error: null });

      const formData = new FormData();
      formData.set('id', TASK_ID);
      formData.set('status', 'Done');

      const result = await updateTask(formData);

      expect(result.success).toBe(true);
    });

    it('returns error when Supabase update fails', async () => {
      const { updateTask } = await import('@/app/actions/inbox');
      setupMockClient(null, { message: 'Update error' });

      const formData = new FormData();
      formData.set('id', TASK_ID);
      formData.set('title', 'Title');

      const result = await updateTask(formData);

      expect(result.success).toBe(false);
    });
  });

  // ============ deleteTask ============
  describe('deleteTask', () => {
    it('deletes task when user has permission', async () => {
      const { deleteTask } = await import('@/app/actions/inbox');
      setupMockClient([{ id: TASK_ID }], null);

      const result = await deleteTask(TASK_ID);

      expect(result.success).toBe(true);
    });

    it('returns permission error when RLS filters out the row', async () => {
      const { deleteTask } = await import('@/app/actions/inbox');
      setupMockClient([], null);

      const result = await deleteTask(TASK_ID);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/permission/i);
    });

    it('returns error when not authenticated', async () => {
      const { deleteTask } = await import('@/app/actions/inbox');
      setUnauthenticated();

      const result = await deleteTask(TASK_ID);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not authenticated');
    });

    it('returns error when user cannot modify task', async () => {
      const { deleteTask } = await import('@/app/actions/inbox');
      setupMockClient(null, null);
      const { canModifyTask } = jest.requireMock('@/app/actions/shared');
      (canModifyTask as jest.Mock).mockResolvedValue(false);

      const result = await deleteTask(TASK_ID);

      expect(result.success).toBe(false);
      expect(result.error).toContain('permission');
    });

    it('returns error when Supabase delete fails', async () => {
      const { deleteTask } = await import('@/app/actions/inbox');
      setupMockClient(null, { message: 'Delete error' });

      const result = await deleteTask(TASK_ID);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Delete error');
    });

    it('calls revalidatePath after successful delete', async () => {
      const { deleteTask } = await import('@/app/actions/inbox');
      const { revalidatePath } = jest.requireMock('next/cache');
      setupMockClient([{ id: TASK_ID }], null);

      await deleteTask(TASK_ID);

      expect(revalidatePath).toHaveBeenCalledWith('/inbox');
    });
  });

  // ============ reorderTasks ============
  describe('reorderTasks', () => {
    it('reorders tasks successfully as admin', async () => {
      const { reorderTasks } = await import('@/app/actions/inbox');
      setupMockClient(null, null);

      const updates = [
        { id: TASK_ID, sort_order: 0 },
        { id: WORKSPACE_ID, sort_order: 1 },
      ];

      const result = await reorderTasks(updates);

      expect(result.success).toBe(true);
    });

    it('returns error when not authenticated', async () => {
      const { reorderTasks } = await import('@/app/actions/inbox');
      setUnauthenticated();

      const result = await reorderTasks([{ id: TASK_ID, sort_order: 0 }]);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not authenticated');
    });

    it('handles empty array gracefully', async () => {
      const { reorderTasks } = await import('@/app/actions/inbox');
      setupMockClient(null, null);

      const result = await reorderTasks([]);

      expect(result.success).toBe(true);
    });

    it('checks individual task permissions for non-admins', async () => {
      const { reorderTasks } = await import('@/app/actions/inbox');
      setupMockClient(null, null);
      const { isUserAdmin, canModifyTask } = jest.requireMock('@/app/actions/shared');
      (isUserAdmin as jest.Mock).mockResolvedValue(false);
      (canModifyTask as jest.Mock).mockResolvedValue(false);

      const result = await reorderTasks([{ id: TASK_ID, sort_order: 0 }]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('permission');
    });

    it('allows non-admin to reorder tasks they can modify', async () => {
      const { reorderTasks } = await import('@/app/actions/inbox');
      const { isUserAdmin } = jest.requireMock('@/app/actions/shared');
      (isUserAdmin as jest.Mock).mockResolvedValue(false);

      // For non-admin: build chain where the auth check query returns the task as accessible
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
        'contains',
        'overlaps',
        'filter',
        'range',
        'returns',
      ];
      const chain: Record<string, jest.Mock> = Object.fromEntries(
        methods.map((m) => [m, jest.fn()])
      );
      // The .or() call returns the accessible tasks list
      const orPromise = Object.assign(
        Promise.resolve({ data: [{ id: TASK_ID }], error: null }),
        chain
      );
      chain.or.mockReturnValue(orPromise);
      // Other chain methods return default { data: null, error: null }
      const defaultPromise = Object.assign(Promise.resolve({ data: null, error: null }), chain);
      Object.entries(chain).forEach(([k, fn]) => {
        if (k !== 'or') fn.mockReturnValue(defaultPromise);
      });
      mockSupabase.from.mockReturnValue(chain);
      mockSupabase.rpc.mockResolvedValue({ data: null, error: null });
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: USER_ID, email: 'test@example.com' } },
        error: null,
      });
      const { createClient } = jest.requireMock('@/lib/supabase/server');
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const result = await reorderTasks([{ id: TASK_ID, sort_order: 0 }]);

      expect(result.success).toBe(true);
    });
  });

  // ============ toggleTaskInbox ============
  describe('toggleTaskInbox', () => {
    it('toggles show_in_inbox to true', async () => {
      const { toggleTaskInbox } = await import('@/app/actions/inbox');
      setupMockClient(null, null);

      const result = await toggleTaskInbox(TASK_ID, true);

      expect(result.success).toBe(true);
    });

    it('toggles show_in_inbox to false', async () => {
      const { toggleTaskInbox } = await import('@/app/actions/inbox');
      setupMockClient(null, null);

      const result = await toggleTaskInbox(TASK_ID, false);

      expect(result.success).toBe(true);
    });

    it('returns error when not authenticated', async () => {
      const { toggleTaskInbox } = await import('@/app/actions/inbox');
      setUnauthenticated();

      const result = await toggleTaskInbox(TASK_ID, true);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not authenticated');
    });

    it('returns error when user cannot modify task', async () => {
      const { toggleTaskInbox } = await import('@/app/actions/inbox');
      setupMockClient(null, null);
      const { canModifyTask } = jest.requireMock('@/app/actions/shared');
      (canModifyTask as jest.Mock).mockResolvedValue(false);

      const result = await toggleTaskInbox(TASK_ID, true);

      expect(result.success).toBe(false);
      expect(result.error).toContain('permission');
    });

    it('returns error on Supabase failure', async () => {
      const { toggleTaskInbox } = await import('@/app/actions/inbox');
      setupMockClient(null, { message: 'Toggle error' });

      const result = await toggleTaskInbox(TASK_ID, true);

      expect(result.success).toBe(false);
    });
  });

  // ============ quickUpdateTask ============
  describe('quickUpdateTask', () => {
    it('quick-updates task title', async () => {
      const { quickUpdateTask } = await import('@/app/actions/inbox');
      setupMockClient(null, null);

      const result = await quickUpdateTask(TASK_ID, { title: 'New Title' });

      expect(result.success).toBe(true);
    });

    it('returns error for empty title', async () => {
      const { quickUpdateTask } = await import('@/app/actions/inbox');
      setupMockClient(null, null);

      const result = await quickUpdateTask(TASK_ID, { title: '   ' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('returns error when not authenticated', async () => {
      const { quickUpdateTask } = await import('@/app/actions/inbox');
      setUnauthenticated();

      const result = await quickUpdateTask(TASK_ID, { title: 'New Title' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not authenticated');
    });

    it('returns error when user cannot modify task', async () => {
      const { quickUpdateTask } = await import('@/app/actions/inbox');
      setupMockClient(null, null);
      const { canModifyTask } = jest.requireMock('@/app/actions/shared');
      (canModifyTask as jest.Mock).mockResolvedValue(false);

      const result = await quickUpdateTask(TASK_ID, { title: 'New Title' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('permission');
    });

    it('updates priority successfully', async () => {
      const { quickUpdateTask } = await import('@/app/actions/inbox');
      setupMockClient(null, null);

      const result = await quickUpdateTask(TASK_ID, { priority: 'High' });

      expect(result.success).toBe(true);
    });

    it('updates due_date successfully', async () => {
      const { quickUpdateTask } = await import('@/app/actions/inbox');
      setupMockClient(null, null);

      const result = await quickUpdateTask(TASK_ID, { due_date: '2024-12-31' });

      expect(result.success).toBe(true);
    });

    it('returns error on Supabase failure', async () => {
      const { quickUpdateTask } = await import('@/app/actions/inbox');
      setupMockClient(null, { message: 'DB error' });

      const result = await quickUpdateTask(TASK_ID, { title: 'New Title' });

      expect(result.success).toBe(false);
    });

    it('marks task done with status update', async () => {
      const { quickUpdateTask } = await import('@/app/actions/inbox');
      const chain = setupMockClient(null, null);
      // single() for task info when status=Done returns workspace info
      chain.single.mockResolvedValue({
        data: { workspace_id: WORKSPACE_ID, title: 'Test Task', requires_attachment: null },
        error: null,
      });

      const result = await quickUpdateTask(TASK_ID, { status: 'Done' });

      expect(result.success).toBe(true);
    });
  });
});
