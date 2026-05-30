-- B1 auto-capture: distinguish observed (auto) vs self-reported (manual) reports.
-- Additive + backward compatible: existing rows and any client that omits `source`
-- default to 'manual', so today's /qualia-report flow is unchanged. `source` is NOT
-- part of the dedupe key (framework_project_id, client_report_id) — it's display-only.
alter table public.session_reports
  add column if not exists source text not null default 'manual'
  check (source in ('auto', 'manual'));

comment on column public.session_reports.source is
  'auto = observed automatically at ship/session-end; manual = deliberate /qualia-report submission';
