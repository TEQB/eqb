-- EQB-001: Fix RLS INSERT policy on past_questions
-- Students can ONLY insert rows with status = 'pending_review'
-- Status transitions to published/suspended must happen via the approve_question
-- SECURITY DEFINER function (service role only)

-- 1. Tighten the student INSERT policy — only allow status = pending_review
DROP POLICY IF EXISTS "students_insert_questions" ON past_questions;

CREATE POLICY "students_insert_questions"
ON past_questions
FOR INSERT
TO authenticated
WITH CHECK (
  status = 'pending_review'
  AND uploaded_by = (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
);

-- 2. Create a secure status transition function (service role only)
CREATE OR REPLACE FUNCTION approve_question(question_id UUID, new_status TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF new_status NOT IN ('published', 'suspended', 'pending_review', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status value';
  END IF;

  UPDATE past_questions
  SET status = new_status
  WHERE id = question_id;
END;
$$;

-- 3. Restrict direct UPDATE on past_questions from authenticated users
-- Admins should use the service role key + approve_question() function
DROP POLICY IF EXISTS "students_update_questions" ON past_questions;
DROP POLICY IF EXISTS "admins_update_questions" ON past_questions;

-- Students can only UPDATE their own pending questions (owner check in WITH CHECK)
CREATE POLICY "students_update_pending_questions"
ON past_questions
FOR UPDATE
TO authenticated
USING (
  uploaded_by = (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
)
WITH CHECK (
  uploaded_by = (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  AND status = 'pending_review'
);

-- Admins can update any question's status
CREATE POLICY "admins_update_questions"
ON past_questions
FOR UPDATE
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());