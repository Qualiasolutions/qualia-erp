-- Add username column to profiles for client portal login convenience
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT;

-- Partial unique index: only non-NULL usernames must be unique (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique
  ON profiles(LOWER(username))
  WHERE username IS NOT NULL;

-- Backfill: set username = email local-part for existing client profiles
UPDATE profiles
SET username = LOWER(split_part(au.email, '@', 1))
FROM auth.users au
WHERE profiles.id = au.id
  AND profiles.role = 'client'
  AND profiles.username IS NULL;
