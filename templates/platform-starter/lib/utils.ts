import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Normalize Supabase FK arrays to single objects
export function normalizeFKResponse<T extends Record<string, unknown>>(
  data: T,
  fkFields: (keyof T)[]
): T {
  const normalized = { ...data }
  for (const field of fkFields) {
    const value = normalized[field]
    if (Array.isArray(value)) {
      normalized[field] = (value[0] || null) as T[keyof T]
    }
  }
  return normalized
}
