-- Recreate trigger with exception handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    INSERT INTO profiles (
      auth_user_id,
      full_name,
      matric_number,
      department_id,
      current_level,
      role
    ) VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'matric_number',
      COALESCE(NULLIF(NEW.raw_user_meta_data->>'department_id', ''), '00000000-0000-0000-0000-000000000000')::uuid,
      COALESCE(NULLIF(NEW.raw_user_meta_data->>'current_level', ''), '100')::int,
      'student'
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Pending OTPs table
CREATE TABLE IF NOT EXISTS pending_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used bool NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_pending_otps_email ON pending_otps(email);
