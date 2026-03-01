-- Fix: Expand activity_log action_type CHECK constraint
-- The original constraint was missing action types used by the portal UI:
-- phase_started, phase_completed, client_invited, phase_review_requested

ALTER TABLE public.activity_log DROP CONSTRAINT IF EXISTS activity_log_action_type_check;

ALTER TABLE public.activity_log ADD CONSTRAINT activity_log_action_type_check
  CHECK (action_type IN (
    'phase_submitted', 'phase_approved', 'phase_changes_requested',
    'phase_started', 'phase_completed', 'phase_review_requested',
    'task_completed', 'comment_added', 'file_uploaded',
    'status_changed', 'client_invited'
  ));
