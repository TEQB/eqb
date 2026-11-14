-- Fix study-group RLS recursion.
-- The original policies checked membership by querying study_group_members from
-- policies on study_group_members itself, which can recurse and return 500s.
-- These security-definer helpers bypass RLS for the membership check only.

CREATE OR REPLACE FUNCTION current_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION is_group_member(p_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM study_group_members
    WHERE group_id = p_group_id
      AND profile_id = current_profile_id()
  );
$$;

CREATE OR REPLACE FUNCTION is_group_admin(p_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM study_group_members
    WHERE group_id = p_group_id
      AND profile_id = current_profile_id()
      AND role = 'admin'
  );
$$;

DROP POLICY IF EXISTS "members_read_own_study_groups" ON study_groups;
CREATE POLICY "members_read_own_study_groups"
  ON study_groups FOR SELECT
  TO authenticated
  USING (is_group_member(id));

DROP POLICY IF EXISTS "members_read_group_members" ON study_group_members;
CREATE POLICY "members_read_group_members"
  ON study_group_members FOR SELECT
  TO authenticated
  USING (is_group_member(group_id));

DROP POLICY IF EXISTS "admins_remove_members" ON study_group_members;
CREATE POLICY "admins_remove_members"
  ON study_group_members FOR DELETE
  TO authenticated
  USING (is_group_admin(group_id) AND profile_id <> current_profile_id());

DROP POLICY IF EXISTS "members_read_messages" ON study_group_messages;
CREATE POLICY "members_read_messages"
  ON study_group_messages FOR SELECT
  TO authenticated
  USING (is_group_member(group_id));

DROP POLICY IF EXISTS "members_send_messages" ON study_group_messages;
CREATE POLICY "members_send_messages"
  ON study_group_messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = current_profile_id() AND is_group_member(group_id));
