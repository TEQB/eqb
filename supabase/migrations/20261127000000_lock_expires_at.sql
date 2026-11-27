-- Timed student locks: lock_expires_at NULL = permanent lock
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS lock_expires_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_profiles_lock_expires_at
  ON profiles (lock_expires_at)
  WHERE lock_expires_at IS NOT NULL;
