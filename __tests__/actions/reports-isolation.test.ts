/**
 * @jest-environment node
 */

/**
 * Regression test: the /api/v1/reports ingest route MUST NOT mutate
 * phase_items or project_phases tables. It is telemetry-only — completion
 * state belongs to the operator-driven kanban path (pipeline.ts).
 */

// Track every .from(tableName) call across both admin and regular clients
const fromCalls: string[] = [];

// Chainable mock builder — every method returns itself, resolves to data/error
function buildChain(resolvedData: { data: unknown; error: unknown } = { data: null, error: null }) {
  const methods = [
    'select',
    'insert',
    'update',
    'delete',
    'upsert',
    'eq',
    'neq',
    'in',
    'is',
    'not',
    'gt',
    'gte',
    'lte',
    'order',
    'limit',
    'single',
    'maybeSingle',
  ] as const;

  const chain: Record<string, jest.Mock> = {};
  for (const m of methods) {
    chain[m] = jest.fn();
  }

  const promised = Object.assign(Promise.resolve(resolvedData), chain);
  for (const m of methods) {
    chain[m].mockReturnValue(promised);
  }

  return chain;
}

jest.mock('@/lib/supabase/server', () => {
  // fromCalls is captured from the outer scope via closure — but since jest.mock
  // is hoisted, we reference the module-level array via a require trick:
  // Actually in node environment with jest, the factory can reference variables
  // declared BEFORE the jest.mock call only if they are simple (not const/let).
  // We use a global side-channel instead.
  const calls: string[] = ((globalThis as Record<string, unknown>).__fromCalls as string[]) ?? [];
  (globalThis as Record<string, unknown>).__fromCalls = calls;

  const _buildChain = (
    resolvedData: { data: unknown; error: unknown } = { data: null, error: null }
  ) => {
    const methods = [
      'select',
      'insert',
      'update',
      'delete',
      'upsert',
      'eq',
      'neq',
      'in',
      'is',
      'not',
      'gt',
      'gte',
      'lte',
      'order',
      'limit',
      'single',
      'maybeSingle',
    ] as const;
    const chain: Record<string, jest.Mock> = {};
    for (const m of methods) {
      chain[m] = jest.fn();
    }
    const promised = Object.assign(Promise.resolve(resolvedData), chain);
    for (const m of methods) {
      chain[m].mockReturnValue(promised);
    }
    return chain;
  };

  const mockFrom = jest.fn((tableName: string) => {
    calls.push(tableName);
    if (tableName === 'session_reports') {
      return _buildChain({ data: { id: 'mock-report-id' }, error: null });
    }
    if (tableName === 'projects') {
      return _buildChain({ data: [], error: null });
    }
    if (tableName === 'work_sessions') {
      return _buildChain({ data: [], error: null });
    }
    if (tableName === 'idempotency_keys') {
      return _buildChain({ data: null, error: null });
    }
    return _buildChain({ data: null, error: null });
  });

  const mockSupabase = { from: mockFrom };

  return {
    createClient: jest.fn().mockResolvedValue(mockSupabase),
    createAdminClient: jest.fn(() => mockSupabase),
  };
});

jest.mock('@/lib/api-auth', () => ({
  authenticateRequest: jest.fn().mockResolvedValue({
    ok: true,
    method: 'per_user_token',
    tokenId: 'test-token-id',
    profileId: 'test-profile-uuid',
    scope: 'reports:write',
  }),
  hasScope: jest.fn((auth: { ok: boolean; scope: string }, required: string) => {
    if (!auth.ok) return false;
    const granted = auth.scope.split(/\s+/).filter(Boolean);
    return granted.includes('*') || granted.includes(required);
  }),
}));

jest.mock('@/lib/rate-limit', () => ({
  apiRateLimiter: jest.fn().mockResolvedValue({
    success: true,
    limit: 100,
    remaining: 99,
    reset: Date.now() + 60000,
  }),
}));

// Import AFTER mocks are set up
import { POST } from '@/app/api/v1/reports/route';
import { NextRequest } from 'next/server';

// ---- Test ----

describe('/api/v1/reports — isolation boundary', () => {
  beforeEach(() => {
    const calls = (globalThis as Record<string, unknown>).__fromCalls as string[];
    calls.length = 0;
  });

  it('does NOT touch phase_items or project_phases tables', async () => {
    const payload = {
      project: 'test-project',
      milestone: 1,
      phase: 1,
      tasks_done: 5,
      tasks_total: 5,
      verification: 'PASS',
      commits: [],
    };

    const request = new NextRequest('http://localhost:3000/api/v1/reports', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer qlt_test-token-value',
      },
      body: JSON.stringify(payload),
    });

    const response = await POST(request);

    // Route should not crash — status < 500
    expect(response.status).toBeLessThan(500);

    // The critical assertion: no mutations to completion-state tables
    const calls = (globalThis as Record<string, unknown>).__fromCalls as string[];
    expect(calls).not.toContain('phase_items');
    expect(calls).not.toContain('project_phases');
  });
});
