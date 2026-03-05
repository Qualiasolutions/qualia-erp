-- Add 'manager' value to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'manager' AFTER 'admin';
