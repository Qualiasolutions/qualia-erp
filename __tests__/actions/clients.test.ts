export {};

/**
 * Tests for app/actions/clients.ts
 * Covers: getClients, getClientById, createClientRecord, updateClientRecord,
 *         deleteClientRecord, toggleClientStatus, logClientActivity
 */

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('@/lib/email', () => ({
  notifyClientCreated: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/app/actions/workspace', () => ({
  getCurrentWorkspaceId: jest.fn().mockResolvedValue('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
}));

jest.mock('@/app/actions/shared', () => ({
  canDeleteClient: jest.fn().mockResolvedValue(true),
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
  getClients,
  getClientById,
  createClientRecord,
  updateClientRecord,
  deleteClientRecord,
  toggleClientStatus,
} from '@/app/actions/clients';
import { canDeleteClient } from '@/app/actions/shared';

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
    'order',
    'limit',
    'single',
    'maybeSingle',
    'upsert',
    'ilike',
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
  const { canDeleteClient: mockCanDelete } = jest.requireMock('@/app/actions/shared');
  (mockCanDelete as jest.Mock).mockResolvedValue(true);
  const { getCurrentWorkspaceId: mockGetWs } = jest.requireMock('@/app/actions/workspace');
  (mockGetWs as jest.Mock).mockResolvedValue('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
  const { notifyClientCreated: mockNotify } = jest.requireMock('@/lib/email');
  (mockNotify as jest.Mock).mockResolvedValue(undefined);
});

// ---- Tests ----

describe('getClients', () => {
  it('returns normalized client list on success', async () => {
    const mockClients = [
      {
        id: 'client-1',
        display_name: 'ACME Corp',
        creator: { id: 'user-1', full_name: 'Fawzi', email: 'f@q.com' },
        assigned: null,
      },
    ];
    supabase.from.mockReturnValue(buildChain({ data: mockClients, error: null }));

    const result = await getClients();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('client-1');
  });

  it('returns empty array on DB error', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'DB error' } }));
    const result = await getClients();
    expect(result).toEqual([]);
  });

  it('normalizes creator array to single object', async () => {
    const mockClients = [
      {
        id: 'client-1',
        display_name: 'Test',
        creator: [{ id: 'user-1', full_name: 'Name', email: 'a@b.com' }],
        assigned: null,
      },
    ];
    supabase.from.mockReturnValue(buildChain({ data: mockClients, error: null }));
    const result = await getClients();
    expect(Array.isArray(result[0].creator)).toBe(false);
    expect((result[0].creator as { id: string })?.id).toBe('user-1');
  });
});

describe('getClientById', () => {
  it('returns client with normalized relations', async () => {
    const mockClient = {
      id: 'client-1',
      display_name: 'Test Client',
      creator: { id: 'user-1', full_name: 'Fawzi', email: 'f@q.com' },
      assigned: null,
      contacts: [],
      activities: [],
    };
    supabase.from.mockReturnValue(buildChain({ data: mockClient, error: null }));

    const result = await getClientById('client-1');
    expect(result?.id).toBe('client-1');
  });

  it('returns null on DB error', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'Not found' } }));
    const result = await getClientById('non-existent');
    expect(result).toBeNull();
  });

  it('normalizes activity created_by arrays', async () => {
    const mockClient = {
      id: 'client-1',
      display_name: 'Test',
      creator: null,
      assigned: null,
      contacts: [],
      activities: [
        {
          id: 'act-1',
          type: 'note',
          description: 'Note',
          metadata: {},
          created_at: '2024-01-01T00:00:00Z',
          created_by: [{ id: 'user-1', full_name: 'Fawzi', email: 'f@q.com' }],
        },
      ],
    };
    supabase.from.mockReturnValue(buildChain({ data: mockClient, error: null }));
    const result = await getClientById('client-1');
    // activities[0].created_by should be normalized to object, not array
    expect(Array.isArray(result?.activities[0].created_by)).toBe(false);
  });
});

