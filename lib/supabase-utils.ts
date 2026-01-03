/**
 * Utility functions for working with Supabase data
 */

/**
 * Normalizes foreign key fields that Supabase returns as arrays to single objects
 * Common issue: Supabase joins return arrays even for single foreign keys
 *
 * @param data - Array of data objects
 * @param fkFields - Foreign key field names to normalize
 * @returns Normalized data with FK arrays converted to single objects or null
 *
 * @example
 * const clients = normalizeForeignKeys(data || [], ['creator', 'assigned']);
 */
export function normalizeForeignKeys<T extends Record<string, unknown>>(
  data: T[],
  fkFields: string[]
): T[] {
  return data.map((item) => {
    const normalized = { ...item } as Record<string, unknown>;
    fkFields.forEach((field) => {
      const value = normalized[field];
      if (Array.isArray(value)) {
        normalized[field] = value[0] || null;
      }
    });
    return normalized as T;
  });
}

/**
 * Normalizes a single object's foreign key fields
 */
export function normalizeSingleForeignKeys<T extends Record<string, unknown>>(
  item: T | null,
  fkFields: string[]
): T | null {
  if (!item) return null;

  const normalized = { ...item } as Record<string, unknown>;
  fkFields.forEach((field) => {
    const value = normalized[field];
    if (Array.isArray(value)) {
      normalized[field] = value[0] || null;
    }
  });
  return normalized as T;
}
