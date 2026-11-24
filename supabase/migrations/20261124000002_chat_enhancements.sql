-- Chat enhancements: typing indicators, read receipts, and message reactions

-- 1. Typing indicators (expires after 30 seconds automatically via cleanup)
CREATE TABLE IF NOT EXISTS study_group_typing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  typing_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_study_group_typing_group ON study_group_typing(group_id, typing_at DESC);

-- RLS for typing indicators
ALTER TABLE study_group_typing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members_read_typing_indicators"
  ON study_group_typing FOR SELECT
  TO authenticated
  USING (
    group_id IN (SELECT group_id FROM study_group_members WHERE profile_id = current_profile_id())
  );

CREATE POLICY "members_manage_own_typing"
  ON study_group_typing FOR ALL
  TO authenticated
  USING (profile_id = current_profile_id())
  WITH CHECK (profile_id = current_profile_id());

-- Enable realtime for typing indicators
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE study_group_typing;
  END IF;
END $$;

ALTER TABLE study_group_typing REPLICA IDENTITY DEFAULT;

-- 2. Read receipts
CREATE TABLE IF NOT EXISTS study_group_message_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES study_group_messages(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_study_group_message_reads_message ON study_group_message_reads(message_id, read_at);
CREATE INDEX IF NOT EXISTS idx_study_group_message_reads_profile ON study_group_message_reads(profile_id);

-- RLS for read receipts
ALTER TABLE study_group_message_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members_read_read_receipts"
  ON study_group_message_reads FOR SELECT
  TO authenticated
  USING (
    message_id IN (
      SELECT id FROM study_group_messages
      WHERE group_id IN (SELECT group_id FROM study_group_members WHERE profile_id = current_profile_id())
    )
  );

CREATE POLICY "members_create_own_read_receipts"
  ON study_group_message_reads FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = current_profile_id());

-- Enable realtime for read receipts
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE study_group_message_reads;
  END IF;
END $$;

ALTER TABLE study_group_message_reads REPLICA IDENTITY DEFAULT;

-- 3. Message reactions
CREATE TABLE IF NOT EXISTS study_group_message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES study_group_messages(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji text NOT NULL CHECK (length(emoji) BETWEEN 1 AND 10),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, profile_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_study_group_message_reactions_message ON study_group_message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_study_group_message_reactions_profile ON study_group_message_reactions(profile_id);

-- RLS for reactions
ALTER TABLE study_group_message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members_read_reactions"
  ON study_group_message_reactions FOR SELECT
  TO authenticated
  USING (
    message_id IN (
      SELECT id FROM study_group_messages
      WHERE group_id IN (SELECT group_id FROM study_group_members WHERE profile_id = current_profile_id())
    )
  );

CREATE POLICY "members_manage_own_reactions"
  ON study_group_message_reactions FOR ALL
  TO authenticated
  USING (profile_id = current_profile_id())
  WITH CHECK (profile_id = current_profile_id());

-- Enable realtime for reactions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE study_group_message_reactions;
  END IF;
END $$;

ALTER TABLE study_group_message_reactions REPLICA IDENTITY DEFAULT;

-- 4. Cleanup function for expired typing indicators (run via cron/pg_cron)
CREATE OR REPLACE FUNCTION cleanup_expired_typing_indicators()
RETURNS void AS $$
BEGIN
  DELETE FROM study_group_typing
  WHERE typing_at < now() - interval '30 seconds';
END;
$$ LANGUAGE plpgsql;

-- 5. Helper: Get typing users for a group
CREATE OR REPLACE FUNCTION get_typing_users(group_id_param uuid)
RETURNS TABLE (
  profile_id uuid,
  full_name text,
  matric_number text
) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.full_name, p.matric_number
  FROM study_group_typing t
  JOIN profiles p ON p.id = t.profile_id
  WHERE t.group_id = group_id_param
    AND t.typing_at > now() - interval '30 seconds';
END;
$$ LANGUAGE sql STABLE;

-- 6. Helper: Get read receipts for a message
CREATE OR REPLACE FUNCTION get_message_reads(message_id_param uuid)
RETURNS TABLE (
  profile_id uuid,
  full_name text,
  matric_number text,
  read_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.full_name, p.matric_number, r.read_at
  FROM study_group_message_reads r
  JOIN profiles p ON p.id = r.profile_id
  WHERE r.message_id = message_id_param
  ORDER BY r.read_at DESC;
END;
$$ LANGUAGE sql STABLE;

-- 7. Helper: Get reactions for a message
CREATE OR REPLACE FUNCTION get_message_reactions(message_id_param uuid)
RETURNS TABLE (
  emoji text,
  count bigint,
  reactor_ids uuid[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT emoji, COUNT(*) as count, array_agg(profile_id) as reactor_ids
  FROM study_group_message_reactions
  WHERE message_id = message_id_param
  GROUP BY emoji
  ORDER BY count DESC, emoji;
END;
$$ LANGUAGE sql STABLE;
