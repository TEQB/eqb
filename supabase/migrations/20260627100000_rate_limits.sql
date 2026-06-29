CREATE TABLE IF NOT EXISTS rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  count int NOT NULL DEFAULT 1,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_expires_at ON rate_limits(expires_at);
CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON rate_limits(key);

-- Cleanup expired entries
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void AS $$
  DELETE FROM rate_limits WHERE expires_at < now();
$$ LANGUAGE sql;
