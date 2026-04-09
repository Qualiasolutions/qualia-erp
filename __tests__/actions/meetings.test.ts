export {};

/**
 * Tests for app/actions/meetings.ts
 * Covers: getMeetings, createMeeting, updateMeeting, deleteMeeting,
 *         createInstantMeeting, updateMeetingLink, addMeetingAttendee, removeMeetingAttendee
 */

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('@/lib/email', () => ({
  notifyMeetingCreated: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/app/actions/workspace', () => ({
  getCurrentWorkspaceId: jest.fn().mockResolvedValue('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
}));

jest.mock('@/app/actions/shared', () => ({
  canDeleteMeeting: jest.fn().mockResolvedValue(true),
  createActivity: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/app/actions/clients', () => ({
  logClientActivity: jest.fn().mockResolvedValue({ success: true }),
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
  getMeetings,
  createMeeting,
  updateMeeting,
  deleteMeeting,
  createInstantMeeting,
  updateMeetingLink,
  addMeetingAttendee,
  removeMeetingAttendee,
} from '@/app/actions/meetings';
import { canDeleteMeeting } from '@/app/actions/shared';

// ---- Helpers ----

const AUTH_USER = { id: 'user-id-1', email: 'user@test.com' };

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
    'lt',
    'lte',
    'like',
    'ilike',
    'contains',
    'containedBy',
    'range',
    'overlaps',
    'match',
    'or',
    'filter',
    'order',
    'limit',
    'single',
    'maybeSingle',
    'upsert',
    'getAll',
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
  // Re-set mocks cleared by clearAllMocks
  const { canDeleteMeeting: mockCanDelete, createActivity: mockCreateActivity } =
    jest.requireMock('@/app/actions/shared');
  (mockCanDelete as jest.Mock).mockResolvedValue(true);
  (mockCreateActivity as jest.Mock).mockResolvedValue(undefined);
  const { logClientActivity: mockLogActivity } = jest.requireMock('@/app/actions/clients');
  (mockLogActivity as jest.Mock).mockResolvedValue({ success: true });
  const { notifyMeetingCreated: mockNotify } = jest.requireMock('@/lib/email');
  (mockNotify as jest.Mock).mockResolvedValue(undefined);
  const { getCurrentWorkspaceId: mockGetWs } = jest.requireMock('@/app/actions/workspace');
  (mockGetWs as jest.Mock).mockResolvedValue('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
});

// ---- Tests ----

describe('getMeetings', () => {
  it('returns normalized meeting list', async () => {
    const mockMeetings = [
      {
        id: '835d99bd-97d5-454b-b86e-b52afb106525',
        title: 'Sprint Review',
        start_time: '2024-01-15T10:00:00Z',
        end_time: '2024-01-15T11:00:00Z',
        project: { id: 'p1', name: 'Project' },
        client: null,
        creator: { id: 'user-1', full_name: 'Fawzi', email: 'f@q.com' },
        attendees: [],
      },
    ];
    supabase.from.mockReturnValue(buildChain({ data: mockMeetings, error: null }));

    const result = await getMeetings();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('835d99bd-97d5-454b-b86e-b52afb106525');
  });

  it('returns empty array on DB error', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'DB error' } }));
    const result = await getMeetings();
    expect(result).toEqual([]);
  });

  it('normalizes FK array fields to single objects', async () => {
    const mockMeetings = [
      {
        id: '835d99bd-97d5-454b-b86e-b52afb106525',
        title: 'Test',
        start_time: '2024-01-01T10:00:00Z',
        end_time: '2024-01-01T11:00:00Z',
        project: [{ id: 'p1', name: 'Project' }],
        client: [{ id: 'c1', display_name: 'Corp', lead_status: 'hot' }],
        creator: [{ id: 'user-1', full_name: 'Fawzi', email: 'f@q.com' }],
        attendees: [
          { id: 'att-1', profile: [{ id: 'user-2', full_name: 'Hasan', email: 'h@q.com' }] },
        ],
      },
    ];
    supabase.from.mockReturnValue(buildChain({ data: mockMeetings, error: null }));
    const result = await getMeetings();
    expect(Array.isArray(result[0].project)).toBe(false);
    expect(Array.isArray(result[0].client)).toBe(false);
    expect(Array.isArray(result[0].creator)).toBe(false);
  });
});

describe('createMeeting', () => {
  it('returns error when not authenticated', async () => {
    mockAuth(null);
    const formData = new FormData();
    const result = await createMeeting(formData);
    expect(result.success).toBe(false);
    expect(result.error).toContain('authenticated');
  });

  it('returns error on validation failure (missing required fields)', async () => {
    const formData = new FormData();
    // Missing title, start_time, end_time
    const result = await createMeeting(formData);
    expect(result.success).toBe(false);
  });

  it('returns success on valid meeting creation', async () => {
    const newMeeting = { id: 'meeting-new', title: 'Client Call' };
    supabase.from.mockReturnValue(buildChain({ data: newMeeting, error: null }));

    const formData = new FormData();
    formData.set('title', 'Client Call');
    formData.set('start_time', '2024-06-01T10:00:00Z');
    formData.set('end_time', '2024-06-01T11:00:00Z');
    formData.set('workspace_id', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

    const result = await createMeeting(formData);
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ id: 'meeting-new' });
  });

  it('returns error on DB insert failure', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'Insert failed' } }));

    const formData = new FormData();
    formData.set('title', 'Call');
    formData.set('start_time', '2024-06-01T10:00:00Z');
    formData.set('end_time', '2024-06-01T11:00:00Z');

    const result = await createMeeting(formData);
    expect(result.success).toBe(false);
  });
});

