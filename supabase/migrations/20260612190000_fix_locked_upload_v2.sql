-- Allow locked students to upload (simpler policy, no function dependency)
DROP POLICY IF EXISTS "students_insert_questions" ON past_questions;
CREATE POLICY "students_insert_questions"
ON past_questions FOR INSERT
TO authenticated
WITH CHECK (
  uploaded_by = (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
);
