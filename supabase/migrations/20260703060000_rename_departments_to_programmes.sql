-- Rename academic "department" entity to "programme" across schema, RLS, and triggers.

-- ---------------------------------------------------------------------------
-- Tables and columns
-- ---------------------------------------------------------------------------
ALTER TABLE departments RENAME TO programmes;
ALTER TABLE department_courses RENAME TO programme_courses;

ALTER TABLE courses RENAME COLUMN department_id TO programme_id;
ALTER TABLE programme_courses RENAME COLUMN department_id TO programme_id;
ALTER TABLE profiles RENAME COLUMN department_id TO programme_id;
ALTER TABLE pending_registrations RENAME COLUMN department_id TO programme_id;

-- ---------------------------------------------------------------------------
-- Indexes (rename for clarity; not required for correctness)
-- ---------------------------------------------------------------------------
ALTER INDEX IF EXISTS idx_profiles_department_id RENAME TO idx_profiles_programme_id;
ALTER INDEX IF EXISTS idx_courses_department_id RENAME TO idx_courses_programme_id;
ALTER INDEX IF EXISTS idx_courses_scope_department RENAME TO idx_courses_scope_programme;
ALTER INDEX IF EXISTS idx_departments_faculty_id RENAME TO idx_programmes_faculty_id;
ALTER INDEX IF EXISTS idx_courses_department_level RENAME TO idx_courses_programme_level;
ALTER INDEX IF EXISTS idx_profiles_department_current_level RENAME TO idx_profiles_programme_current_level;

-- ---------------------------------------------------------------------------
-- Helper function
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION current_student_programme()
RETURNS uuid AS $$
  SELECT programme_id FROM profiles
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

DROP FUNCTION IF EXISTS current_student_department();

-- ---------------------------------------------------------------------------
-- Auth trigger: new users store programme_id in metadata
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    auth_user_id,
    full_name,
    matric_number,
    programme_id,
    current_level,
    role
  ) VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'matric_number',
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'programme_id', ''),
      NULLIF(NEW.raw_user_meta_data->>'department_id', '')
    )::uuid,
    (NEW.raw_user_meta_data->>'current_level')::int,
    'student'
  );
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- RLS: programmes (formerly departments)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "anyone_can_read_departments" ON programmes;
CREATE POLICY "anyone_can_read_programmes"
ON programmes FOR SELECT USING (true);

DROP POLICY IF EXISTS "admins_insert_departments" ON programmes;
DROP POLICY IF EXISTS "admins_update_departments" ON programmes;
DROP POLICY IF EXISTS "admins_delete_departments" ON programmes;

CREATE POLICY "admins_insert_programmes"
ON programmes FOR INSERT TO authenticated
WITH CHECK (is_super_admin());

CREATE POLICY "admins_update_programmes"
ON programmes FOR UPDATE TO authenticated
USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY "admins_delete_programmes"
ON programmes FOR DELETE TO authenticated
USING (is_super_admin());

-- ---------------------------------------------------------------------------
-- RLS: programme_courses (formerly department_courses)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "anyone_read_dept_courses" ON programme_courses;
CREATE POLICY "anyone_read_programme_courses"
ON programme_courses FOR SELECT USING (true);

DROP POLICY IF EXISTS "admins_insert_dept_courses" ON programme_courses;
DROP POLICY IF EXISTS "admins_update_dept_courses" ON programme_courses;
DROP POLICY IF EXISTS "admins_delete_dept_courses" ON programme_courses;

CREATE POLICY "admins_insert_programme_courses"
ON programme_courses FOR INSERT TO authenticated
WITH CHECK (is_super_admin());

CREATE POLICY "admins_update_programme_courses"
ON programme_courses FOR UPDATE TO authenticated
USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY "admins_delete_programme_courses"
ON programme_courses FOR DELETE TO authenticated
USING (is_super_admin());

-- ---------------------------------------------------------------------------
-- RLS: courses
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "students_read_relevant_courses" ON courses;
CREATE POLICY "students_read_relevant_courses"
ON courses FOR SELECT TO authenticated
USING (
  is_super_admin()
  OR scope = 'general'
  OR programme_id = current_student_programme()
  OR id IN (
    SELECT course_id FROM programme_courses
    WHERE programme_id = current_student_programme()
  )
);

-- ---------------------------------------------------------------------------
-- RLS: past_question_pages (still references course visibility)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "students_read_question_pages" ON past_question_pages;
CREATE POLICY "students_read_question_pages"
ON past_question_pages FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM past_questions pq
        WHERE pq.id = past_question_pages.question_id
        AND (
            pq.status = 'published'
            AND pq.course_id IN (
                SELECT id FROM courses
                WHERE
                    scope = 'general'
                    OR programme_id = current_student_programme()
                    OR id IN (
                        SELECT course_id FROM programme_courses
                        WHERE programme_id = current_student_programme()
                    )
            )
        )
    )
    OR EXISTS (
        SELECT 1 FROM past_questions pq
        JOIN profiles p ON p.id = pq.uploaded_by
        WHERE pq.id = past_question_pages.question_id
        AND p.auth_user_id = auth.uid()
    )
);
