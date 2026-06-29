-- Allow admins to read all courses
DROP POLICY IF EXISTS "students_read_relevant_courses" ON courses;
CREATE POLICY "students_read_relevant_courses"
ON courses FOR SELECT
TO authenticated
USING (
  is_super_admin()
  OR scope = 'general'
  OR department_id = current_student_department()
  OR id IN (
    SELECT course_id FROM department_courses
    WHERE department_id = current_student_department()
  )
);
