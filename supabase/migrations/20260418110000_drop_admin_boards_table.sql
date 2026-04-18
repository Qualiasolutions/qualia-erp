-- Drop the admin board system. Feature removed — the freeform canvas at
-- /admin/board was deleted along with its client, server actions, and
-- project-level Board tab. Already applied to prod via Supabase MCP on
-- 2026-04-18.
DROP TABLE IF EXISTS public.admin_boards CASCADE;