describe('updateMeeting', () => {
  it('returns error when not authenticated', async () => {
    mockAuth(null);
    const result = await updateMeeting({ id: '835d99bd-97d5-454b-b86e-b52afb106525' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('authenticated');
  });

  it('returns error when user lacks permission', async () => {
    (canDeleteMeeting as jest.Mock).mockResolvedValueOnce(false);
    const result = await updateMeeting({
      id: '835d99bd-97d5-454b-b86e-b52afb106525',
      title: 'New Title',
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('permission');
  });

  it('returns success on valid update', async () => {
    const updatedMeeting = { id: '835d99bd-97d5-454b-b86e-b52afb106525', title: 'Updated' };
    supabase.from.mockReturnValue(buildChain({ data: updatedMeeting, error: null }));

    const result = await updateMeeting({
      id: '835d99bd-97d5-454b-b86e-b52afb106525',
      title: 'Updated',
    });
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ id: '835d99bd-97d5-454b-b86e-b52afb106525' });
  });

  it('returns error on DB update failure', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'Update failed' } }));
    const result = await updateMeeting({
      id: '835d99bd-97d5-454b-b86e-b52afb106525',
      title: 'Updated',
    });
    expect(result.success).toBe(false);
  });
});

describe('deleteMeeting', () => {
  it('returns error when not authenticated', async () => {
    mockAuth(null);
    const result = await deleteMeeting('835d99bd-97d5-454b-b86e-b52afb106525');
    expect(result.success).toBe(false);
    expect(result.error).toContain('authenticated');
  });

  it('returns error when user lacks permission', async () => {
    (canDeleteMeeting as jest.Mock).mockResolvedValueOnce(false);
    const result = await deleteMeeting('835d99bd-97d5-454b-b86e-b52afb106525');
    expect(result.success).toBe(false);
    expect(result.error).toContain('permission');
  });

  it('returns success on valid delete', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));
    const result = await deleteMeeting('835d99bd-97d5-454b-b86e-b52afb106525');
    expect(result.success).toBe(true);
  });

  it('returns error on DB delete failure', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'Delete failed' } }));
    const result = await deleteMeeting('835d99bd-97d5-454b-b86e-b52afb106525');
    expect(result.success).toBe(false);
  });
});

describe('createInstantMeeting', () => {
  it('returns error when not authenticated', async () => {
    mockAuth(null);
    const result = await createInstantMeeting();
    expect(result.success).toBe(false);
    expect(result.error).toContain('authenticated');
  });

  it('creates a meeting with auto-generated title', async () => {
    const newMeeting = { id: 'instant-1', title: 'Quick Meeting' };
    supabase.from.mockReturnValue(buildChain({ data: newMeeting, error: null }));

    const result = await createInstantMeeting();
    expect(result.success).toBe(true);
  });

  it('creates a meeting with a custom title', async () => {
    const newMeeting = { id: 'instant-2', title: 'My Custom Meeting' };
    supabase.from.mockReturnValue(buildChain({ data: newMeeting, error: null }));

    const result = await createInstantMeeting('My Custom Meeting');
    expect(result.success).toBe(true);
  });
});

describe('updateMeetingLink', () => {
  it('returns error when not authenticated', async () => {
    mockAuth(null);
    const result = await updateMeetingLink(
      '835d99bd-97d5-454b-b86e-b52afb106525',
      'https://meet.google.com/abc'
    );
    expect(result.success).toBe(false);
  });

  it('updates meeting link successfully', async () => {
    const updated = {
      id: '835d99bd-97d5-454b-b86e-b52afb106525',
      meeting_link: 'https://meet.google.com/abc',
    };
    supabase.from.mockReturnValue(buildChain({ data: updated, error: null }));

    const result = await updateMeetingLink(
      '835d99bd-97d5-454b-b86e-b52afb106525',
      'https://meet.google.com/abc'
    );
    expect(result.success).toBe(true);
  });
});

describe('addMeetingAttendee', () => {
  it('returns error when not authenticated', async () => {
    mockAuth(null);
    const result = await addMeetingAttendee('835d99bd-97d5-454b-b86e-b52afb106525', 'profile-1');
    expect(result.success).toBe(false);
  });

  it('adds attendee successfully', async () => {
    const attendee = {
      id: 'att-1',
      meeting_id: '835d99bd-97d5-454b-b86e-b52afb106525',
      profile_id: 'profile-1',
    };
    supabase.from.mockReturnValue(buildChain({ data: attendee, error: null }));

    const result = await addMeetingAttendee('835d99bd-97d5-454b-b86e-b52afb106525', 'profile-1');
    expect(result.success).toBe(true);
  });
});

describe('removeMeetingAttendee', () => {
  it('returns error when not authenticated', async () => {
    mockAuth(null);
    const result = await removeMeetingAttendee('835d99bd-97d5-454b-b86e-b52afb106525', 'profile-1');
    expect(result.success).toBe(false);
  });

  it('removes attendee successfully', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));
    const result = await removeMeetingAttendee('835d99bd-97d5-454b-b86e-b52afb106525', 'profile-1');
    expect(result.success).toBe(true);
  });

  it('returns error on DB failure', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'Delete failed' } }));
    const result = await removeMeetingAttendee('835d99bd-97d5-454b-b86e-b52afb106525', 'profile-1');
    expect(result.success).toBe(false);
  });
});
