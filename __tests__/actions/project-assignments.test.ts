export {};

/**
 * Tests for app/actions/project-assignments.ts
 * Covers: assignEmployeeToProject, reassignEmployee
 * Focus: auto-assignment engine integration + notification dispatch
 */

// ---- Constants (valid RFC 4122 UUIDs) ----
const PROJECT_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const NEW_PROJECT_ID = 'b1ffcd88-8b1a-3de7-aa5c-5aa8ac270b22';
const EMPLOYEE_ID = '4fcff947-9839-4b1a-9962-f9528d4c084b';
const AUTH_USER_ID = '5fcff947-9839-4b1a-9962-f9528d4c084c';
const WORKSPACE_ID = 'c8ec2ea1-325e-4ea9-9334-4590e88845f9';
const ASSIGNMENT_ID = 'd9fe3fb2-436f-5fb0-a445-5601f9995600';

// ---- Module mocks ----

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/app/actions/shared', () => ({
  isUserManagerOrAbove: jest.fn().mockResolvedValue(true),
  createActivity: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/app/actions/auto-assign', () => ({
  getActiveMilestone: jest.fn(),
  createTasksFromMilestone: jest.fn(),
}));

jest.mock('@/app/actions/notifications', () => ({
  createNotification: jest.fn().mockResolvedValue({ success: true }),
}));

// ---- Mock setup ----

type ChainMethods = Record<string, jest.Mock>;

/**
 * Build a thenable chain: every method returns an object that is both
 * a promise (resolving to `resolvedData`) and has all chainable methods.
 */
function buildChain(resolvedData: { data: unknown; error: unknown } = { data: null, error: null }) {
  const methods = [
    'select',
    'insert',
    'update',
    'delete',
    'upsert',
    'eq',
    'neq',
    'in',
    'is',
    'not',
    'order',
    'limit',
    'single',
    'maybeSingle',
  ];
  const chain: ChainMethods = Object.fromEntries(methods.map((m) => [m, jest.fn()]));
  const promised = Object.assign(Promise.resolve(resolvedData), chain);
  Object.values(chain).forEach((fn) => fn.mockReturnValue(promised));
  return chain;
}

/**
 * Queue-based mock: each call to `.from(tableName)` pops the next
 * response from a queue for that table. Falls back to { data: null, error: null }.
 */
let tableQueues: Record<string, Array<{ data: unknown; error: unknown }>>;
let callLog: { table: string; chain: ChainMethods }[];

const mockSupabase = {
  from: jest.fn((table: string) => {
    const queue = tableQueues[table] || [];
    const response = queue.shift() || { data: null, error: null };
    const chain = buildChain(response);
    callLog.push({ table, chain });
    return chain;
  }),
  auth: { getUser: jest.fn() },
};

function setupClient() {
  const { createClient } = jest.requireMock('@/lib/supabase/server');
  (createClient as jest.Mock).mockResolvedValue(mockSupabase);
}

/**
 * Enqueue a response for the next `.from(table)` call.
 * Supports multiple enqueues per table for sequential calls.
 */
function enqueueTable(table: string, data: unknown, error: unknown = null) {
  if (!tableQueues[table]) tableQueues[table] = [];
  tableQueues[table].push({ data, error });
}

function mockAuthUser(userId: string) {
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id: userId } },
    error: null,
  });
}

function mockUnauthenticated() {
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: null },
    error: null,
  });
}

function makeFormData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, val] of Object.entries(entries)) {
    fd.append(key, val);
  }
  return fd;
}

// Suppress expected console.error output during tests
const originalConsoleError = console.error;

