-- Allow soft-deleted messages to have null content/media_url
ALTER TABLE study_group_messages DROP CONSTRAINT IF EXISTS study_group_messages_content_check;
ALTER TABLE study_group_messages
  ADD CONSTRAINT study_group_messages_content_check CHECK (
    deleted_at IS NOT NULL
    OR (type = 'text' AND content IS NOT NULL AND length(content) BETWEEN 1 AND 2000)
    OR (type = 'image' AND media_url IS NOT NULL)
    OR (type = 'voice' AND media_url IS NOT NULL)
  );
