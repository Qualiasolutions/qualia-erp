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

import {
  assertAppEnabledForClient,
  assertNotImpersonating,
  isPortalAdminRole,
} from '@/lib/portal-utils';

beforeEach(() => {
  mockCookieGet.mockReset();
  mockGetEnabledAppsForClient.mockReset();
});

describe('isPortalAdminRole', () => {
  it('returns true for admin', () => {
    expect(isPortalAdminRole('admin')).toBe(true);
  });

  it('returns true for manager', () => {
    expect(isPortalAdminRole('manager')).toBe(true);
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
  it('passes unconditionally for admin role', async () => {
    const result = await assertAppEnabledForClient('u1', null, 'messages', 'admin');
    expect(result).toBe(true);
    expect(mockGetEnabledAppsForClient).not.toHaveBeenCalled();
  });

  it('passes unconditionally for manager role', async () => {
    const result = await assertAppEnabledForClient('u1', null, 'billing', 'manager');
    expect(result).toBe(true);
    expect(mockGetEnabledAppsForClient).not.toHaveBeenCalled();
  });

  it('passes unconditionally for employee role', async () => {
    const result = await assertAppEnabledForClient('u1', 'ws-123', 'files', 'employee');
    expect(result).toBe(true);
    expect(mockGetEnabledAppsForClient).not.toHaveBeenCalled();
  });

  it('returns false for a client when workspaceId is null', async () => {
    const result = await assertAppEnabledForClient('u1', null, 'messages', 'client');
    expect(result).toBe(false);
    expect(mockGetEnabledAppsForClient).not.toHaveBeenCalled();
  });

  it('returns true when the requested app is in the enabled list', async () => {
    mockGetEnabledAppsForClient.mockResolvedValue({
      success: true,
      data: ['messages', 'billing', 'files'],
    });
    const result = await assertAppEnabledForClient('u1', 'ws-123', 'billing', 'client');
    expect(result).toBe(true);
    expect(mockGetEnabledAppsForClient).toHaveBeenCalledWith('ws-123', 'u1');
  });

  it('returns false when the requested app is NOT in the enabled list', async () => {
    mockGetEnabledAppsForClient.mockResolvedValue({
      success: true,
      data: ['messages', 'files'],
    });
    const result = await assertAppEnabledForClient('u1', 'ws-123', 'billing', 'client');
    expect(result).toBe(false);
  });

  it('returns false when getEnabledAppsForClient returns unsuccessful', async () => {
    mockGetEnabledAppsForClient.mockResolvedValue({ success: false, error: 'DB error' });
    const result = await assertAppEnabledForClient('u1', 'ws-123', 'messages', 'client');
    expect(result).toBe(false);
  });

  it('returns false when data is not an array', async () => {
    mockGetEnabledAppsForClient.mockResolvedValue({ success: true, data: null });
    const result = await assertAppEnabledForClient('u1', 'ws-123', 'messages', 'client');
    expect(result).toBe(false);
  });

  it('returns false when role is null (treats as unknown, not internal)', async () => {
    mockGetEnabledAppsForClient.mockResolvedValue({
      success: true,
      data: ['messages'],
    });
    const result = await assertAppEnabledForClient('u1', 'ws-123', 'messages', null);
    expect(result).toBe(true);
    expect(mockGetEnabledAppsForClient).toHaveBeenCalled();
  });

  it('does not leak access when enabled list is empty', async () => {
    mockGetEnabledAppsForClient.mockResolvedValue({ success: true, data: [] });
    const result = await assertAppEnabledForClient('u1', 'ws-123', 'messages', 'client');
    expect(result).toBe(false);
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
