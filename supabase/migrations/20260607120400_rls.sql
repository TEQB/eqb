-- Enable RLS on all tables
ALTER TABLE faculties ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE past_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE solutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE solution_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE flags ENABLE ROW LEVEL SECURITY;

-- Helper function: get current student's department_id
CREATE OR REPLACE FUNCTION current_student_department()
RETURNS uuid AS $$
  SELECT department_id FROM profiles
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Faculties — public read
CREATE POLICY "anyone_can_read_faculties"
ON faculties FOR SELECT USING (true);

-- Departments — public read
CREATE POLICY "anyone_can_read_departments"
ON departments FOR SELECT USING (true);

-- Courses — students read based on scope
CREATE POLICY "students_read_relevant_courses"
ON courses FOR SELECT
TO authenticated
USING (
  scope = 'general'
  OR department_id = current_student_department()
  OR id IN (
    SELECT course_id FROM department_courses
    WHERE department_id = current_student_department()
  )
);

-- department_courses — public read
CREATE POLICY "anyone_read_dept_courses"
ON department_courses FOR SELECT USING (true);

-- Profiles — students read own profile only
CREATE POLICY "students_read_own_profile"
ON profiles FOR SELECT
TO authenticated
USING (auth_user_id = auth.uid());

CREATE POLICY "students_update_own_profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (
  auth_user_id = auth.uid()
  AND role = 'student'
);

-- Past questions — scoped read, insert for non-locked students
CREATE POLICY "students_read_published_questions"
ON past_questions FOR SELECT
TO authenticated
USING (
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
);

CREATE POLICY "students_insert_questions"
ON past_questions FOR INSERT
TO authenticated
WITH CHECK (
  uploaded_by = (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  AND (SELECT is_locked FROM profiles WHERE auth_user_id = auth.uid()) = false
);

-- Solutions
CREATE POLICY "students_read_published_solutions"
ON solutions FOR SELECT
TO authenticated
USING (status = 'published');

CREATE POLICY "students_insert_solutions"
ON solutions FOR INSERT
TO authenticated
WITH CHECK (
  submitted_by = (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
);

-- Solution votes
CREATE POLICY "students_read_votes"
ON solution_votes FOR SELECT
TO authenticated
USING (voter_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY "students_insert_votes"
ON solution_votes FOR INSERT
TO authenticated
WITH CHECK (
  voter_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  AND solution_id NOT IN (
    SELECT id FROM solutions
    WHERE submitted_by = (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  )
);

-- Flags
CREATE POLICY "students_insert_flags"
ON flags FOR INSERT
TO authenticated
WITH CHECK (
  flagged_by = (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
);
