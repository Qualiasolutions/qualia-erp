-- BH-V2: Expand activity_log action_type CHECK constraint to include
-- code_push, deployment, and feature_request.
-- Previous migration: 20260301100000_fix_activity_log_action_types.sql
-- had 11 types. This adds the 3 that were missing from real usage.

ALTER TABLE public.activity_log DROP CONSTRAINT IF EXISTS activity_log_action_type_check;

ALTER TABLE public.activity_log ADD CONSTRAINT activity_log_action_type_check
  CHECK (action_type IN (
    'phase_submitted', 'phase_approved', 'phase_changes_requested',
    'phase_started', 'phase_completed', 'phase_review_requested',
    'task_completed', 'comment_added', 'file_uploaded',
    'status_changed', 'client_invited',
    'code_push', 'deployment', 'feature_request'
  ));
