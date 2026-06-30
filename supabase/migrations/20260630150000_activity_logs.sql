CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  event text NOT NULL,
  message text NOT NULL,
  level text NOT NULL CHECK (level IN ('info', 'warn', 'error')),
  ip text,
  user_id uuid,
  user_email text,
  path text,
  method text,
  duration_ms integer,
  error_message text,
  metadata jsonb,
  user_agent text
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_event ON activity_logs(event);
CREATE INDEX IF NOT EXISTS idx_activity_logs_level ON activity_logs(level);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_ip ON activity_logs(ip);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all activity logs"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Service role can insert activity logs"
  ON activity_logs FOR INSERT
  TO service_role
  WITH CHECK (true);