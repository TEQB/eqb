ALTER TABLE past_questions ADD COLUMN IF NOT EXISTS file_url_2 text;

CREATE INDEX IF NOT EXISTS idx_past_questions_file_url_2 ON past_questions(file_url_2) WHERE file_url_2 IS NOT NULL;