beforeEach(() => {
  jest.clearAllMocks();
  callLog = [];
  tableQueues = {};
  setupClient();
  mockAuthUser(AUTH_USER_ID);
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

// ============================================================================
// assignEmployeeToProject
// ============================================================================

describe('assignEmployeeToProject', () => {
  let assignEmployeeToProject: typeof import('@/app/actions/project-assignments').assignEmployeeToProject;
  let getActiveMilestone: jest.Mock;
  let createTasksFromMilestone: jest.Mock;
  let createNotification: jest.Mock;

  beforeEach(async () => {
    ({ assignEmployeeToProject } = await import('@/app/actions/project-assignments'));
    getActiveMilestone = jest.requireMock('@/app/actions/auto-assign').getActiveMilestone;
    createTasksFromMilestone = jest.requireMock(
      '@/app/actions/auto-assign'
    ).createTasksFromMilestone;
    createNotification = jest.requireMock('@/app/actions/notifications').createNotification;
  });

  /**
   * Sets up the standard happy-path mocks for assignEmployeeToProject.
   * Tables queried in order:
   *  1. projects (get project)
   *  2. profiles (get employee)
   *  3. workspace_members (verify membership)
   *  4. project_assignments (check duplicate)
   *  5. project_assignments (insert new)
   *  6. activities (activity log)
   *  7. tasks (check existing undone auto-tasks)
   */
  function setupAssignHappyPath(
    overrides: {
      existingUndoneTasks?: unknown[];
      milestoneResult?: unknown;
      autoResult?: { created: number; skipped: number; total: number };
    } = {}
  ) {
    // 1. projects
    enqueueTable('projects', { workspace_id: WORKSPACE_ID, name: 'Test Project' });
    // 2. profiles
    enqueueTable('profiles', { id: EMPLOYEE_ID, full_name: 'John Doe' });
    // 3. workspace_members
    enqueueTable('workspace_members', { id: 'membership-1' });
    // 4. project_assignments (check duplicate) -- null means no duplicate
    enqueueTable('project_assignments', null);
    // 5. project_assignments (insert)
    enqueueTable('project_assignments', {
      id: ASSIGNMENT_ID,
      project_id: PROJECT_ID,
      employee_id: EMPLOYEE_ID,
    });
    // 6. activities
    enqueueTable('activities', null);
    // 7. tasks (check existing undone auto-tasks)
    enqueueTable('tasks', overrides.existingUndoneTasks ?? []);

    // Auto-assign mocks
    if (overrides.milestoneResult !== undefined) {
      getActiveMilestone.mockResolvedValue(overrides.milestoneResult);
    } else {
      getActiveMilestone.mockResolvedValue({ milestoneNumber: 1, phases: [] });
    }

    if (overrides.autoResult !== undefined) {
      createTasksFromMilestone.mockResolvedValue(overrides.autoResult);
    } else {
      createTasksFromMilestone.mockResolvedValue({ created: 3, skipped: 0, total: 3 });
    }
  }

  // ----------- Auth & validation -----------

  it('returns error when user is not authenticated', async () => {
    mockUnauthenticated();
    const fd = makeFormData({ project_id: PROJECT_ID, employee_id: EMPLOYEE_ID });

    const result = await assignEmployeeToProject(fd);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Not authenticated');
  });

  it('returns error when user is not admin/manager', async () => {
    const { isUserManagerOrAbove } = jest.requireMock('@/app/actions/shared');
    (isUserManagerOrAbove as jest.Mock).mockResolvedValueOnce(false);

    const fd = makeFormData({ project_id: PROJECT_ID, employee_id: EMPLOYEE_ID });
    const result = await assignEmployeeToProject(fd);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Only admins and managers');
  });

  it('returns error when project is not found', async () => {
    enqueueTable('projects', null);

    const fd = makeFormData({ project_id: PROJECT_ID, employee_id: EMPLOYEE_ID });
    const result = await assignEmployeeToProject(fd);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Project not found');
  });

  it('returns error when employee is not found', async () => {
    enqueueTable('projects', { workspace_id: WORKSPACE_ID, name: 'Test Project' });
    enqueueTable('profiles', null);

    const fd = makeFormData({ project_id: PROJECT_ID, employee_id: EMPLOYEE_ID });
    const result = await assignEmployeeToProject(fd);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Employee not found');
  });

  it('returns error when employee is not a workspace member', async () => {
    enqueueTable('projects', { workspace_id: WORKSPACE_ID, name: 'Test Project' });
    enqueueTable('profiles', { id: EMPLOYEE_ID, full_name: 'John Doe' });
    enqueueTable('workspace_members', null);

    const fd = makeFormData({ project_id: PROJECT_ID, employee_id: EMPLOYEE_ID });
    const result = await assignEmployeeToProject(fd);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Employee is not a member of this workspace');
  });

  it('returns error when employee is already assigned', async () => {
    enqueueTable('projects', { workspace_id: WORKSPACE_ID, name: 'Test Project' });
    enqueueTable('profiles', { id: EMPLOYEE_ID, full_name: 'John Doe' });
    enqueueTable('workspace_members', { id: 'membership-1' });
    // Existing active assignment found
    enqueueTable('project_assignments', { id: 'existing-assignment' });

    const fd = makeFormData({ project_id: PROJECT_ID, employee_id: EMPLOYEE_ID });
    const result = await assignEmployeeToProject(fd);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Employee is already assigned to this project');
  });

  // ----------- Happy path: auto-task creation -----------

  it('calls createTasksFromMilestone with correct args when milestone exists', async () => {
    setupAssignHappyPath({
      autoResult: { created: 5, skipped: 1, total: 6 },
    });

    const fd = makeFormData({ project_id: PROJECT_ID, employee_id: EMPLOYEE_ID });
    const result = await assignEmployeeToProject(fd);

    expect(result.success).toBe(true);
    expect(getActiveMilestone).toHaveBeenCalledWith(PROJECT_ID);
    expect(createTasksFromMilestone).toHaveBeenCalledWith(
      PROJECT_ID,
      1, // milestoneNumber
      EMPLOYEE_ID, // assignee
      'assignment' // trigger
    );
  });

  it('sends notification when auto-tasks are created (created > 0)', async () => {
    setupAssignHappyPath({
      autoResult: { created: 3, skipped: 0, total: 3 },
    });

    const fd = makeFormData({ project_id: PROJECT_ID, employee_id: EMPLOYEE_ID });
    const result = await assignEmployeeToProject(fd);

    expect(result.success).toBe(true);
    expect(createNotification).toHaveBeenCalledWith(
      EMPLOYEE_ID,
      WORKSPACE_ID,
      'task_assigned',
      'Tasks auto-assigned',
      '3 tasks from Milestone 1 on Test Project',
      `/projects/${PROJECT_ID}/roadmap`
    );
  });

  it('does NOT send notification when created === 0', async () => {
    setupAssignHappyPath({
      autoResult: { created: 0, skipped: 3, total: 3 },
    });

    const fd = makeFormData({ project_id: PROJECT_ID, employee_id: EMPLOYEE_ID });
    const result = await assignEmployeeToProject(fd);

    expect(result.success).toBe(true);
    expect(createNotification).not.toHaveBeenCalled();
  });

  // ----------- No active milestone: graceful skip -----------

  it('does not call createTasksFromMilestone when getActiveMilestone returns null', async () => {
    setupAssignHappyPath({
      milestoneResult: null,
    });

    const fd = makeFormData({ project_id: PROJECT_ID, employee_id: EMPLOYEE_ID });
    const result = await assignEmployeeToProject(fd);

    expect(result.success).toBe(true);
    expect(getActiveMilestone).toHaveBeenCalledWith(PROJECT_ID);
    expect(createTasksFromMilestone).not.toHaveBeenCalled();
    expect(createNotification).not.toHaveBeenCalled();
  });

  // ----------- Existing undone tasks: transfer path -----------

  it('transfers existing undone auto-tasks instead of creating new ones', async () => {
    setupAssignHappyPath({
      existingUndoneTasks: [{ id: 'task-1' }, { id: 'task-2' }],
    });
    // When undone tasks exist, an additional tasks.update call happens
    enqueueTable('tasks', [{ id: 'task-1' }, { id: 'task-2' }]);

    const fd = makeFormData({ project_id: PROJECT_ID, employee_id: EMPLOYEE_ID });
    const result = await assignEmployeeToProject(fd);

    expect(result.success).toBe(true);
    // Should NOT call the auto-assign engine since tasks already exist
    expect(getActiveMilestone).not.toHaveBeenCalled();
    expect(createTasksFromMilestone).not.toHaveBeenCalled();
    expect(createNotification).not.toHaveBeenCalled();
  });

  // ----------- Error resilience -----------

  it('assignment succeeds even if auto-task throws (non-blocking)', async () => {
    // Set up the basic happy path
    enqueueTable('projects', { workspace_id: WORKSPACE_ID, name: 'Test Project' });
    enqueueTable('profiles', { id: EMPLOYEE_ID, full_name: 'John Doe' });
    enqueueTable('workspace_members', { id: 'membership-1' });
    enqueueTable('project_assignments', null); // no duplicate
    enqueueTable('project_assignments', {
      id: ASSIGNMENT_ID,
      project_id: PROJECT_ID,
      employee_id: EMPLOYEE_ID,
    });
    enqueueTable('activities', null);
    // tasks check returns empty (so auto-assign path is taken)
    enqueueTable('tasks', []);

    // Make auto-assign throw
    getActiveMilestone.mockRejectedValue(new Error('Auto-assign DB crash'));

    const fd = makeFormData({ project_id: PROJECT_ID, employee_id: EMPLOYEE_ID });
    const result = await assignEmployeeToProject(fd);

    // Assignment still succeeds
    expect(result.success).toBe(true);
    expect(result.data).toEqual(expect.objectContaining({ id: ASSIGNMENT_ID }));
    // Error was logged
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Auto-task error'),
      expect.any(Error)
    );
  });

  it('assignment succeeds even if createTasksFromMilestone throws', async () => {
    enqueueTable('projects', { workspace_id: WORKSPACE_ID, name: 'Test Project' });
    enqueueTable('profiles', { id: EMPLOYEE_ID, full_name: 'John Doe' });
    enqueueTable('workspace_members', { id: 'membership-1' });
    enqueueTable('project_assignments', null);
    enqueueTable('project_assignments', {
      id: ASSIGNMENT_ID,
      project_id: PROJECT_ID,
      employee_id: EMPLOYEE_ID,
    });
    enqueueTable('activities', null);
    enqueueTable('tasks', []);

    getActiveMilestone.mockResolvedValue({ milestoneNumber: 2, phases: [] });
    createTasksFromMilestone.mockRejectedValue(new Error('Task creation failed'));

    const fd = makeFormData({ project_id: PROJECT_ID, employee_id: EMPLOYEE_ID });
    const result = await assignEmployeeToProject(fd);

    expect(result.success).toBe(true);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Auto-task error'),
      expect.any(Error)
    );
  });

  // ----------- DB insert error -----------

  it('returns error when assignment insert fails', async () => {
    enqueueTable('projects', { workspace_id: WORKSPACE_ID, name: 'Test Project' });
    enqueueTable('profiles', { id: EMPLOYEE_ID, full_name: 'John Doe' });
    enqueueTable('workspace_members', { id: 'membership-1' });
    enqueueTable('project_assignments', null); // no duplicate
    // Insert fails
    enqueueTable('project_assignments', null, { message: 'unique constraint violation' });

    const fd = makeFormData({ project_id: PROJECT_ID, employee_id: EMPLOYEE_ID });
    const result = await assignEmployeeToProject(fd);

    expect(result.success).toBe(false);
    expect(result.error).toBe('unique constraint violation');
  });

  // ----------- Revalidation -----------

  it('revalidates correct paths on success', async () => {
    setupAssignHappyPath({
      autoResult: { created: 0, skipped: 0, total: 0 },
    });
    const { revalidatePath } = jest.requireMock('next/cache');

    const fd = makeFormData({ project_id: PROJECT_ID, employee_id: EMPLOYEE_ID });
    await assignEmployeeToProject(fd);

    expect(revalidatePath).toHaveBeenCalledWith(`/projects/${PROJECT_ID}`);
    expect(revalidatePath).toHaveBeenCalledWith('/admin/assignments');
  });
});

