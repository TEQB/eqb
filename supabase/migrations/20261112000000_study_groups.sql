-- Study Groups: course-based real-time chat groups
-- Students create/join groups per course, chat in real time, and share
-- contact info (name/phone/account number) on an opt-in basis.

-- 1. Extend profiles with optional contact fields (shared per-group via toggles)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone_number text,
  ADD COLUMN IF NOT EXISTS bank_account_number text;

-- 2. Study groups (max 2 per course, enforced in application + trigger)
CREATE TABLE IF NOT EXISTS study_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  invite_code text NOT NULL UNIQUE,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_study_groups_course_id ON study_groups(course_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_study_groups_invite_code ON study_groups(invite_code);

-- 3. Group membership + per-member privacy toggles
CREATE TABLE IF NOT EXISTS study_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  share_name boolean NOT NULL DEFAULT false,
  share_phone boolean NOT NULL DEFAULT false,
  share_account_number boolean NOT NULL DEFAULT false,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_study_group_members_group ON study_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_study_group_members_profile ON study_group_members(profile_id);

-- 4. Chat messages
CREATE TABLE IF NOT EXISTS study_group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (length(content) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_study_group_messages_group ON study_group_messages(group_id, created_at DESC);

-- 5. Enforce max 2 active groups per course
CREATE OR REPLACE FUNCTION enforce_max_study_groups_per_course()
RETURNS trigger AS $$
BEGIN
  IF NEW.is_active = true THEN
    IF (SELECT count(*) FROM study_groups
        WHERE course_id = NEW.course_id AND is_active = true AND id <> NEW.id) >= 2 THEN
      RAISE EXCEPTION 'Maximum of 2 study groups allowed per course';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_max_study_groups ON study_groups;
CREATE TRIGGER trg_max_study_groups
  BEFORE INSERT OR UPDATE ON study_groups
  FOR EACH ROW EXECUTE FUNCTION enforce_max_study_groups_per_course();

-- 6. RLS
ALTER TABLE study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_group_messages ENABLE ROW LEVEL SECURITY;

-- Helper: current student's profile id
CREATE OR REPLACE FUNCTION current_profile_id()
RETURNS uuid AS $$
  SELECT id FROM profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- study_groups: students can read active groups; create via API (service role)
CREATE POLICY "students_read_active_study_groups"
  ON study_groups FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Members can read their own groups (even if deactivated)
CREATE POLICY "members_read_own_study_groups"
  ON study_groups FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT group_id FROM study_group_members WHERE profile_id = current_profile_id())
  );

-- study_group_members: members can see fellow members; users manage own membership row
CREATE POLICY "members_read_group_members"
  ON study_group_members FOR SELECT
  TO authenticated
  USING (
    group_id IN (SELECT group_id FROM study_group_members WHERE profile_id = current_profile_id())
  );

CREATE POLICY "users_read_own_membership"
  ON study_group_members FOR SELECT
  TO authenticated
  USING (profile_id = current_profile_id());

-- Join: a student may insert their own membership (eligibility enforced by API)
CREATE POLICY "students_join_group"
  ON study_group_members FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = current_profile_id());

-- Leave / update own privacy toggles
CREATE POLICY "users_update_own_membership"
  ON study_group_members FOR UPDATE
  TO authenticated
  USING (profile_id = current_profile_id())
  WITH CHECK (profile_id = current_profile_id());

CREATE POLICY "users_leave_group"
  ON study_group_members FOR DELETE
  TO authenticated
  USING (profile_id = current_profile_id());

-- Group admins can remove other members
CREATE POLICY "admins_remove_members"
  ON study_group_members FOR DELETE
  TO authenticated
  USING (
    group_id IN (
      SELECT group_id FROM study_group_members
      WHERE profile_id = current_profile_id() AND role = 'admin'
    )
    AND profile_id <> current_profile_id()
  );

-- study_group_messages: members read + send
CREATE POLICY "members_read_messages"
  ON study_group_messages FOR SELECT
  TO authenticated
  USING (
    group_id IN (SELECT group_id FROM study_group_members WHERE profile_id = current_profile_id())
  );

CREATE POLICY "members_send_messages"
  ON study_group_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = current_profile_id()
    AND group_id IN (SELECT group_id FROM study_group_members WHERE profile_id = current_profile_id())
  );

-- 7. Enable realtime for chat messages
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE study_group_messages;
  END IF;
END $$;
