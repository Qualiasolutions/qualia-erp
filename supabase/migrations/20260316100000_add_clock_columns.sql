-- Add clock-in/out tracking to daily_checkins
ALTER TABLE daily_checkins
  ADD COLUMN IF NOT EXISTS clock_in_time timestamptz,
  ADD COLUMN IF NOT EXISTS planned_clock_out_time timestamptz,
  ADD COLUMN IF NOT EXISTS actual_clock_out_time timestamptz;
