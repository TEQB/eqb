ALTER TABLE past_questions
ADD COLUMN exam_type text NOT NULL DEFAULT 'examination'
  CHECK (exam_type IN ('mid_semester', 'examination'));
