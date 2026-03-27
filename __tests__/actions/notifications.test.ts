export {};

/**
 * Tests for app/actions/notifications.ts
 * Covers: createNotification, getNotifications, getUnreadNotificationCount,
 *         markNotificationAsRead, markAllNotificationsAsRead, deleteNotification,
 *         notifyTaskAssigned
 */

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
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
  createNotification,
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  notifyTaskAssigned,
} from '@/app/actions/notifications';

// ---- Helpers ----

const USER_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const WS_ID = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const NOTIF_ID = 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const AUTH_USER = { id: USER_ID, email: 'user@test.com' };

function buildChain(
  resolvedData: { data: unknown; error: unknown; count?: number | null } = {
    data: null,
    error: null,
  }
) {
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
});

// ---- Tests ----

describe('createNotification', () => {
  it('creates notification successfully', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));
    const result = await createNotification(USER_ID, WS_ID, 'task_assigned', 'Test Title');
    expect(result.success).toBe(true);
  });

  it('returns error on DB failure', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'Insert failed' } }));
    const result = await createNotification(USER_ID, WS_ID, 'task_assigned', 'Test Title');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Insert failed');
  });

  it('creates notification with optional fields', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));
    const result = await createNotification(
      USER_ID,
      WS_ID,
      'comment_added',
      'Comment',
      'Someone commented',
      '/hub',
      { issue_id: NOTIF_ID }
    );
    expect(result.success).toBe(true);
  });
});

describe('getNotifications', () => {
  it('returns empty array when not authenticated', async () => {
    mockAuth(null);
    const result = await getNotifications(WS_ID);
    expect(result).toEqual([]);
  });

  it('returns notifications list', async () => {
    const mockNotifs = [
      { id: NOTIF_ID, type: 'task_assigned', title: 'Task assigned', is_read: false },
    ];
    supabase.from.mockReturnValue(buildChain({ data: mockNotifs, error: null }));
    const result = await getNotifications(WS_ID);
    expect(result).toHaveLength(1);
  });

  it('returns empty array on DB error', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'DB error' } }));
    const result = await getNotifications(WS_ID);
    expect(result).toEqual([]);
  });

  it('returns empty array when data is null', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));
    const result = await getNotifications(WS_ID);
    expect(result).toEqual([]);
  });
});

describe('getUnreadNotificationCount', () => {
  it('returns 0 when not authenticated', async () => {
    mockAuth(null);
    const result = await getUnreadNotificationCount(WS_ID);
    expect(result).toBe(0);
  });

  it('returns count of unread notifications', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: null, count: 5 }));
    const result = await getUnreadNotificationCount(WS_ID);
    expect(result).toBe(5);
  });

  it('returns 0 on DB error', async () => {
    supabase.from.mockReturnValue(
      buildChain({ data: null, error: { message: 'DB error' }, count: null })
    );
    const result = await getUnreadNotificationCount(WS_ID);
    expect(result).toBe(0);
  });

  it('returns 0 when count is null', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: null, count: null }));
    const result = await getUnreadNotificationCount(WS_ID);
    expect(result).toBe(0);
  });
});

describe('markNotificationAsRead', () => {
  it('returns error when not authenticated', async () => {
    mockAuth(null);
    const result = await markNotificationAsRead(NOTIF_ID);
    expect(result.success).toBe(false);
    expect(result.error).toContain('authenticated');
  });

  it('marks notification as read successfully', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));
    const result = await markNotificationAsRead(NOTIF_ID);
    expect(result.success).toBe(true);
  });

  it('returns error on DB failure', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'Update failed' } }));
    const result = await markNotificationAsRead(NOTIF_ID);
    expect(result.success).toBe(false);
  });
});

describe('markAllNotificationsAsRead', () => {
  it('returns error when not authenticated', async () => {
    mockAuth(null);
    const result = await markAllNotificationsAsRead(WS_ID);
    expect(result.success).toBe(false);
    expect(result.error).toContain('authenticated');
  });

  it('marks all notifications as read successfully', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));
    const result = await markAllNotificationsAsRead(WS_ID);
    expect(result.success).toBe(true);
  });

  it('returns error on DB failure', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'Update failed' } }));
    const result = await markAllNotificationsAsRead(WS_ID);
    expect(result.success).toBe(false);
  });
});

describe('deleteNotification', () => {
  it('returns error when not authenticated', async () => {
    mockAuth(null);
    const result = await deleteNotification(NOTIF_ID);
    expect(result.success).toBe(false);
    expect(result.error).toContain('authenticated');
  });

  it('deletes notification successfully', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));
    const result = await deleteNotification(NOTIF_ID);
    expect(result.success).toBe(true);
  });

  it('returns error on DB failure', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'Delete failed' } }));
    const result = await deleteNotification(NOTIF_ID);
    expect(result.success).toBe(false);
  });
});

describe('notifyTaskAssigned', () => {
  it('does nothing when no assignee IDs provided', async () => {
    // No DB calls should be made for empty assignees
    await notifyTaskAssigned(NOTIF_ID, 'Test Task', [], WS_ID, 'Fawzi');
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('inserts notifications for assignees', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));
    await notifyTaskAssigned(NOTIF_ID, 'Test Task', [USER_ID], WS_ID, 'Fawzi');
    expect(supabase.from).toHaveBeenCalled();
  });
});
