-- Past question multi-page support: create past_question_pages table
-- TODO: In a follow-up migration, consider dropping file_url_2 column from past_questions
--       once the app is confirmed working end-to-end with past_question_pages.

CREATE TABLE IF NOT EXISTS past_question_pages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id uuid NOT NULL REFERENCES past_questions(id) ON DELETE CASCADE,
    page_number int NOT NULL CHECK (page_number >= 1 AND page_number <= 6),
    file_url text NOT NULL,
    file_type text NOT NULL CHECK (file_type IN ('pdf', 'image')),
    created_at timestamptz DEFAULT now(),
    UNIQUE (question_id, page_number)
);

CREATE INDEX IF NOT EXISTS idx_past_question_pages_question_id ON past_question_pages(question_id);

-- RLS for past_question_pages: read access mirrors past_questions visibility
-- Users can read pages for questions they can see
ALTER TABLE past_question_pages ENABLE ROW LEVEL SECURITY;

-- Read policy: same visibility rules as past_questions
-- Users can read pages if they can read the parent question
CREATE POLICY "students_read_question_pages"
ON past_question_pages FOR SELECT
TO authenticated
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
                    OR department_id = current_student_department()
                    OR id IN (
                        SELECT course_id FROM department_courses
                        WHERE department_id = current_student_department()
                    )
            )
        )
    )
    OR EXISTS (
        -- Users can also read pages for their own questions (for pending/rejected states during upload flow)
        SELECT 1 FROM past_questions pq
        JOIN profiles p ON p.id = pq.uploaded_by
        WHERE pq.id = past_question_pages.question_id
        AND p.auth_user_id = auth.uid()
    )
);

-- Service/admin insert policy (app-level inserts use service role, not direct user inserts)
-- past_question_pages rows are inserted by the app server using service role, not by users directly
CREATE POLICY "service_insert_question_pages"
ON past_question_pages FOR INSERT
TO authenticated
WITH CHECK (true); -- Service role bypasses RLS anyway; this is a placeholder

-- Service delete policy for cleanup operations
CREATE POLICY "service_delete_question_pages"
ON past_question_pages FOR DELETE
TO authenticated
USING (true); -- Service role bypasses RLS anyway

-- Backfill: for every existing past_questions row, insert page_number=1 from file_url
-- and page_number=2 from file_url_2 (if not null)
INSERT INTO past_question_pages (question_id, page_number, file_url, file_type)
SELECT pq.id, 1, pq.file_url, pq.file_type
FROM past_questions pq
WHERE pq.file_url IS NOT NULL
ON CONFLICT (question_id, page_number) DO NOTHING;

INSERT INTO past_question_pages (question_id, page_number, file_url, file_type)
SELECT pq.id, 2, pq.file_url_2, pq.file_type
FROM past_questions pq
WHERE pq.file_url_2 IS NOT NULL
ON CONFLICT (question_id, page_number) DO NOTHING;