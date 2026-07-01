-- EQB-003: Fix handle_new_user trigger to run BEFORE INSERT on auth.users
-- so that profile constraint failures roll back the auth.users insert
-- (AFTER INSERT cannot roll back the triggering statement)

-- Drop the existing AFTER trigger and replace with BEFORE
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If a profile already exists for this auth_user_id, the UNIQUE constraint
  -- on auth_user_id will raise an exception and roll back the entire transaction.
  -- Similarly, if matric_number is already taken, the UNIQUE constraint on
  -- matric_number raises an exception and rolls back auth.users.
  INSERT INTO public.profiles (
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
    (NEW.raw_user_meta_data->>'department_id')::uuid,
    (NEW.raw_user_meta_data->>'current_level')::int,
    'student'
  );
  RETURN NEW;
END;
$$;

-- BEFORE INSERT: fires before auth.users commit, so failures roll back the auth record
CREATE TRIGGER on_auth_user_created
BEFORE INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();