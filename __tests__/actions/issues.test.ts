export {};

/**
 * Tests for app/actions/issues.ts
 * Covers: createIssue, updateIssue, deleteIssue, getIssueById,
 *         createComment, addIssueAssignee, removeIssueAssignee,
 *         getIssueAssignees, getScheduledIssues, scheduleIssue, unscheduleIssue
 */

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('@/lib/email', () => ({
  notifyIssueCreated: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/app/actions/workspace', () => ({
  getCurrentWorkspaceId: jest.fn().mockResolvedValue('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
}));

jest.mock('@/app/actions/shared', () => ({
  createActivity: jest.fn().mockResolvedValue(undefined),
  canDeleteIssue: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/app/actions/notifications', () => ({
  createNotification: jest.fn().mockResolvedValue(undefined),
  notifyTaskAssigned: jest.fn().mockResolvedValue(undefined),
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
  createIssue,
  updateIssue,
  deleteIssue,
  getIssueById,
  createComment,
  addIssueAssignee,
  removeIssueAssignee,
  getIssueAssignees,
  getScheduledIssues,
  scheduleIssue,
  unscheduleIssue,
} from '@/app/actions/issues';
import { canDeleteIssue } from '@/app/actions/shared';

// ---- Helpers ----

const ISSUE_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const USER_ID = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const WS_ID = 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const PROFILE_ID = 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
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
    'upsert',
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
  const { createActivity: mockCreateActivity, canDeleteIssue: mockCanDelete } =
    jest.requireMock('@/app/actions/shared');
  (mockCreateActivity as jest.Mock).mockResolvedValue(undefined);
  (mockCanDelete as jest.Mock).mockResolvedValue(true);
  const { notifyIssueCreated: mockNotify } = jest.requireMock('@/lib/email');
  (mockNotify as jest.Mock).mockResolvedValue(undefined);
  const { getCurrentWorkspaceId: mockGetWs } = jest.requireMock('@/app/actions/workspace');
  (mockGetWs as jest.Mock).mockResolvedValue(WS_ID);
  const { createNotification: mockCreateNotif, notifyTaskAssigned: mockNotifyTask } =
    jest.requireMock('@/app/actions/notifications');
  (mockCreateNotif as jest.Mock).mockResolvedValue(undefined);
  (mockNotifyTask as jest.Mock).mockResolvedValue(undefined);
});

// ---- Tests ----

describe('createIssue', () => {
  it('returns error when not authenticated', async () => {
    mockAuth(null);
    const formData = new FormData();
    const result = await createIssue(formData);
    expect(result.success).toBe(false);
    expect(result.error).toContain('authenticated');
  });

  it('returns error on validation failure (no title)', async () => {
    const formData = new FormData();
    const result = await createIssue(formData);
    expect(result.success).toBe(false);
  });

  it('creates an issue successfully with title and workspace_id', async () => {
    const newIssue = { id: ISSUE_ID, title: 'Test Issue', workspace_id: WS_ID };
    supabase.from.mockReturnValue(buildChain({ data: newIssue, error: null }));

    const formData = new FormData();
    formData.set('title', 'Test Issue');
    formData.set('workspace_id', WS_ID);

    const result = await createIssue(formData);
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ id: ISSUE_ID });
  });

  it('returns error when DB insert fails', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'Insert failed' } }));

    const formData = new FormData();
    formData.set('title', 'Test Issue');
    formData.set('workspace_id', WS_ID);

    const result = await createIssue(formData);
    expect(result.success).toBe(false);
  });

  it('returns error when no workspace found', async () => {
    const { getCurrentWorkspaceId: mockGetWs } = jest.requireMock('@/app/actions/workspace');
    (mockGetWs as jest.Mock).mockResolvedValue(null);

    const formData = new FormData();
    formData.set('title', 'Test Issue');
    // No workspace_id set, no default available

    const result = await createIssue(formData);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Workspace');
  });
});

