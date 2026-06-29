-- Allow students to browse published questions across all departments

DROP POLICY IF EXISTS "students_read_published_questions" ON public.past_questions;
CREATE POLICY "students_read_published_questions"
ON public.past_questions FOR SELECT
TO authenticated
USING (
  is_super_admin()
  OR status = 'published'
);
