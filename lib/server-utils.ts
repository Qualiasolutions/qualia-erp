// Server-side utilities (not server actions)

// For Supabase responses where FK can be array or single object
export type FKResponse<T> = T | T[] | null;

// Normalize FK response (Supabase can return array or single object)
export function normalizeFKResponse<T>(response: FKResponse<T>): T | null {
  if (Array.isArray(response)) {
    return response[0] || null;
  }
  return response;
}