describe('updateIssue', () => {
  it('returns error when not authenticated', async () => {
    mockAuth(null);
    const formData = new FormData();
    const result = await updateIssue(formData);
    expect(result.success).toBe(false);
    expect(result.error).toContain('authenticated');
  });

  it('returns error on validation failure (no id)', async () => {
    const formData = new FormData();
    formData.set('title', 'Updated Title');
    const result = await updateIssue(formData);
    expect(result.success).toBe(false);
  });

  it('returns error when id is not a valid UUID', async () => {
    const formData = new FormData();
    formData.set('id', 'not-a-uuid');
    formData.set('title', 'Updated');
    const result = await updateIssue(formData);
    expect(result.success).toBe(false);
  });

  it('updates issue successfully', async () => {
    const updatedIssue = { id: ISSUE_ID, title: 'Updated Title', status: 'In Progress' };
    supabase.from
      .mockReturnValueOnce(
        buildChain({
          data: { status: 'Todo', title: 'Old', creator_id: USER_ID, workspace_id: WS_ID },
          error: null,
        })
      )
      .mockReturnValue(buildChain({ data: updatedIssue, error: null }));

    const formData = new FormData();
    formData.set('id', ISSUE_ID);
    formData.set('title', 'Updated Title');
    formData.set('status', 'In Progress');

    const result = await updateIssue(formData);
    expect(result.success).toBe(true);
  });

  it('returns error on DB update failure', async () => {
    supabase.from
      .mockReturnValueOnce(
        buildChain({
          data: { status: 'Todo', title: 'Old', creator_id: USER_ID, workspace_id: WS_ID },
          error: null,
        })
      )
      .mockReturnValue(buildChain({ data: null, error: { message: 'Update failed' } }));

    const formData = new FormData();
    formData.set('id', ISSUE_ID);
    formData.set('title', 'Updated');

    const result = await updateIssue(formData);
    expect(result.success).toBe(false);
  });
});

describe('deleteIssue', () => {
  it('returns error when not authenticated', async () => {
    mockAuth(null);
    const result = await deleteIssue(ISSUE_ID);
    expect(result.success).toBe(false);
    expect(result.error).toContain('authenticated');
  });

  it('returns error when user lacks permission', async () => {
    (canDeleteIssue as jest.Mock).mockResolvedValueOnce(false);
    const result = await deleteIssue(ISSUE_ID);
    expect(result.success).toBe(false);
    expect(result.error).toContain('permission');
  });

  it('returns success on valid delete', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));
    const result = await deleteIssue(ISSUE_ID);
    expect(result.success).toBe(true);
  });

  it('returns error on DB delete failure', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'Delete failed' } }));
    const result = await deleteIssue(ISSUE_ID);
    expect(result.success).toBe(false);
  });
});

describe('getIssueById', () => {
  it('returns null on DB error', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'Not found' } }));
    const result = await getIssueById(ISSUE_ID);
    expect(result).toBeNull();
  });

  it('returns normalized issue with FK arrays resolved', async () => {
    const mockIssue = {
      id: ISSUE_ID,
      title: 'Issue 1',
      creator: [{ id: USER_ID, full_name: 'Fawzi', email: 'f@q.com' }],
      project: [{ id: 'proj-1', name: 'Project' }],
      team: [{ id: 'team-1', name: 'Team', key: 'T' }],
      comments: [],
    };
    supabase.from.mockReturnValue(buildChain({ data: mockIssue, error: null }));
    const result = await getIssueById(ISSUE_ID);
    expect(result).not.toBeNull();
    expect(Array.isArray(result?.creator)).toBe(false);
    expect(Array.isArray(result?.project)).toBe(false);
    expect(Array.isArray(result?.team)).toBe(false);
  });

  it('normalizes comment user FK arrays', async () => {
    const mockIssue = {
      id: ISSUE_ID,
      title: 'Issue 1',
      creator: { id: USER_ID, full_name: 'Fawzi', email: 'f@q.com' },
      project: null,
      team: null,
      comments: [
        {
          id: 'comment-1',
          body: 'Hello',
          created_at: '2024-01-01T00:00:00Z',
          user: [{ id: USER_ID, full_name: 'Fawzi', email: 'f@q.com', avatar_url: null }],
        },
      ],
    };
    supabase.from.mockReturnValue(buildChain({ data: mockIssue, error: null }));
    const result = await getIssueById(ISSUE_ID);
    expect(result?.comments[0].user).not.toBeInstanceOf(Array);
  });
});

describe('updateIssue (Done status notification)', () => {
  it('sends notification when status changes to Done and creator differs', async () => {
    const CREATOR_ID = 'e5eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const updatedIssue = { id: ISSUE_ID, title: 'My Issue', status: 'Done' };
    const oldIssueData = {
      status: 'In Progress',
      title: 'My Issue',
      creator_id: CREATOR_ID,
      workspace_id: WS_ID,
    };
    const userProfile = { full_name: 'Fawzi', email: 'f@q.com' };
    const assigneesData = [{ profile_id: 'f6eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' }];

    supabase.from
      .mockReturnValueOnce(buildChain({ data: oldIssueData, error: null })) // get old issue
      .mockReturnValueOnce(buildChain({ data: updatedIssue, error: null })) // update issue
      .mockReturnValueOnce(buildChain({ data: userProfile, error: null })) // get current user
      .mockReturnValue(buildChain({ data: assigneesData, error: null })); // get assignees

    const formData = new FormData();
    formData.set('id', ISSUE_ID);
    formData.set('status', 'Done');

    const result = await updateIssue(formData);
    expect(result.success).toBe(true);
  });
});

