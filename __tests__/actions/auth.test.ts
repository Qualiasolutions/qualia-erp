export {};

/**
 * Tests for app/actions/auth.ts
 * Covers: loginAction, signupWithInvitationAction, getAdminStatus, getProfiles
 */

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

const supabase = {
  from: jest.fn() as jest.Mock,
  auth: {
    getUser: jest.fn() as jest.Mock,
    signInWithPassword: jest.fn() as jest.Mock,
    signUp: jest.fn() as jest.Mock,
  },
};

const adminClient = {
  from: jest.fn() as jest.Mock,
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve(supabase),
  createAdminClient: () => adminClient,
}));

jest.mock('@/app/actions/client-invitations', () => ({
  getInvitationByToken: jest.fn(),
  markInvitationAccepted: jest.fn(),
}));

jest.mock('@/app/actions/workspace', () => ({
  getCurrentWorkspaceId: jest.fn().mockResolvedValue('ws-id-1'),
}));

// ---- Imports ----
import {
  loginAction,
  signupWithInvitationAction,
  getAdminStatus,
  getProfiles,
} from '@/app/actions/auth';
import { getInvitationByToken, markInvitationAccepted } from '@/app/actions/client-invitations';

// ---- Helpers ----

const USER_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
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
  Object.values(chain).forEach((fn) => fn.mockReturnValue(promised));
  return chain;
}

function mockAuth(user: typeof AUTH_USER | null = AUTH_USER) {
  supabase.auth.getUser.mockResolvedValue({ data: { user }, error: null });
}

function makeFormData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.append(k, v);
  return fd;
}

const prevState = { success: false, error: null };
const prevStateSignup = { success: false, error: null, projectId: undefined };

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth();
});

// ---- Tests ----

describe('loginAction', () => {
  it('logs in successfully with valid credentials', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({ data: {}, error: null });
    const result = await loginAction(
      prevState,
      makeFormData({ email: 'a@b.com', password: 'pass123' })
    );
    expect(result.success).toBe(true);
    expect(result.error).toBeNull();
  });

  it('returns error when email is missing', async () => {
    const result = await loginAction(prevState, makeFormData({ password: 'pass123' }));
    expect(result.success).toBe(false);
    expect(result.error).toContain('required');
  });

  it('returns error when password is missing', async () => {
    const result = await loginAction(prevState, makeFormData({ email: 'a@b.com' }));
    expect(result.success).toBe(false);
    expect(result.error).toContain('required');
  });

  it('returns error on auth failure', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: {},
      error: { message: 'Invalid login credentials' },
    });
    const result = await loginAction(
      prevState,
      makeFormData({ email: 'a@b.com', password: 'wrong' })
    );
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid login credentials');
  });
});

describe('getAdminStatus', () => {
  it('returns admin status for admin user', async () => {
    supabase.from.mockReturnValue(
      buildChain({ data: { role: 'admin', email: 'admin@test.com' }, error: null })
    );
    const result = await getAdminStatus();
    expect(result.isAdmin).toBe(true);
    expect(result.userId).toBe(USER_ID);
  });

  it('returns super admin for info@qualiasolutions.net', async () => {
    supabase.from.mockReturnValue(
      buildChain({ data: { role: 'admin', email: 'info@qualiasolutions.net' }, error: null })
    );
    const result = await getAdminStatus();
    expect(result.isAdmin).toBe(true);
    expect(result.isSuperAdmin).toBe(true);
  });

  it('returns non-admin for employee role', async () => {
    supabase.from.mockReturnValue(
      buildChain({ data: { role: 'employee', email: 'emp@test.com' }, error: null })
    );
    const result = await getAdminStatus();
    expect(result.isAdmin).toBe(false);
    expect(result.isSuperAdmin).toBe(false);
    expect(result.userId).toBe(USER_ID);
  });

  it('returns unauthenticated defaults when no user', async () => {
    mockAuth(null);
    const result = await getAdminStatus();
    expect(result.isAdmin).toBe(false);
    expect(result.userId).toBeNull();
    expect(result.email).toBeNull();
  });
});