// ============================================================================
// reassignEmployee
// ============================================================================

describe('reassignEmployee', () => {
  let reassignEmployee: typeof import('@/app/actions/project-assignments').reassignEmployee;
  let getActiveMilestone: jest.Mock;
  let createTasksFromMilestone: jest.Mock;
  let createNotification: jest.Mock;

  beforeEach(async () => {
    ({ reassignEmployee } = await import('@/app/actions/project-assignments'));
    getActiveMilestone = jest.requireMock('@/app/actions/auto-assign').getActiveMilestone;
    createTasksFromMilestone = jest.requireMock(
      '@/app/actions/auto-assign'
    ).createTasksFromMilestone;
    createNotification = jest.requireMock('@/app/actions/notifications').createNotification;
  });

  /**
   * Sets up the standard happy-path mocks for reassignEmployee.
   * Tables queried in order:
   *  1. project_assignments (get current assignment)
   *  2. projects (get new project)
   *  3. project_assignments (check duplicate on new project)
   *  4. project_assignments (update removed_at on old)
   *  5. project_assignments (insert new)
   *  6. activities (removed from old project)
   *  7. activities (assigned to new project)
   */
  function setupReassignHappyPath(
    overrides: {
      milestoneResult?: unknown;
      autoResult?: { created: number; skipped: number; total: number };
      workspaceMismatch?: boolean;
    } = {}
  ) {
    // 1. project_assignments (current)
    enqueueTable('project_assignments', {
      project_id: PROJECT_ID,
      employee_id: EMPLOYEE_ID,
      workspace_id: WORKSPACE_ID,
    });
    // 2. projects (new project)
    enqueueTable('projects', {
      workspace_id: overrides.workspaceMismatch ? 'different-workspace' : WORKSPACE_ID,
      name: 'New Project',
    });
    // 3. project_assignments (check duplicate on new project)
    enqueueTable('project_assignments', null);
    // 4. project_assignments (update removed_at)
    enqueueTable('project_assignments', null);
    // 5. project_assignments (insert new)
    enqueueTable('project_assignments', {
      id: 'new-assignment-id',
      project_id: NEW_PROJECT_ID,
      employee_id: EMPLOYEE_ID,
    });
    // 6. activities (removed from old)
    enqueueTable('activities', null);
    // 7. activities (assigned to new)
    enqueueTable('activities', null);

    // Auto-assign mocks
    if (overrides.milestoneResult !== undefined) {
      getActiveMilestone.mockResolvedValue(overrides.milestoneResult);
    } else {
      getActiveMilestone.mockResolvedValue({ milestoneNumber: 2, phases: [] });
    }

    if (overrides.autoResult !== undefined) {
      createTasksFromMilestone.mockResolvedValue(overrides.autoResult);
    } else {
      createTasksFromMilestone.mockResolvedValue({ created: 4, skipped: 0, total: 4 });
    }
  }

  // ----------- Auth & validation -----------

  it('returns error when user is not authenticated', async () => {
    mockUnauthenticated();
    const fd = makeFormData({ assignment_id: ASSIGNMENT_ID, new_project_id: NEW_PROJECT_ID });

    const result = await reassignEmployee(fd);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Not authenticated');
  });

  it('returns error when user is not admin/manager', async () => {
    const { isUserManagerOrAbove } = jest.requireMock('@/app/actions/shared');
    (isUserManagerOrAbove as jest.Mock).mockResolvedValueOnce(false);

    const fd = makeFormData({ assignment_id: ASSIGNMENT_ID, new_project_id: NEW_PROJECT_ID });
    const result = await reassignEmployee(fd);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Only admins and managers');
  });

  it('returns error when current assignment is not found', async () => {
    enqueueTable('project_assignments', null);

    const fd = makeFormData({ assignment_id: ASSIGNMENT_ID, new_project_id: NEW_PROJECT_ID });
    const result = await reassignEmployee(fd);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Assignment not found or already removed');
  });

  it('returns error when new project is not found', async () => {
    enqueueTable('project_assignments', {
      project_id: PROJECT_ID,
      employee_id: EMPLOYEE_ID,
      workspace_id: WORKSPACE_ID,
    });
    enqueueTable('projects', null);

    const fd = makeFormData({ assignment_id: ASSIGNMENT_ID, new_project_id: NEW_PROJECT_ID });
    const result = await reassignEmployee(fd);

    expect(result.success).toBe(false);
    expect(result.error).toBe('New project not found');
  });

  it('returns error when workspaces do not match', async () => {
    setupReassignHappyPath({ workspaceMismatch: true });

    const fd = makeFormData({ assignment_id: ASSIGNMENT_ID, new_project_id: NEW_PROJECT_ID });
    const result = await reassignEmployee(fd);

    expect(result.success).toBe(false);
    expect(result.error).toBe('New project must be in the same workspace');
  });

  it('returns error when employee is already assigned to new project', async () => {
    enqueueTable('project_assignments', {
      project_id: PROJECT_ID,
      employee_id: EMPLOYEE_ID,
      workspace_id: WORKSPACE_ID,
    });
    enqueueTable('projects', { workspace_id: WORKSPACE_ID, name: 'New Project' });
    // Duplicate found on new project
    enqueueTable('project_assignments', { id: 'duplicate-id' });

    const fd = makeFormData({ assignment_id: ASSIGNMENT_ID, new_project_id: NEW_PROJECT_ID });
    const result = await reassignEmployee(fd);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Employee is already assigned to the new project');
  });

  // ----------- Happy path: auto-task creation on new project -----------

  it('creates tasks on new project and sends notification', async () => {
    setupReassignHappyPath({
      autoResult: { created: 4, skipped: 0, total: 4 },
    });

    const fd = makeFormData({ assignment_id: ASSIGNMENT_ID, new_project_id: NEW_PROJECT_ID });
    const result = await reassignEmployee(fd);

    expect(result.success).toBe(true);
    expect(getActiveMilestone).toHaveBeenCalledWith(NEW_PROJECT_ID);
    expect(createTasksFromMilestone).toHaveBeenCalledWith(
      NEW_PROJECT_ID,
      2, // milestoneNumber
      EMPLOYEE_ID, // assignee (from old assignment)
      'assignment' // trigger
    );
    expect(createNotification).toHaveBeenCalledWith(
      EMPLOYEE_ID,
      WORKSPACE_ID,
      'task_assigned',
      'Tasks auto-assigned',
      '4 tasks from Milestone 2 on New Project',
      `/projects/${NEW_PROJECT_ID}/roadmap`
    );
  });

  it('does NOT send notification when created === 0 on reassignment', async () => {
    setupReassignHappyPath({
      autoResult: { created: 0, skipped: 4, total: 4 },
    });

    const fd = makeFormData({ assignment_id: ASSIGNMENT_ID, new_project_id: NEW_PROJECT_ID });
    const result = await reassignEmployee(fd);

    expect(result.success).toBe(true);
    expect(createNotification).not.toHaveBeenCalled();
  });

  // ----------- No active milestone: graceful skip -----------

  it('skips auto-task creation when no active milestone on new project', async () => {
    setupReassignHappyPath({
      milestoneResult: null,
    });

    const fd = makeFormData({ assignment_id: ASSIGNMENT_ID, new_project_id: NEW_PROJECT_ID });
    const result = await reassignEmployee(fd);

    expect(result.success).toBe(true);
    expect(getActiveMilestone).toHaveBeenCalledWith(NEW_PROJECT_ID);
    expect(createTasksFromMilestone).not.toHaveBeenCalled();
    expect(createNotification).not.toHaveBeenCalled();
  });

  // ----------- Error resilience -----------

  it('reassignment succeeds even if auto-task throws (non-blocking)', async () => {
    setupReassignHappyPath();
    getActiveMilestone.mockRejectedValue(new Error('Milestone lookup crashed'));

    const fd = makeFormData({ assignment_id: ASSIGNMENT_ID, new_project_id: NEW_PROJECT_ID });
    const result = await reassignEmployee(fd);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(expect.objectContaining({ id: 'new-assignment-id' }));
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Auto-task error'),
      expect.any(Error)
    );
  });

  it('reassignment succeeds even if createTasksFromMilestone throws', async () => {
    setupReassignHappyPath();
    getActiveMilestone.mockResolvedValue({ milestoneNumber: 1, phases: [] });
    createTasksFromMilestone.mockRejectedValue(new Error('createTasks crashed'));

    const fd = makeFormData({ assignment_id: ASSIGNMENT_ID, new_project_id: NEW_PROJECT_ID });
    const result = await reassignEmployee(fd);

    expect(result.success).toBe(true);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Auto-task error'),
      expect.any(Error)
    );
  });

  // ----------- Rollback on insert failure -----------

  it('attempts rollback when new assignment insert fails', async () => {
    enqueueTable('project_assignments', {
      project_id: PROJECT_ID,
      employee_id: EMPLOYEE_ID,
      workspace_id: WORKSPACE_ID,
    });
    enqueueTable('projects', { workspace_id: WORKSPACE_ID, name: 'New Project' });
    enqueueTable('project_assignments', null); // no duplicate
    enqueueTable('project_assignments', null); // update removed_at succeeds
    // Insert new assignment fails
    enqueueTable('project_assignments', null, { message: 'insert failed' });
    // Rollback call (restore old assignment)
    enqueueTable('project_assignments', null);

    const fd = makeFormData({ assignment_id: ASSIGNMENT_ID, new_project_id: NEW_PROJECT_ID });
    const result = await reassignEmployee(fd);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to create new assignment');
    // The rollback update call should have been made on project_assignments
    const pasCalls = callLog.filter((c) => c.table === 'project_assignments');
    // 5 project_assignments calls: get, check dup, update remove, insert (fail), rollback
    expect(pasCalls.length).toBeGreaterThanOrEqual(5);
  });

  it('returns error when removing old assignment fails', async () => {
    enqueueTable('project_assignments', {
      project_id: PROJECT_ID,
      employee_id: EMPLOYEE_ID,
      workspace_id: WORKSPACE_ID,
    });
    enqueueTable('projects', { workspace_id: WORKSPACE_ID, name: 'New Project' });
    enqueueTable('project_assignments', null); // no duplicate
    // Update removed_at fails
    enqueueTable('project_assignments', null, { message: 'update failed' });

    const fd = makeFormData({ assignment_id: ASSIGNMENT_ID, new_project_id: NEW_PROJECT_ID });
    const result = await reassignEmployee(fd);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to remove old assignment');
  });

  // ----------- Revalidation -----------

  it('revalidates both old and new project paths plus admin assignments', async () => {
    setupReassignHappyPath({
      autoResult: { created: 0, skipped: 0, total: 0 },
    });
    const { revalidatePath } = jest.requireMock('next/cache');

    const fd = makeFormData({ assignment_id: ASSIGNMENT_ID, new_project_id: NEW_PROJECT_ID });
    await reassignEmployee(fd);

    expect(revalidatePath).toHaveBeenCalledWith(`/projects/${PROJECT_ID}`);
    expect(revalidatePath).toHaveBeenCalledWith(`/projects/${NEW_PROJECT_ID}`);
    expect(revalidatePath).toHaveBeenCalledWith('/admin/assignments');
  });
});
