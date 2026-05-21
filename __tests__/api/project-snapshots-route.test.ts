export {};

const PROJECT_ID = '7b5d3b4e-2b8a-4de4-91a1-9b2f3182f5ef';
const CLIENT_ID = '5f5a8d8e-8c58-4c30-9b76-13a08f0d0d8a';

const adminClient = {
  from: jest.fn(),
};

const authResult = {
  ok: true,
  profileId: 'profile-1',
  tokenId: 'token-1',
  method: 'api-token',
  scope: 'reports:write',
};

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => adminClient,
}));

jest.mock('@/lib/api-auth', () => ({
  authenticateRequest: jest.fn(() => Promise.resolve(authResult)),
  hasScope: jest.fn((auth: typeof authResult, scope: string) =>
    auth.scope.split(/\s+/).includes(scope)
  ),
}));

jest.mock('@/lib/rate-limit', () => ({
  apiRateLimiter: jest.fn(() => Promise.resolve({ success: true, reset: Date.now() + 60000 })),
}));

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number; headers?: HeadersInit }) => ({
      status: init?.status ?? 200,
      headers: init?.headers ?? {},
      json: async () => body,
    }),
  },
}));

import { POST } from '@/app/api/v1/project-snapshots/route';

type QueryResult = { data: unknown; error: unknown };

function query(result: QueryResult = { data: null, error: null }) {
  const chain: Record<string, jest.Mock> = {};
  const methods = ['select', 'eq', 'limit', 'update'];

  for (const method of methods) {
    chain[method] = jest.fn(() => chain);
  }
  chain.single = jest.fn(() => Promise.resolve(result));
  chain.maybeSingle = jest.fn(() => Promise.resolve(result));
  return chain;
}

function validSnapshot(overrides: Record<string, unknown> = {}) {
  return {
    snapshot_version: 1,
    generated_at: '2026-05-21T00:00:00.000Z',
    source: 'qualia-framework',
    framework_version: '6.2.5',
    identifiers: {
      project_id: 'qs-acme-portal',
      team_id: 'qualia-solutions',
      git_remote: 'github.com/QualiasolutionsCY/acme-portal',
      erp_project_id: PROJECT_ID,
      client_id: CLIENT_ID,
    },
    project: {
      name: 'acme-portal',
      client: 'Acme',
      status: 'built',
      deployed_url: 'https://acme.example.com',
      progress_percent: 42,
    },
    current: {
      milestone: 2,
      milestone_name: 'Product',
      phase: 2,
      phase_name: 'Dashboard',
      total_phases: 4,
      tasks_done: 3,
      tasks_total: 5,
      verification: 'pending',
      gap_cycles: 1,
    },
    journey: {
      total_milestones: 3,
      milestones: [
        { num: 1, name: 'Foundation', status: 'closed' },
        { num: 2, name: 'Product', status: 'active' },
        { num: 3, name: 'Handoff', status: 'pending' },
      ],
      closed_milestones: [{ num: 1, name: 'Foundation' }],
    },
    lifetime: {
      tasks_completed: 12,
      phases_completed: 4,
      milestones_completed: 1,
    },
    timestamps: {
      last_updated: '2026-05-21T00:00:00.000Z',
    },
    ...overrides,
  };
}

function requestWithPayload(payload: Record<string, unknown>) {
  return {
    url: 'https://portal.qualiasolutions.net/api/v1/project-snapshots',
    headers: {
      get: (name: string) => (name.toLowerCase() === 'authorization' ? 'Bearer qlt_test' : null),
    },
    json: async () => payload,
  };
}

describe('POST /api/v1/project-snapshots', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores the latest framework snapshot on the canonical ERP project', async () => {
    const directProject = query({
      data: {
        id: PROJECT_ID,
        name: 'Acme Portal',
        client_id: null,
        metadata: { existing: true },
      },
      error: null,
    });
    const projectUpdate = query({ data: null, error: null });

    let updatedProject: Record<string, unknown> | undefined;
    projectUpdate.update.mockImplementation((row) => {
      updatedProject = row;
      return projectUpdate;
    });

    adminClient.from.mockImplementation((table: string) => {
      if (table !== 'projects') return query();
      return adminClient.from.mock.calls.filter(([name]) => name === 'projects').length === 1
        ? directProject
        : projectUpdate;
    });

    const response = await POST(requestWithPayload(validSnapshot()) as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      project_id: PROJECT_ID,
      project_name: 'Acme Portal',
      progress_percent: 42,
      snapshot_generated_at: '2026-05-21T00:00:00.000Z',
    });
    expect(directProject.eq).toHaveBeenCalledWith('id', PROJECT_ID);
    expect(projectUpdate.eq).toHaveBeenCalledWith('id', PROJECT_ID);
    expect(updatedProject).toMatchObject({
      client_id: CLIENT_ID,
      metadata: {
        existing: true,
        framework_progress_percent: 42,
        framework_identifiers: {
          project_id: 'qs-acme-portal',
          erp_project_id: PROJECT_ID,
          client_id: CLIENT_ID,
        },
        framework_current: {
          milestone: 2,
          phase: 2,
          verification: 'pending',
        },
        framework_snapshot: {
          snapshot_version: 1,
          source: 'qualia-framework',
          token_id: 'token-1',
          profile_id: 'profile-1',
        },
      },
    });
  });

  it('rejects malformed ERP identifiers before touching the database', async () => {
    const response = await POST(
      requestWithPayload(
        validSnapshot({
          identifiers: {
            project_id: 'qs-acme-portal',
            erp_project_id: 'project-slug',
          },
        })
      ) as never
    );
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body).toMatchObject({
      ok: false,
      error: 'VALIDATION_FAILED',
    });
    expect(adminClient.from).not.toHaveBeenCalled();
  });
});