describe('createClientRecord', () => {
  it('returns error when not authenticated', async () => {
    mockAuth(null);
    const formData = new FormData();
    const result = await createClientRecord(formData);
    expect(result.success).toBe(false);
    expect(result.error).toContain('authenticated');
  });

  it('returns error on validation failure (missing required fields)', async () => {
    const formData = new FormData();
    // Missing display_name
    const result = await createClientRecord(formData);
    expect(result.success).toBe(false);
  });

  it('returns success on valid input', async () => {
    const newClient = { id: 'new-client-1', display_name: 'New Corp' };
    supabase.from.mockReturnValue(buildChain({ data: newClient, error: null }));

    const formData = new FormData();
    formData.set('display_name', 'New Corp');
    formData.set('lead_status', 'hot');
    formData.set('workspace_id', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

    const result = await createClientRecord(formData);
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ id: 'new-client-1' });
  });

  it('returns error on DB insert failure', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'Insert failed' } }));

    const formData = new FormData();
    formData.set('display_name', 'Corp');
    formData.set('lead_status', 'cold');
    formData.set('workspace_id', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

    const result = await createClientRecord(formData);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Insert failed');
  });
});

describe('updateClientRecord', () => {
  it('returns error when not authenticated', async () => {
    mockAuth(null);
    const formData = new FormData();
    const result = await updateClientRecord(formData);
    expect(result.success).toBe(false);
    expect(result.error).toContain('authenticated');
  });

  it('returns error on validation failure', async () => {
    const formData = new FormData();
    // Missing id
    const result = await updateClientRecord(formData);
    expect(result.success).toBe(false);
  });

  it('returns success on valid update', async () => {
    const CLIENT_UUID = '625935ca-5525-4449-a67b-0893dea291b7';
    const updatedClient = { id: CLIENT_UUID, display_name: 'Updated Corp' };
    // First call: get old status; second call: perform update
    supabase.from
      .mockReturnValueOnce(buildChain({ data: { lead_status: 'cold' }, error: null }))
      .mockReturnValue(buildChain({ data: updatedClient, error: null }));

    const formData = new FormData();
    formData.set('id', CLIENT_UUID);
    formData.set('display_name', 'Updated Corp');

    const result = await updateClientRecord(formData);
    expect(result.success).toBe(true);
  });
});

describe('deleteClientRecord', () => {
  it('returns error when not authenticated', async () => {
    mockAuth(null);
    const result = await deleteClientRecord('client-1');
    expect(result.success).toBe(false);
    expect(result.error).toContain('authenticated');
  });

  it('returns error when user lacks permission', async () => {
    (canDeleteClient as jest.Mock).mockResolvedValueOnce(false);
    const result = await deleteClientRecord('client-1');
    expect(result.success).toBe(false);
    expect(result.error).toContain('permission');
  });

  it('returns success on valid delete', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));
    const result = await deleteClientRecord('client-1');
    expect(result.success).toBe(true);
  });

  it('returns error on DB delete failure', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'Delete failed' } }));
    const result = await deleteClientRecord('client-1');
    expect(result.success).toBe(false);
  });
});

describe('toggleClientStatus', () => {
  it('returns error when not authenticated', async () => {
    mockAuth(null);
    const result = await toggleClientStatus('client-1', 'hot');
    expect(result.success).toBe(false);
    expect(result.error).toContain('authenticated');
  });

  it('returns error when client not found', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));
    const result = await toggleClientStatus('non-existent', 'hot');
    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });

  it('returns success and updates lead status', async () => {
    const currentClient = { lead_status: 'cold', display_name: 'Corp' };
    // 1st: get current status, 2nd: update status, then logClientActivity calls
    supabase.from
      .mockReturnValueOnce(buildChain({ data: currentClient, error: null }))
      .mockReturnValue(buildChain({ data: null, error: null }));

    const result = await toggleClientStatus('client-1', 'hot');
    expect(result.success).toBe(true);
  });
});
