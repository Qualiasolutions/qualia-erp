/**
 * Tests for lib/server-utils.ts
 * Covers: normalizeFKResponse — pure function, no mocking needed
 */

import { normalizeFKResponse } from '@/lib/server-utils';

describe('normalizeFKResponse', () => {
  it('returns the object when given a single object', () => {
    const obj = { id: '1', name: 'Test' };
    expect(normalizeFKResponse(obj)).toBe(obj);
  });

  it('returns the first element when given an array with one element', () => {
    const obj = { id: '1', name: 'Test' };
    expect(normalizeFKResponse([obj])).toBe(obj);
  });

  it('returns the first element when given an array with multiple elements', () => {
    const first = { id: '1', name: 'First' };
    const second = { id: '2', name: 'Second' };
    expect(normalizeFKResponse([first, second])).toBe(first);
  });

  it('returns null when given an empty array', () => {
    expect(normalizeFKResponse([])).toBeNull();
  });

  it('returns null when given null', () => {
    expect(normalizeFKResponse(null)).toBeNull();
  });

  it('returns undefined when given undefined (passes through)', () => {
    // undefined is not null so it passes through as-is
    expect(normalizeFKResponse(undefined as never)).toBeUndefined();
  });

  it('handles nested objects correctly', () => {
    const nested = { id: '1', project: { id: 'p1', name: 'Project' } };
    expect(normalizeFKResponse([nested])).toBe(nested);
  });

  it('preserves object identity (no cloning)', () => {
    const obj = { id: '1', data: [1, 2, 3] };
    const result = normalizeFKResponse(obj);
    expect(result).toBe(obj);
  });
});
