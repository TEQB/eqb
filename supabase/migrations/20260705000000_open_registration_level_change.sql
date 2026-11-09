-- Open registration (any email + optional matric) + student self-level-change
--
-- Adds admin-configurable settings:
--   * open_registration_levels: levels where students can register with any
--     email and NO matric number (e.g. new 100-level intake without school
--     email / matric yet). Configurable so a new set can be toggled each year.
--   * level_change_enabled: when true, students can update their own current
--     level (new academic session). Enforced by the update_student_level() RPC.
--
-- Makes profiles.matric_number and pending_registrations.matric_number
-- nullable so open-registration students can sign up without one.

-- ---------------------------------------------------------------------------
-- 1. New platform_settings columns
-- ---------------------------------------------------------------------------
ALTER TABLE platform_settings
  ADD COLUMN IF NOT EXISTS open_registration_levels int[] NOT NULL DEFAULT '{}';

ALTER TABLE platform_settings
  ADD COLUMN IF NOT EXISTS level_change_enabled bool NOT NULL DEFAULT false;

-- ---------------------------------------------------------------------------
-- 2. Make matric number optional (open-registration students have none yet)
-- ---------------------------------------------------------------------------
ALTER TABLE profiles ALTER COLUMN matric_number DROP NOT NULL;
ALTER TABLE pending_registrations ALTER COLUMN matric_number DROP NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. handle_new_user: treat empty-string matric as NULL (avoids '' UNIQUE
--    collisions between open-registration students)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    auth_user_id,
    full_name,
    matric_number,
    programme_id,
    current_level,
    role
  ) VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'matric_number', ''), NULL),
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'programme_id', ''),
      NULLIF(NEW.raw_user_meta_data->>'department_id', '')
    )::uuid,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'current_level', ''), '100')::int,
    'student'
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Allow anon + authenticated to read public platform settings
--    (settings are not sensitive: obligation window, lockout flag, open
--     registration levels, level-change flag). Needed so the register flow
--     can read open_registration_levels before the user is authenticated.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "anyone_read_public_settings" ON platform_settings;
CREATE POLICY "anyone_read_public_settings"
ON platform_settings FOR SELECT
TO anon, authenticated
USING (true);

-- ---------------------------------------------------------------------------
-- 5. update_student_level(p_level) RPC
--    Called by both web and mobile clients via supabase.rpc(). Validates that
--    level change is enabled and that the requested level is available for the
--    student's programme before updating. SECURITY DEFINER so it runs with
--    table-owner privileges (bypasses RLS); scoped to the calling user via
--    auth.uid().
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_student_level(p_level int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prog_id uuid;
  v_levels int[];
  v_enabled bool;
BEGIN
  SELECT level_change_enabled INTO v_enabled FROM platform_settings LIMIT 1;
  IF NOT COALESCE(v_enabled, false) THEN
    RAISE EXCEPTION 'Level change is not currently enabled';
  END IF;

  SELECT programme_id INTO v_prog_id
  FROM profiles
  WHERE auth_user_id = auth.uid();

  IF v_prog_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  SELECT available_levels INTO v_levels
  FROM programmes
  WHERE id = v_prog_id;

  IF p_level IS NULL OR v_levels IS NULL OR NOT (p_level = ANY(v_levels)) THEN
    RAISE EXCEPTION 'Selected level is not available for your programme';
  END IF;

  UPDATE profiles
  SET current_level = p_level
  WHERE auth_user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION update_student_level(int) TO authenticated;