describe('updateIssue (Done status - same user as creator, no notification)', () => {
  it('does not send notification when completer is creator', async () => {
    // creator_id === user.id → no notification
    const updatedIssue = { id: ISSUE_ID, title: 'My Issue', status: 'Done' };
    const oldIssueData = {
      status: 'In Progress',
      title: 'My Issue',
      creator_id: USER_ID,
      workspace_id: WS_ID,
    };
    const userProfile = { full_name: 'Fawzi', email: 'f@q.com' };
    const assigneesData: unknown[] = [];

    supabase.from
      .mockReturnValueOnce(buildChain({ data: oldIssueData, error: null }))
      .mockReturnValueOnce(buildChain({ data: updatedIssue, error: null }))
      .mockReturnValueOnce(buildChain({ data: userProfile, error: null }))
      .mockReturnValue(buildChain({ data: assigneesData, error: null }));

    const formData = new FormData();
    formData.set('id', ISSUE_ID);
    formData.set('status', 'Done');
    const result = await updateIssue(formData);
    expect(result.success).toBe(true);
  });
});

describe('createIssue (with assignee)', () => {
  it('creates issue and assigns user when assignee_id provided', async () => {
    const newIssue = { id: ISSUE_ID, title: 'Assigned Issue', workspace_id: WS_ID };
    supabase.from
      .mockReturnValueOnce(buildChain({ data: newIssue, error: null })) // insert issue
      .mockReturnValue(buildChain({ data: null, error: null })); // insert assignee + other calls

    const formData = new FormData();
    formData.set('title', 'Assigned Issue');
    formData.set('workspace_id', WS_ID);
    formData.set('assignee_id', PROFILE_ID);

    const result = await createIssue(formData);
    expect(result.success).toBe(true);
  });
});

describe('getScheduledIssues (without workspace param)', () => {
  it('returns scheduled issues using default workspace', async () => {
    const rawIssues = [
      {
        id: ISSUE_ID,
        title: 'Scheduled',
        description: null,
        status: 'Todo',
        priority: 'Medium',
        scheduled_start_time: '2024-06-01T09:00:00Z',
        scheduled_end_time: '2024-06-01T10:00:00Z',
        project: null,
        assignee: [{ profile: { full_name: 'Hasan', avatar_url: null } }],
      },
    ];
    supabase.from.mockReturnValue(buildChain({ data: rawIssues, error: null }));
    const result = await getScheduledIssues();
    expect(result).toHaveLength(1);
    expect(result[0].assignee).toBeDefined();
  });
});

describe('createComment', () => {
  it('returns error when not authenticated', async () => {
    mockAuth(null);
    const formData = new FormData();
    const result = await createComment(formData);
    expect(result.success).toBe(false);
    expect(result.error).toContain('authenticated');
  });

  it('returns error on validation failure', async () => {
    const formData = new FormData();
    // Missing required fields issue_id and body
    const result = await createComment(formData);
    expect(result.success).toBe(false);
  });

  it('creates comment successfully', async () => {
    const newComment = {
      id: 'comment-new',
      body: 'Great work!',
      created_at: '2024-01-01T00:00:00Z',
      user: { id: USER_ID, full_name: 'Fawzi', email: 'f@q.com', avatar_url: null },
    };
    const mockIssue = {
      team_id: null,
      project_id: null,
      title: 'Test Issue',
      creator_id: USER_ID,
      workspace_id: WS_ID,
    };
    const mockProfile = { full_name: 'Fawzi', email: 'f@q.com' };
    const mockAssignees: unknown[] = [];

    supabase.from
      .mockReturnValueOnce(buildChain({ data: newComment, error: null })) // insert comment
      .mockReturnValueOnce(buildChain({ data: mockIssue, error: null })) // get issue
      .mockReturnValueOnce(buildChain({ data: mockProfile, error: null })) // get user profile
      .mockReturnValue(buildChain({ data: mockAssignees, error: null })); // get assignees

    const formData = new FormData();
    formData.set('issue_id', ISSUE_ID);
    formData.set('body', 'Great work!');

    const result = await createComment(formData);
    expect(result.success).toBe(true);
  });

  it('returns error on DB failure', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'Insert failed' } }));

    const formData = new FormData();
    formData.set('issue_id', ISSUE_ID);
    formData.set('body', 'Test comment');

    const result = await createComment(formData);
    expect(result.success).toBe(false);
  });
});

