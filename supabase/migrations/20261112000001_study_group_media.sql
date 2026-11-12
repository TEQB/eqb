-- Study group chat: reply-to + image messages + private media storage

-- 1. Extend messages for replies and media
ALTER TABLE study_group_messages
  ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES study_group_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS media_url text;

-- Relax content constraint: text messages need content; image messages need media_url
ALTER TABLE study_group_messages DROP CONSTRAINT IF EXISTS study_group_messages_content_check;
ALTER TABLE study_group_messages
  ADD CONSTRAINT study_group_messages_content_check CHECK (
    (type = 'text' AND content IS NOT NULL AND length(content) BETWEEN 1 AND 2000)
    OR (type = 'image' AND media_url IS NOT NULL)
    OR (type = 'voice' AND media_url IS NOT NULL)
  );

-- Allow content to be null for media messages
ALTER TABLE study_group_messages ALTER COLUMN content DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_study_group_messages_reply_to ON study_group_messages(reply_to_id);

-- 2. Private storage bucket for chat media
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', false)
ON CONFLICT (id) DO NOTHING;

-- 3. Helper: is the current user a member of a group?
CREATE OR REPLACE FUNCTION is_group_member(p_group_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM study_group_members
    WHERE group_id = p_group_id AND profile_id = current_profile_id()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 4. Storage RLS: group members can upload/read objects in their group's folder.
-- Object path convention: chat-media/{group_id}/{uuid}.{ext}
DROP POLICY IF EXISTS "members_upload_chat_media" ON storage.objects;
CREATE POLICY "members_upload_chat_media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-media'
    AND is_group_member(((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "members_read_chat_media" ON storage.objects;
CREATE POLICY "members_read_chat_media"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-media'
    AND is_group_member(((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "members_delete_chat_media" ON storage.objects;
CREATE POLICY "members_delete_chat_media"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'chat-media'
    AND is_group_member(((storage.foldername(name))[1])::uuid)
  );
