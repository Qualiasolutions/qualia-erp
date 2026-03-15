-- Migration: Remove learning system (v2.0 cleanup)
-- See .planning/phases/26-team-sync-daily-structure/26-01-PLAN.md

DROP TABLE IF EXISTS task_reflections CASCADE;
DROP TABLE IF EXISTS teaching_notes CASCADE;
DROP TABLE IF EXISTS user_achievements CASCADE;
DROP TABLE IF EXISTS achievements CASCADE;
DROP TABLE IF EXISTS skill_practice_log CASCADE;
DROP TABLE IF EXISTS user_skills CASCADE;
DROP TABLE IF EXISTS skills CASCADE;
DROP TABLE IF EXISTS skill_categories CASCADE;

ALTER TABLE profiles
  DROP COLUMN IF EXISTS learn_mode,
  DROP COLUMN IF EXISTS total_xp,
  DROP COLUMN IF EXISTS current_streak,
  DROP COLUMN IF EXISTS onboarding_step,
  DROP COLUMN IF EXISTS onboarding_completed;

DROP FUNCTION IF EXISTS increment_user_xp(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS on_task_completed(uuid, uuid, text) CASCADE;
