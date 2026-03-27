ALTER TABLE profiles ADD COLUMN IF NOT EXISTS planned_logout_time TIME DEFAULT NULL;
COMMENT ON COLUMN profiles.planned_logout_time IS 'Employee planned end-of-shift time (e.g. 16:00). Used for clock-out reminders.';
