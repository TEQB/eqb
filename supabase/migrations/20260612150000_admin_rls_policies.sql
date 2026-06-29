-- Allow admins (super_admin role) to read/write all data needed for admin dashboard

-- Helper: check if current user is super_admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE auth_user_id = auth.uid()
    AND role = 'super_admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Profiles: allow admins to read all profiles (replaces old policy)
DROP POLICY IF EXISTS "students_read_own_profile" ON profiles;
CREATE POLICY "students_read_own_profile"
ON profiles FOR SELECT
TO authenticated
USING (
  auth_user_id = auth.uid()
  OR is_super_admin()
);

-- Past questions: allow admins to read any status; admins can insert any status
DROP POLICY IF EXISTS "students_read_published_questions" ON past_questions;
CREATE POLICY "students_read_published_questions"
ON past_questions FOR SELECT
TO authenticated
USING (
  is_super_admin()
  OR (
    status = 'published'
    AND course_id IN (
      SELECT id FROM courses
      WHERE
        scope = 'general'
        OR department_id = current_student_department()
        OR id IN (
          SELECT course_id FROM department_courses
          WHERE department_id = current_student_department()
        )
    )
  )
);

DROP POLICY IF EXISTS "students_insert_questions" ON past_questions;
CREATE POLICY "students_insert_questions"
ON past_questions FOR INSERT
TO authenticated
WITH CHECK (
  is_super_admin()
  OR (
    uploaded_by = (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    AND (SELECT is_locked FROM profiles WHERE auth_user_id = auth.uid()) = false
  )
);

-- Flags: allow admins to read all flags; students can read their own flags
CREATE POLICY "admins_read_flags"
ON flags FOR SELECT
TO authenticated
USING (
  is_super_admin()
  OR flagged_by = (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
);

-- Platform settings: allow admins full read/write
CREATE POLICY "admins_read_settings"
ON platform_settings FOR SELECT
TO authenticated
USING (is_super_admin());

CREATE POLICY "admins_update_settings"
ON platform_settings FOR UPDATE
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());
