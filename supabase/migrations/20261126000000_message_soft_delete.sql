-- Soft delete for study group messages
ALTER TABLE study_group_messages
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_study_group_messages_deleted
  ON study_group_messages(group_id, deleted_at);
