import { createAdminClient, createClient } from '@/lib/supabase/server';
import { isStaffOnProject } from '@/lib/auth/is-staff-on-project';
import { isUserAdmin } from '@/app/actions/shared';
import { createRequestComment, getRequestComments } from '@/app/actions/request-comments';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createAdminClient: jest.fn(),
}));

jest.mock('@/app/actions/shared', () => ({
  isUserAdmin: jest.fn(),
}));

jest.mock('@/lib/auth/is-staff-on-project', () => ({
  isStaffOnProject: jest.fn(),
}));

jest.mock('@/lib/email', () => ({
  notifyEmployeesOfClientComment: jest.fn(),
  notifyAdminAndAssignedOfClientActivity: jest.fn(),
}));

const USER_ID = '11111111-1111-4111-8111-111111111111';
const REQUEST_ID = '22222222-2222-4222-8222-222222222222';
const PROJECT_ID = '33333333-3333-4333-8333-333333333333';

type QueryResult = { data: unknown; error: unknown };

function chain(result: QueryResult) {
  const query: Record<string, jest.Mock> = {};
  for (const method of ['select', 'eq', 'insert']) {
    query[method] = jest.fn(() => query);
  }
  query.single = jest.fn(async () => result);
  query.order = jest.fn(async () => result);
  return query;
}

function mockClient(from: jest.Mock) {
  return {
    auth: {
      getUser: jest.fn(async () => ({
        data: { user: { id: USER_ID, email: 'employee@example.com' } },
      })),
    },
    from,
  };
}

describe('request comment actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (isUserAdmin as jest.Mock).mockResolvedValue(false);
    (isStaffOnProject as jest.Mock).mockResolvedValue(true);
  });

  it('loads comments for project staff even when request RLS would not expose the request row', async () => {
    const requestQuery = chain({
      data: {
        client_id: 'client-user',
        project_id: PROJECT_ID,
        title: 'Project request',
      },
      error: null,
    });
    const commentsQuery = chain({
      data: [
        {
          id: 'comment-1',
          request_id: REQUEST_ID,
          author_id: 'client-user',
          content: 'Please review this',
          created_at: '2026-05-22T12:00:00.000Z',
          author: [
            {
              id: 'client-user',
              full_name: 'Client',
              avatar_url: null,
              email: null,
              role: 'client',
            },
          ],
        },
      ],
      error: null,
    });
    const profileQuery = chain({ data: { role: 'employee' }, error: null });

    const userFrom = jest.fn((table: string) => {
      if (table === 'profiles') return profileQuery;
      throw new Error(`Unexpected user table: ${table}`);
    });
    const adminFrom = jest.fn((table: string) => {
      if (table === 'client_feature_requests') return requestQuery;
      if (table === 'request_comments') return commentsQuery;
      throw new Error(`Unexpected admin table: ${table}`);
    });

    (createClient as jest.Mock).mockResolvedValue(mockClient(userFrom));
    (createAdminClient as jest.Mock).mockReturnValue({ from: adminFrom });

    const result = await getRequestComments(REQUEST_ID);

    expect(result.success).toBe(true);
    expect(adminFrom).toHaveBeenCalledWith('client_feature_requests');
    expect(adminFrom).toHaveBeenCalledWith('request_comments');
    expect(userFrom).not.toHaveBeenCalledWith('client_feature_requests');
    expect(isStaffOnProject).toHaveBeenCalledWith(USER_ID, PROJECT_ID);
  });

  it('creates comments for project staff after app-layer project access succeeds', async () => {
    const requestQuery = chain({
      data: {
        client_id: 'client-user',
        project_id: PROJECT_ID,
        title: 'Project request',
      },
      error: null,
    });
    const profileQuery = chain({ data: { role: 'employee' }, error: null });
    const insertQuery = chain({
      data: {
        id: 'comment-1',
        request_id: REQUEST_ID,
        author_id: USER_ID,
        content: 'I am checking this.',
        created_at: '2026-05-22T12:00:00.000Z',
        author: [
          { id: USER_ID, full_name: 'Employee', avatar_url: null, email: null, role: 'employee' },
        ],
      },
      error: null,
    });

    const userFrom = jest.fn((table: string) => {
      if (table === 'profiles') return profileQuery;
      if (table === 'request_comments') return insertQuery;
      throw new Error(`Unexpected user table: ${table}`);
    });
    const adminFrom = jest.fn((table: string) => {
      if (table === 'client_feature_requests') return requestQuery;
      throw new Error(`Unexpected admin table: ${table}`);
    });

    (createClient as jest.Mock).mockResolvedValue(mockClient(userFrom));
    (createAdminClient as jest.Mock).mockReturnValue({ from: adminFrom });

    const result = await createRequestComment(REQUEST_ID, 'I am checking this.');

    expect(result.success).toBe(true);
    expect(adminFrom).toHaveBeenCalledWith('client_feature_requests');
    expect(userFrom).not.toHaveBeenCalledWith('client_feature_requests');
    expect(insertQuery.insert).toHaveBeenCalledWith({
      request_id: REQUEST_ID,
      author_id: USER_ID,
      content: 'I am checking this.',
    });
    expect(isStaffOnProject).toHaveBeenCalledWith(USER_ID, PROJECT_ID);
  });
});
