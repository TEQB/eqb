-- Admin announcements: modal/banner shown to students on login

CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  display_type text NOT NULL DEFAULT 'modal' CHECK (display_type IN ('modal', 'banner')),
  duration_type text NOT NULL DEFAULT 'once' CHECK (duration_type IN ('once', 'days', 'weeks', 'months')),
  duration_value integer NOT NULL DEFAULT 1 CHECK (duration_value >= 1),
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(is_active, expires_at);

-- Tracks which users have seen/dismissed an announcement (used for "show once")
CREATE TABLE IF NOT EXISTS announcement_reads (
  announcement_id uuid NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  first_shown_at timestamptz NOT NULL DEFAULT now(),
  dismissed_at timestamptz,
  PRIMARY KEY (announcement_id, profile_id)
);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read active, non-expired announcements
DROP POLICY IF EXISTS "authenticated_read_announcements" ON announcements;
CREATE POLICY "authenticated_read_announcements"
  ON announcements FOR SELECT TO authenticated
  USING (is_active AND (expires_at IS NULL OR expires_at > now()));

-- Only super admins can manage announcements (service role bypasses anyway)
DROP POLICY IF EXISTS "admin_manage_announcements" ON announcements;
CREATE POLICY "admin_manage_announcements"
  ON announcements FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid() AND profiles.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid() AND profiles.role = 'super_admin'
    )
  );

-- Users can read their own read-receipts and insert/update their own
DROP POLICY IF EXISTS "users_read_own_announcement_reads" ON announcement_reads;
CREATE POLICY "users_read_own_announcement_reads"
  ON announcement_reads FOR SELECT TO authenticated
  USING (profile_id = current_profile_id());

DROP POLICY IF EXISTS "users_insert_own_announcement_reads" ON announcement_reads;
CREATE POLICY "users_insert_own_announcement_reads"
  ON announcement_reads FOR INSERT TO authenticated
  WITH CHECK (profile_id = current_profile_id());

DROP POLICY IF EXISTS "users_update_own_announcement_reads" ON announcement_reads;
CREATE POLICY "users_update_own_announcement_reads"
  ON announcement_reads FOR UPDATE TO authenticated
  USING (profile_id = current_profile_id())
  WITH CHECK (profile_id = current_profile_id());
