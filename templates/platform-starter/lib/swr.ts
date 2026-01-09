import useSWR, { mutate } from 'swr'

// Fetcher function for SWR
const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

// SWR configuration defaults
const defaultConfig = {
  revalidateOnFocus: false,
  dedupingInterval: 60000, // 1 minute
  keepPreviousData: true,
}

// ============================================
// ITEMS (Example - replace with your entities)
// ============================================

export function useItems() {
  return useSWR('/api/items', fetcher, defaultConfig)
}

export function useItem(id: string | null) {
  return useSWR(id ? `/api/items/${id}` : null, fetcher, defaultConfig)
}

// Invalidation functions - call after mutations
export function invalidateItems(immediate = false) {
  if (immediate) {
    mutate('/api/items')
  } else {
    // Revalidate on next focus
    mutate('/api/items', undefined, { revalidate: true })
  }
}

export function invalidateItem(id: string, immediate = false) {
  if (immediate) {
    mutate(`/api/items/${id}`)
  } else {
    mutate(`/api/items/${id}`, undefined, { revalidate: true })
  }
}

// ============================================
// Add more hooks below as needed
// ============================================

// Example: Projects
// export function useProjects() {
//   return useSWR('/api/projects', fetcher, defaultConfig)
// }
//
// export function invalidateProjects(immediate = false) {
//   if (immediate) mutate('/api/projects')
// }
