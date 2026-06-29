-- =============================================
-- Fix storage RLS: drop permissive approved bucket policy
-- Only super_admins (via admins_upload_approved) or
-- service_role (via service_role_all_storage) may insert
-- into the 'approved' bucket.
-- =============================================
DROP POLICY IF EXISTS "authenticated_upload_approved" ON storage.objects;

-- =============================================
-- Admin INSERT / UPDATE / DELETE policies
-- for every core table (defense-in-depth).
-- These are never needed at runtime because the
-- admin API uses the service-role client which
-- bypasses RLS entirely.  They exist so that any
-- accidental anon-client call from an admin
-- context is still safe.
-- =============================================

-- Faculties
CREATE POLICY "admins_insert_faculties"
ON faculties FOR INSERT
TO authenticated
WITH CHECK (is_super_admin());

CREATE POLICY "admins_update_faculties"
ON faculties FOR UPDATE
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "admins_delete_faculties"
ON faculties FOR DELETE
TO authenticated
USING (is_super_admin());

-- Departments
CREATE POLICY "admins_insert_departments"
ON departments FOR INSERT
TO authenticated
WITH CHECK (is_super_admin());

CREATE POLICY "admins_update_departments"
ON departments FOR UPDATE
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "admins_delete_departments"
ON departments FOR DELETE
TO authenticated
USING (is_super_admin());

-- Courses
CREATE POLICY "admins_insert_courses"
ON courses FOR INSERT
TO authenticated
WITH CHECK (is_super_admin());

CREATE POLICY "admins_update_courses"
ON courses FOR UPDATE
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "admins_delete_courses"
ON courses FOR DELETE
TO authenticated
USING (is_super_admin());

-- Department-Course links
CREATE POLICY "admins_insert_dept_courses"
ON department_courses FOR INSERT
TO authenticated
WITH CHECK (is_super_admin());

CREATE POLICY "admins_update_dept_courses"
ON department_courses FOR UPDATE
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "admins_delete_dept_courses"
ON department_courses FOR DELETE
TO authenticated
USING (is_super_admin());

-- Past questions
CREATE POLICY "admins_insert_questions"
ON past_questions FOR INSERT
TO authenticated
WITH CHECK (is_super_admin());

CREATE POLICY "admins_update_questions"
ON past_questions FOR UPDATE
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "admins_delete_questions"
ON past_questions FOR DELETE
TO authenticated
USING (is_super_admin());

-- Profiles (the trigger handle_new_user() still handles
-- student creation via SECURITY DEFINER).
CREATE POLICY "admins_insert_profiles"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (is_super_admin());

CREATE POLICY "admins_update_profiles"
ON profiles FOR UPDATE
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "admins_delete_profiles"
ON profiles FOR DELETE
TO authenticated
USING (is_super_admin());

-- Solutions
CREATE POLICY "admins_insert_solutions"
ON solutions FOR INSERT
TO authenticated
WITH CHECK (is_super_admin());

CREATE POLICY "admins_update_solutions"
ON solutions FOR UPDATE
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "admins_delete_solutions"
ON solutions FOR DELETE
TO authenticated
USING (is_super_admin());

-- Solution votes (admin read / delete; inserts are student-only)
CREATE POLICY "admins_read_votes"
ON solution_votes FOR SELECT
TO authenticated
USING (is_super_admin());

CREATE POLICY "admins_delete_votes"
ON solution_votes FOR DELETE
TO authenticated
USING (is_super_admin());

-- Flags
CREATE POLICY "admins_read_flags"
ON flags FOR SELECT
TO authenticated
USING (is_super_admin());

CREATE POLICY "admins_update_flags"
ON flags FOR UPDATE
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "admins_delete_flags"
ON flags FOR DELETE
TO authenticated
USING (is_super_admin());

-- Platform settings (already had SELECT + UPDATE for admins;
-- add INSERT and DELETE for completeness)
CREATE POLICY "admins_insert_settings"
ON platform_settings FOR INSERT
TO authenticated
WITH CHECK (is_super_admin());

CREATE POLICY "admins_delete_settings"
ON platform_settings FOR DELETE
TO authenticated
USING (is_super_admin());
