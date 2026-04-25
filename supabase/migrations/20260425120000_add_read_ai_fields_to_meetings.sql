-- Read.ai meeting intelligence fields on meetings.
-- A meeting can be ingested from Read.ai via webhook or one-off import.
-- read_ai_session_id is unique (when not null) to make ingestion idempotent.

alter table public.meetings
  add column if not exists read_ai_session_id text,
  add column if not exists summary text,
  add column if not exists report_url text,
  add column if not exists recording_url text,
  add column if not exists topics jsonb,
  add column if not exists action_items jsonb,
  add column if not exists key_questions jsonb,
  add column if not exists chapter_summaries jsonb,
  add column if not exists participants_meta jsonb,
  add column if not exists ingested_at timestamptz;

create unique index if not exists meetings_read_ai_session_id_uniq
  on public.meetings (read_ai_session_id)
  where read_ai_session_id is not null;