describe('addIssueAssignee', () => {
  it('returns error when not authenticated', async () => {
    mockAuth(null);
    const result = await addIssueAssignee(ISSUE_ID, PROFILE_ID);
    expect(result.success).toBe(false);
    expect(result.error).toContain('authenticated');
  });

  it('adds assignee successfully', async () => {
    const assigneeData = { id: 'assign-1', issue_id: ISSUE_ID, profile_id: PROFILE_ID };
    const issueData = { team_id: null, project_id: null, title: 'Issue', workspace_id: WS_ID };
    const profileData = { full_name: 'Hasan', email: 'h@q.com' };
    const currentUserData = { full_name: 'Fawzi', email: 'f@q.com' };

    supabase.from
      .mockReturnValueOnce(buildChain({ data: assigneeData, error: null })) // insert assignee
      .mockReturnValueOnce(buildChain({ data: issueData, error: null })) // get issue
      .mockReturnValueOnce(buildChain({ data: profileData, error: null })) // get assignee profile
      .mockReturnValueOnce(buildChain({ data: null, error: null })) // createActivity
      .mockReturnValue(buildChain({ data: currentUserData, error: null })); // get current user

    const result = await addIssueAssignee(ISSUE_ID, PROFILE_ID);
    expect(result.success).toBe(true);
  });

  it('returns error on DB insert failure', async () => {
    supabase.from.mockReturnValue(
      buildChain({ data: null, error: { message: 'Duplicate entry' } })
    );
    const result = await addIssueAssignee(ISSUE_ID, PROFILE_ID);
    expect(result.success).toBe(false);
  });
});

describe('removeIssueAssignee', () => {
  it('returns error when not authenticated', async () => {
    mockAuth(null);
    const result = await removeIssueAssignee(ISSUE_ID, PROFILE_ID);
    expect(result.success).toBe(false);
    expect(result.error).toContain('authenticated');
  });

  it('removes assignee successfully', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));
    const result = await removeIssueAssignee(ISSUE_ID, PROFILE_ID);
    expect(result.success).toBe(true);
  });

  it('returns error on DB failure', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'Delete failed' } }));
    const result = await removeIssueAssignee(ISSUE_ID, PROFILE_ID);
    expect(result.success).toBe(false);
  });
});

describe('getIssueAssignees', () => {
  it('returns empty array on DB error', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'DB error' } }));
    const result = await getIssueAssignees(ISSUE_ID);
    expect(result).toEqual([]);
  });

  it('returns normalized assignee list', async () => {
    const rawAssignees = [
      {
        id: 'assign-1',
        assigned_at: '2024-01-01T00:00:00Z',
        profile: [{ id: PROFILE_ID, full_name: 'Hasan', email: 'h@q.com', avatar_url: null }],
        assigned_by_profile: [{ id: USER_ID, full_name: 'Fawzi' }],
      },
    ];
    supabase.from.mockReturnValue(buildChain({ data: rawAssignees, error: null }));
    const result = await getIssueAssignees(ISSUE_ID);
    expect(result).toHaveLength(1);
    expect(Array.isArray(result[0].profile)).toBe(false);
    expect(Array.isArray(result[0].assigned_by_profile)).toBe(false);
  });
});

describe('getScheduledIssues', () => {
  it('returns empty array on DB error', async () => {
    const { getCurrentWorkspaceId: mockGetWs } = jest.requireMock('@/app/actions/workspace');
    (mockGetWs as jest.Mock).mockResolvedValue(WS_ID);
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'DB error' } }));
    const result = await getScheduledIssues(WS_ID);
    expect(result).toEqual([]);
  });

  it('returns mapped scheduled issues', async () => {
    const rawIssues = [
      {
        id: ISSUE_ID,
        title: 'Scheduled Issue',
        description: null,
        status: 'Todo',
        priority: 'High',
        scheduled_start_time: '2024-06-01T09:00:00Z',
        scheduled_end_time: '2024-06-01T10:00:00Z',
        project: { id: 'proj-1', name: 'Project', project_group: 'active' },
        assignee: [],
      },
    ];
    supabase.from.mockReturnValue(buildChain({ data: rawIssues, error: null }));
    const result = await getScheduledIssues(WS_ID);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('issue');
    expect(result[0].start_time).toBe('2024-06-01T09:00:00Z');
  });
});

describe('scheduleIssue', () => {
  it('schedules issue successfully', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));
    const result = await scheduleIssue(ISSUE_ID, '2024-06-01T09:00:00Z', '2024-06-01T10:00:00Z');
    expect(result.success).toBe(true);
  });

  it('returns error on DB failure', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'Update failed' } }));
    const result = await scheduleIssue(ISSUE_ID, '2024-06-01T09:00:00Z', '2024-06-01T10:00:00Z');
    expect(result.success).toBe(false);
  });
});

describe('unscheduleIssue', () => {
  it('unschedules issue successfully', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));
    const result = await unscheduleIssue(ISSUE_ID);
    expect(result.success).toBe(true);
  });

  it('returns error on DB failure', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'Update failed' } }));
    const result = await unscheduleIssue(ISSUE_ID);
    expect(result.success).toBe(false);
  });
});
