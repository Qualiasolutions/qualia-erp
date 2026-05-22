const USER_ID = '4fcff947-9839-4b1a-9962-f9528d4c084b';
const OTHER_EMPLOYEE_ID = '59bb6537-634a-4b31-8ce7-a0947a6492ee';
const REQUEST_ID = '22de310b-266a-4c22-9d6f-8f2639486008';
const CLIENT_ID = 'e96c6d20-c99c-4577-9d75-152cd27bf2e4';
const PROJECT_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createAdminClient: jest.fn(),
}));

jest.mock('@/app/actions/shared', () => ({
  isUserAdmin: jest.fn(),
}));

jest.mock('@/lib/portal-utils', () => ({
  assertNotImpersonating: jest.fn(async () => ({ ok: true })),
}));

jest.mock('@/lib/email', () => ({
  notifyAdminAndAssignedOfClientActivity: jest.fn(),
  sendRequestCompletedEmail: jest.fn(async () => undefined),
}));

jest.mock('@/lib/notifications', () => ({
  notifyAdminsAndAssignedEmployees: jest.fn(),
}));

jest.mock('@/lib/auth/is-staff-on-project', () => ({
  getEmployeeProjectIds: jest.fn(async () => []),
  isStaffOnProject: jest.fn(async () => false),
}));

function buildChain(
  terminals: {
    maybeSingle?: unknown;
    single?: unknown;
    insert?: unknown;
  } = {}
) {
  const chain = {
    select: jest.fn(),
    update: jest.fn(),
    insert: jest.fn(),
    eq: jest.fn(),
    maybeSingle: jest.fn(),
    single: jest.fn(),
  };

  chain.select.mockReturnValue(chain);
  chain.update.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.insert.mockResolvedValue(terminals.insert ?? { data: null, error: null });
  chain.maybeSingle.mockResolvedValue(terminals.maybeSingle ?? { data: null, error: null });
  chain.single.mockResolvedValue(terminals.single ?? { data: null, error: null });

  return chain;
}

function requestRow(assignedTo: string | null) {
  return {
    id: REQUEST_ID,
    title: 'Improve booking flow',
    status: 'pending',
    project_id: PROJECT_ID,
    client_id: CLIENT_ID,
    assigned_to: assignedTo,
  };
}

function setupMarkDoneMocks(assignedTo: string | null) {
  const roleChain = buildChain({
    single: { data: { role: 'employee' }, error: null },
  });
  const staffProfileChain = buildChain({
    single: { data: { full_name: 'Assigned Owner' }, error: null },
  });
  const requestReadChain = buildChain({
    maybeSingle: { data: requestRow(assignedTo), error: null },
  });
  const clientProfileChain = buildChain({
    maybeSingle: { data: { email: 'client@example.com', full_name: 'Client User' }, error: null },
  });
  const updateChain = buildChain({
    single: { data: { id: REQUEST_ID }, error: null },
  });
  const commentChain = buildChain();

  let userProfileReads = 0;
  const supabase = {
    auth: {
      getUser: jest.fn(async () => ({
        data: { user: { id: USER_ID, email: 'employee@example.com' } },
        error: null,
      })),
    },
    from: jest.fn((table: string) => {
      if (table === 'profiles') {
        userProfileReads += 1;
        return userProfileReads === 1 ? roleChain : staffProfileChain;
      }
      return buildChain();
    }),
  };

  const adminClient = {
    from: jest.fn((table: string) => {
      if (table === 'client_feature_requests') {
        return adminClient.from.mock.calls.filter(([name]) => name === table).length === 1
          ? requestReadChain
          : updateChain;
      }
      if (table === 'profiles') return clientProfileChain;
      if (table === 'request_comments') return commentChain;
      return buildChain();
    }),
  };

  const { createClient, createAdminClient } = jest.requireMock('@/lib/supabase/server');
  (createClient as jest.Mock).mockResolvedValue(supabase);
  (createAdminClient as jest.Mock).mockReturnValue(adminClient);

  return { updateChain, commentChain };
}

describe('client request actions', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    const { isUserAdmin } = jest.requireMock('@/app/actions/shared');
    (isUserAdmin as jest.Mock).mockResolvedValue(false);
  });

  describe('markFeatureRequestDone', () => {
    it('rejects project staff who are not the assigned request owner', async () => {
      const { markFeatureRequestDone } = await import('@/app/actions/client-requests');
      const { updateChain, commentChain } = setupMarkDoneMocks(OTHER_EMPLOYEE_ID);

      const result = await markFeatureRequestDone(REQUEST_ID);

      expect(result).toEqual({ success: false, error: 'Not authorized' });
      expect(updateChain.update).not.toHaveBeenCalled();
      expect(commentChain.insert).not.toHaveBeenCalled();
    });

    it('lets the assigned owner mark the request done through the service-role write path', async () => {
      const { markFeatureRequestDone } = await import('@/app/actions/client-requests');
      const { sendRequestCompletedEmail } = jest.requireMock('@/lib/email');
      const { updateChain, commentChain } = setupMarkDoneMocks(USER_ID);

      const result = await markFeatureRequestDone(REQUEST_ID);

      expect(result).toEqual({
        success: true,
        data: { id: REQUEST_ID, status: 'completed' },
      });
      expect(updateChain.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'completed' })
      );
      expect(updateChain.eq).toHaveBeenCalledWith('assigned_to', USER_ID);
      expect(commentChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          request_id: REQUEST_ID,
          author_id: USER_ID,
        })
      );
      expect(sendRequestCompletedEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          clientEmail: 'client@example.com',
          requestTitle: 'Improve booking flow',
        })
      );
    });
  });
});
