import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  // Trim env vars to remove any trailing newlines that cause WebSocket connection issues
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || '';

  return createBrowserClient(supabaseUrl, supabaseKey);
}
