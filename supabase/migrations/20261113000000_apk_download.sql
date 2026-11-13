-- Admin-configurable APK download link shown on landing page, dashboard, and mobile app
ALTER TABLE platform_settings
  ADD COLUMN IF NOT EXISTS apk_download_url text;
