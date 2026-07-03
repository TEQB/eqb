-- Fix handle_new_user trigger to run AFTER INSERT with exception handling.
--
-- The previous migration (20260701000002_eqb003) changed the trigger to BEFORE
-- INSERT so that profile constraint failures would roll back the auth.users insert.
-- However, many code paths call supabase.auth.admin.createUser() without full
-- user_metadata (e.g. invite-admin passes no metadata, create-admin-account
-- passes only full_name), causing the trigger to crash on NULL NOT NULL columns.
--
-- Reverting to AFTER INSERT with exception handling ensures:
--   1. The auth user is always created successfully.
--   2. If the profile insert fails (missing metadata, bad FK, etc.), a WARNING
--      is logged but the auth record survives.
--   3. Application code (which already inserts/updates profiles after createUser)
--      handles profile creation as a separate step.

-- Drop the existing BEFORE trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Replace the function with AFTER INSERT semantics + exception handling
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
    NEW.raw_user_meta_data->>'matric_number',
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

-- Re-create as AFTER INSERT so a failed profile insert doesn't roll back the user
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();
