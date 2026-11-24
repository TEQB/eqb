-- Push notifications: store device tokens for users
CREATE TABLE IF NOT EXISTS user_device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  token text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, platform, token)
);

CREATE INDEX IF NOT EXISTS idx_user_device_tokens_profile ON user_device_tokens(profile_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_device_tokens_token ON user_device_tokens(token);

-- RLS for device tokens
ALTER TABLE user_device_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_device_tokens"
  ON user_device_tokens FOR ALL
  TO authenticated
  USING (profile_id = current_profile_id())
  WITH CHECK (profile_id = current_profile_id());

-- Helper: Get device tokens for group members (excluding sender)
CREATE OR REPLACE FUNCTION get_group_device_tokens(group_id_param uuid, sender_profile_id uuid)
RETURNS TABLE (
  platform text,
  token text
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT t.platform, t.token
  FROM user_device_tokens t
  JOIN study_group_members m ON m.profile_id = t.profile_id
  WHERE m.group_id = group_id_param
    AND m.profile_id <> sender_profile_id
    AND t.is_active = true;
END;
$$ LANGUAGE plpgsql STABLE;

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_device_tokens_updated_at ON user_device_tokens;
CREATE TRIGGER update_user_device_tokens_updated_at
  BEFORE UPDATE ON user_device_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
