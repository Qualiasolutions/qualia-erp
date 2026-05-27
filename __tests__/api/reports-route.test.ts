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
};

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => adminClient,
}));

jest.mock('@/lib/api-auth', () => ({
  authenticateRequest: jest.fn(() => Promise.resolve(authResult)),
  hasScope: jest.fn(() => true),
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

import { POST } from '@/app/api/v1/reports/route';

type QueryResult = { data: unknown; error: unknown };

function query(result: QueryResult = { data: null, error: null }) {
  const chain: Record<string, jest.Mock> = {};
  const methods = ['select', 'eq', 'gte', 'not', 'is', 'order', 'limit', 'insert', 'upsert'];

  for (const method of methods) {
    chain[method] = jest.fn(() => chain);
  }
  chain.single = jest.fn(() => Promise.resolve(result));
  chain.maybeSingle = jest.fn(() => Promise.resolve(result));
  return chain;
}

function requestWithPayload(payload: Record<string, unknown>) {
  const headers = new Map<string, string>([
    ['authorization', 'Bearer qlt_test'],
    ['content-type', 'application/json'],
    ['idempotency-key', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'],
  ]);

  return {
    url: 'https://portal.qualiasolutions.net/api/v1/reports',
    headers: {
      get: (name: string) => headers.get(name.toLowerCase()) ?? null,
    },
    json: async () => payload,
  };
}

describe('POST /api/v1/reports', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses erp_project_id as the strongest project link before repo/name guessing', async () => {
    const idempotencyRead = query({ data: null, error: null });
    const directProject = query({
      data: { id: PROJECT_ID, name: 'Acme Portal', client_id: CLIENT_ID },
      error: null,
    });
    const reportWrite = query({ data: { id: 'internal-report-id' }, error: null });
    const idempotencyWrite = query({ data: null, error: null });
    const sessionsRead = query({ data: [], error: null });

    let writtenReport: Record<string, unknown> | undefined;
    reportWrite.upsert.mockImplementation((row) => {
      writtenReport = row;
      return reportWrite;
    });

    adminClient.from.mockImplementation((table: string) => {
      if (table === 'idempotency_keys') {
        return adminClient.from.mock.calls.filter(([name]) => name === 'idempotency_keys')
          .length === 1
          ? idempotencyRead
          : idempotencyWrite;
      }
      if (table === 'projects') return directProject;
      if (table === 'session_reports') return reportWrite;
      if (table === 'work_sessions') return sessionsRead;
      return query();
    });

    const response = await POST(
      requestWithPayload({
        project: 'guessable-name',
        project_id: 'qs-acme-portal',
        erp_project_id: PROJECT_ID,
        client_report_id: 'QS-REPORT-01',
        submitted_at: '2026-05-21T00:00:00.000Z',
        submitted_by: 'Fawzi Goussous',
      }) as never
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      report_id: 'QS-REPORT-01',
      erp_project_id: PROJECT_ID,
      erp_project_name: 'Acme Portal',
    });
    expect(directProject.eq).toHaveBeenCalledWith('id', PROJECT_ID);
    expect(writtenReport).toMatchObject({
      project_name: 'Acme Portal',
      framework_project_id: 'qs-acme-portal',
      erp_project_id: PROJECT_ID,
      client_id: CLIENT_ID,
      client_report_id: 'QS-REPORT-01',
    });
  });

  it('rejects malformed erp_project_id values instead of silently guessing', async () => {
    const response = await POST(
      requestWithPayload({
        project: 'guessable-name',
        erp_project_id: 'not-a-uuid',
        submitted_at: '2026-05-21T00:00:00.000Z',
        submitted_by: 'Fawzi Goussous',
      }) as never
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
