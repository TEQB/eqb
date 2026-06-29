SELECT cron.schedule(
  'daily-lockout-check',
  '0 2 * * *',
  $$
  UPDATE profiles
  SET is_locked = true
  WHERE
    role = 'student'
    AND is_locked = false
    AND (
      last_upload_at IS NULL
      OR last_upload_at < NOW() - (
        SELECT (upload_obligation_days || ' days')::interval
        FROM platform_settings LIMIT 1
      )
    )
    AND (SELECT lockout_enabled FROM platform_settings LIMIT 1) = true;
  $$
);
