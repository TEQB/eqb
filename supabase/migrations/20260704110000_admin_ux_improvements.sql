-- Add lock_reason to profiles for disable-with-reason
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS lock_reason text;

-- Add is_read to feedback_messages for dashboard read tracking
ALTER TABLE feedback_messages ADD COLUMN IF NOT EXISTS is_read boolean NOT NULL DEFAULT false;

-- Index for querying unread feedback
CREATE INDEX IF NOT EXISTS idx_feedback_messages_is_read ON feedback_messages(is_read) WHERE is_read = false;
