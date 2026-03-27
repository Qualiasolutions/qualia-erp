/**
 * Shared test utilities for action module tests.
 * Provides a Supabase mock factory with chainable query builder.
 */

export {}; // Force ES module scope to avoid variable collision across test files

// Mock next/cache at module level
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}));

// ============ TYPES ============

export interface MockSupabaseChain {
  select: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  upsert: jest.Mock;
  eq: jest.Mock;
  neq: jest.Mock;
  in: jest.Mock;
  is: jest.Mock;
  ilike: jest.Mock;
  not: jest.Mock;
  gt: jest.Mock;
  gte: jest.Mock;
  lte: jest.Mock;
  order: jest.Mock;
  limit: jest.Mock;
  single: jest.Mock;
  maybeSingle: jest.Mock;
  // Resolved value control
  _resolvedData: { data: unknown; error: unknown };
}

export interface MockSupabaseClient {
  from: jest.Mock;
  auth: {
    getUser: jest.Mock;
  };
  rpc: jest.Mock;
  storage: {
    from: jest.Mock;
  };
  _chain: MockSupabaseChain;
}

// ============ FACTORY ============

/**
 * Creates a chainable Supabase mock where every method returns the same chain.
 * Call `mockSupabaseResponse(data, error)` to set what queries resolve to.
 */
export function createMockSupabaseClient(): MockSupabaseClient {
  const chain: MockSupabaseChain = {
    _resolvedData: { data: null, error: null },
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    upsert: jest.fn(),
    eq: jest.fn(),
    neq: jest.fn(),
    in: jest.fn(),
    is: jest.fn(),
    ilike: jest.fn(),
    not: jest.fn(),
    gt: jest.fn(),
    gte: jest.fn(),
    lte: jest.fn(),
    order: jest.fn(),
    limit: jest.fn(),
    single: jest.fn(),
    maybeSingle: jest.fn(),
  };

  // Make every chain method return the chain itself (for chaining)
  // and resolve to _resolvedData when awaited (Promise-like)
  const makeChainable = (fn: jest.Mock) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    fn.mockImplementation((..._args: unknown[]) => {
      return Object.assign(Promise.resolve(chain._resolvedData), chain);
    });
  };

  makeChainable(chain.select);
  makeChainable(chain.insert);
  makeChainable(chain.update);
  makeChainable(chain.delete);
  makeChainable(chain.upsert);
  makeChainable(chain.eq);
  makeChainable(chain.neq);
  makeChainable(chain.in);
  makeChainable(chain.is);
  makeChainable(chain.ilike);
  makeChainable(chain.not);
  makeChainable(chain.gt);
  makeChainable(chain.gte);
  makeChainable(chain.lte);
  makeChainable(chain.order);
  makeChainable(chain.limit);
  makeChainable(chain.single);
  makeChainable(chain.maybeSingle);

  const mockClient: MockSupabaseClient = {
    from: jest.fn().mockReturnValue(chain),
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@example.com' } },
        error: null,
      }),
    },
    rpc: jest.fn().mockResolvedValue({ data: [], error: null }),
    storage: {
      from: jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({ data: {}, error: null }),
        getPublicUrl: jest
          .fn()
          .mockReturnValue({ data: { publicUrl: 'https://example.com/file' } }),
      }),
    },
    _chain: chain,
  };

  return mockClient;
}

/**
 * Set what the Supabase chain resolves to.
 * Call this before the action you're testing.
 */
export function mockSupabaseResponse(
  client: MockSupabaseClient,
  data: unknown,
  error: unknown = null
) {
  client._chain._resolvedData = { data, error };

  // Re-apply mock implementations so the new resolved data is used
  const chain = client._chain;
  const makeChainable = (fn: jest.Mock) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    fn.mockImplementation((..._args: unknown[]) => {
      return Object.assign(Promise.resolve(chain._resolvedData), chain);
    });
  };

  makeChainable(chain.select);
  makeChainable(chain.insert);
  makeChainable(chain.update);
  makeChainable(chain.delete);
  makeChainable(chain.upsert);
  makeChainable(chain.eq);
  makeChainable(chain.neq);
  makeChainable(chain.in);
  makeChainable(chain.is);
  makeChainable(chain.ilike);
  makeChainable(chain.not);
  makeChainable(chain.gt);
  makeChainable(chain.gte);
  makeChainable(chain.lte);
  makeChainable(chain.order);
  makeChainable(chain.limit);
  makeChainable(chain.single);
  makeChainable(chain.maybeSingle);
}

/**
 * Set the authenticated user for tests.
 */
export function mockAuthUser(
  client: MockSupabaseClient,
  user: { id: string; email: string } | null
) {
  client.auth.getUser.mockResolvedValue({
    data: { user },
    error: null,
  });
}

/**
 * Set up common action mocks — call once per test file at top level.
 * Returns the mock Supabase client for use in individual tests.
 */
export function setupActionMocks() {
  const supabase = createMockSupabaseClient();

  // Mock the server module
  jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn(),
  }));

  return { supabase, mockUser: { id: 'test-user-id', email: 'test@example.com' } };
}

// ============ MOCK DATA FACTORIES ============

export function createMockTask(overrides: Record<string, unknown> = {}) {
  return {
    id: 'task-id-1',
    workspace_id: 'workspace-id-1',
    creator_id: 'test-user-id',
    assignee_id: null,
    project_id: null,
    title: 'Test Task',
    description: null,
    status: 'Todo' as const,
    priority: 'No Priority' as const,
    item_type: 'task' as const,
    phase_name: null,
    phase_id: null,
    sort_order: 0,
    due_date: null,
    completed_at: null,
    scheduled_start_time: null,
    scheduled_end_time: null,
    show_in_inbox: true,
    requires_attachment: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

export function createMockProject(overrides: Record<string, unknown> = {}) {
  return {
    id: 'project-id-1',
    name: 'Test Project',
    description: 'A test project',
    status: 'Active',
    project_type: 'web_design',
    project_group: 'active',
    deployment_platform: 'vercel',
    workspace_id: 'workspace-id-1',
    team_id: 'team-id-1',
    lead_id: 'test-user-id',
    client_id: null,
    target_date: null,
    sort_order: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

export function createMockPhase(overrides: Record<string, unknown> = {}) {
  return {
    id: 'phase-id-1',
    project_id: 'project-id-1',
    workspace_id: 'workspace-id-1',
    name: 'Test Phase',
    description: null,
    status: 'not_started',
    sort_order: 0,
    is_locked: false,
    auto_progress: false,
    completed_at: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}