describe('getProfiles', () => {
  it('returns workspace member profiles and filters out clients', async () => {
    const members = [
      {
        profile: {
          id: '1',
          full_name: 'Alice',
          email: 'a@t.com',
          avatar_url: null,
          role: 'employee',
        },
      },
      {
        profile: { id: '2', full_name: 'Bob', email: 'b@t.com', avatar_url: null, role: 'client' },
      },
    ];
    supabase.from.mockReturnValue(buildChain({ data: members, error: null }));
    const result = await getProfiles('ws-id-1');
    expect(result).toHaveLength(1);
    expect(result[0].full_name).toBe('Alice');
  });

  it('auto-resolves workspace when not provided', async () => {
    const members = [
      {
        profile: { id: '1', full_name: 'Alice', email: 'a@t.com', avatar_url: null, role: 'admin' },
      },
    ];
    supabase.from.mockReturnValue(buildChain({ data: members, error: null }));
    const result = await getProfiles();
    expect(result).toHaveLength(1);
  });

  it('handles FK array normalization for profile field', async () => {
    const members = [
      {
        profile: [
          { id: '1', full_name: 'Alice', email: 'a@t.com', avatar_url: null, role: 'admin' },
        ],
      },
    ];
    supabase.from.mockReturnValue(buildChain({ data: members, error: null }));
    const result = await getProfiles('ws-id-1');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('returns empty array when no members found', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));
    const result = await getProfiles('ws-id-1');
    expect(result).toEqual([]);
  });
});

describe('signupWithInvitationAction', () => {
  const validForm = {
    email: 'client@test.com',
    password: 'securepass',
    fullName: 'Test Client',
    invitationToken: 'valid-token-12345',
  };

  const mockInvitation = {
    id: 'inv-1',
    email: 'client@test.com',
    project_id: 'proj-1',
    project_name: 'Test Project',
    invited_by: USER_ID,
  };

  it('signs up successfully with valid invitation', async () => {
    (getInvitationByToken as jest.Mock).mockResolvedValue({ invitation: mockInvitation });
    supabase.auth.signUp.mockResolvedValue({ data: { user: { id: 'new-user-id' } }, error: null });
    adminClient.from.mockReturnValue(buildChain({ data: null, error: null }));
    (markInvitationAccepted as jest.Mock).mockResolvedValue({ success: true });

    const result = await signupWithInvitationAction(prevStateSignup, makeFormData(validForm));
    expect(result.success).toBe(true);
    expect(result.projectId).toBe('proj-1');
  });

  it('returns error for invalid token', async () => {
    (getInvitationByToken as jest.Mock).mockResolvedValue({ error: 'Token expired' });
    const result = await signupWithInvitationAction(prevStateSignup, makeFormData(validForm));
    expect(result.success).toBe(false);
    expect(result.error).toContain('expired');
  });

  it('returns error when email does not match invitation', async () => {
    (getInvitationByToken as jest.Mock).mockResolvedValue({ invitation: mockInvitation });
    const form = { ...validForm, email: 'wrong@test.com' };
    const result = await signupWithInvitationAction(prevStateSignup, makeFormData(form));
    expect(result.success).toBe(false);
    expect(result.error).toContain('does not match');
  });

  it('returns error when required fields are missing', async () => {
    const result = await signupWithInvitationAction(
      prevStateSignup,
      makeFormData({ email: 'a@b.com' })
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain('required');
  });

  it('returns error when profile creation fails', async () => {
    (getInvitationByToken as jest.Mock).mockResolvedValue({ invitation: mockInvitation });
    supabase.auth.signUp.mockResolvedValue({ data: { user: { id: 'new-user-id' } }, error: null });
    adminClient.from.mockReturnValueOnce(
      buildChain({ data: null, error: { message: 'Duplicate key' } })
    );

    const result = await signupWithInvitationAction(prevStateSignup, makeFormData(validForm));
    expect(result.success).toBe(false);
    expect(result.error).toContain('profile');
  });
});
