/**
 * Tests for lib/portal-utils.ts — Phase 8 security helpers.
 * Covers:
 * - assertAppEnabledForClient — server-side App Library guard
 * - assertNotImpersonating — mutation guard against view-as-user-id cookie
 * - isPortalAdminRole — pure role predicate
 */

const mockCookieGet = jest.fn();

jest.mock('next/headers', () => ({
  cookies: jest.fn(async () => ({
    get: mockCookieGet,
  })),
}));

const mockGetEnabledAppsForClient = jest.fn();

jest.mock('@/app/actions/portal-admin', () => ({
  getEnabledAppsForClient: (...args: unknown[]) => mockGetEnabledAppsForClient(...args),
}));

const mockMaybeSingle = jest.fn();
const mockLimit = jest.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockEq = jest.fn(() => ({ limit: mockLimit }));
const mockSelect = jest.fn(() => ({ eq: mockEq }));
const mockFrom = jest.fn(() => ({ select: mockSelect }));

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(async () => ({ from: mockFrom })),
}));

import {
  assertAppEnabledForClient,
  assertNotImpersonating,
  isPortalAdminRole,
} from '@/lib/portal-utils';

beforeEach(() => {
  mockCookieGet.mockReset();
  mockGetEnabledAppsForClient.mockReset();
  mockMaybeSingle.mockReset();
});

describe('isPortalAdminRole', () => {
  it('returns true for admin', () => {
    expect(isPortalAdminRole('admin')).toBe(true);
  });

  it('returns false for manager (role removed 2026-04-18)', () => {
    expect(isPortalAdminRole('manager')).toBe(false);
  });

  it('returns false for employee', () => {
    expect(isPortalAdminRole('employee')).toBe(false);
  });

  it('returns false for client', () => {
    expect(isPortalAdminRole('client')).toBe(false);
  });

  it('returns false for null', () => {
    expect(isPortalAdminRole(null)).toBe(false);
  });

  it('returns false for unknown role strings', () => {
    expect(isPortalAdminRole('owner')).toBe(false);
    expect(isPortalAdminRole('')).toBe(false);
  });
});

describe('assertAppEnabledForClient', () => {
  // Helper: stub the client_projects → projects.workspace_id resolution.
  const mockClientWorkspace = (workspaceId: string | null) => {
    mockMaybeSingle.mockResolvedValue({
      data: workspaceId ? { projects: { workspace_id: workspaceId } } : null,
    });
  };

  it('passes unconditionally for admin role', async () => {
    const result = await assertAppEnabledForClient('u1', 'messages', 'admin');
    expect(result).toBe(true);
    expect(mockGetEnabledAppsForClient).not.toHaveBeenCalled();
  });

  it('rejects manager role (removed 2026-04-18) — falls through client path', async () => {
    // Manager is no longer an internal role; guard treats it as non-client/non-internal.
    const result = await assertAppEnabledForClient('u1', 'billing', 'manager');
    expect(result).toBe(false);
    expect(mockGetEnabledAppsForClient).not.toHaveBeenCalled();
  });

  it('passes unconditionally for employee role', async () => {
    const result = await assertAppEnabledForClient('u1', 'files', 'employee');
    expect(result).toBe(true);
    expect(mockGetEnabledAppsForClient).not.toHaveBeenCalled();
  });

  it('rejects roles other than admin/employee/client', async () => {
    const result = await assertAppEnabledForClient('u1', 'messages', 'unknown');
    expect(result).toBe(false);
  });

  it('rejects null role (treats as unknown, not internal)', async () => {
    const result = await assertAppEnabledForClient('u1', 'messages', null);
    expect(result).toBe(false);
    expect(mockGetEnabledAppsForClient).not.toHaveBeenCalled();
  });

  it('fails open for a client with no linked client_projects (no workspace)', async () => {
    mockClientWorkspace(null);
    const result = await assertAppEnabledForClient('u1', 'messages', 'client');
    expect(result).toBe(true);
    expect(mockGetEnabledAppsForClient).not.toHaveBeenCalled();
  });

  it('returns true when the requested app is in the enabled list', async () => {
    mockClientWorkspace('ws-123');
    mockGetEnabledAppsForClient.mockResolvedValue({
      success: true,
      data: ['messages', 'billing', 'files'],
    });
    const result = await assertAppEnabledForClient('u1', 'billing', 'client');
    expect(result).toBe(true);
    expect(mockGetEnabledAppsForClient).toHaveBeenCalledWith('ws-123', 'u1');
  });

  it('returns false when the requested app is NOT in the enabled list', async () => {
    mockClientWorkspace('ws-123');
    mockGetEnabledAppsForClient.mockResolvedValue({
      success: true,
      data: ['messages', 'files'],
    });
    const result = await assertAppEnabledForClient('u1', 'billing', 'client');
    expect(result).toBe(false);
  });

  it('returns false when getEnabledAppsForClient returns unsuccessful', async () => {
    mockClientWorkspace('ws-123');
    mockGetEnabledAppsForClient.mockResolvedValue({ success: false, error: 'DB error' });
    const result = await assertAppEnabledForClient('u1', 'messages', 'client');
    expect(result).toBe(false);
  });

  it('returns false when data is not an array', async () => {
    mockClientWorkspace('ws-123');
    mockGetEnabledAppsForClient.mockResolvedValue({ success: true, data: null });
    const result = await assertAppEnabledForClient('u1', 'messages', 'client');
    expect(result).toBe(false);
  });

  it('does not leak access when enabled list is empty', async () => {
    mockClientWorkspace('ws-123');
    mockGetEnabledAppsForClient.mockResolvedValue({ success: true, data: [] });
    const result = await assertAppEnabledForClient('u1', 'messages', 'client');
    expect(result).toBe(false);
  });

  it('handles Supabase returning the projects FK as an array', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { projects: [{ workspace_id: 'ws-from-array' }] },
    });
    mockGetEnabledAppsForClient.mockResolvedValue({
      success: true,
      data: ['messages'],
    });
    const result = await assertAppEnabledForClient('u1', 'messages', 'client');
    expect(result).toBe(true);
    expect(mockGetEnabledAppsForClient).toHaveBeenCalledWith('ws-from-array', 'u1');
  });
});

describe('assertNotImpersonating', () => {
  it('returns ok: true when no view-as cookie is set', async () => {
    mockCookieGet.mockReturnValue(undefined);
    const result = await assertNotImpersonating();
    expect(result).toEqual({ ok: true });
  });

  it('returns ok: true when cookie exists but has no value', async () => {
    mockCookieGet.mockReturnValue({ value: '' });
    const result = await assertNotImpersonating();
    expect(result).toEqual({ ok: true });
  });

  it('blocks mutations when view-as cookie is present', async () => {
    mockCookieGet.mockReturnValue({ value: 'target-user-uuid' });
    const result = await assertNotImpersonating();
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/viewing as another user/i);
  });

  it('reads the view-as-user-id cookie by the correct name', async () => {
    mockCookieGet.mockReturnValue({ value: 'some-uuid' });
    await assertNotImpersonating();
    expect(mockCookieGet).toHaveBeenCalledWith('view-as-user-id');
  });

  it('error message instructs how to recover', async () => {
    mockCookieGet.mockReturnValue({ value: 'target-user-uuid' });
    const result = await assertNotImpersonating();
    expect(result.error).toMatch(/exit view-as/i);
  });
});
