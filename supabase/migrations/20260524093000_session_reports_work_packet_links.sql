-- Trace Framework reports back to the ERP assignment/work packet that guided
-- the session. The Framework sends these from .planning/work-packet.json.

ALTER TABLE public.session_reports
  ADD COLUMN IF NOT EXISTS work_packet_id uuid REFERENCES public.project_work_packets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assignment_id uuid REFERENCES public.project_assignments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assignment_deadline date;

CREATE INDEX IF NOT EXISTS idx_session_reports_work_packet
  ON public.session_reports(work_packet_id)
  WHERE work_packet_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_session_reports_assignment
  ON public.session_reports(assignment_id)
  WHERE assignment_id IS NOT NULL;

COMMENT ON COLUMN public.session_reports.work_packet_id IS
  'ERP project_work_packets.id from the local Framework work packet active during /qualia-report.';

COMMENT ON COLUMN public.session_reports.assignment_id IS
  'ERP project_assignments.id from the local Framework work packet active during /qualia-report.';

COMMENT ON COLUMN public.session_reports.assignment_deadline IS
  'ERP-owned assignment deadline sent by the Framework for report traceability.';
