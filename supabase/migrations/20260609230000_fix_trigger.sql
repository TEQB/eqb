-- Fix handle_new_user trigger: qualify profiles table with public schema
-- to avoid search_path issues when trigger fires from auth schema context
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'department_id', ''), '00000000-0000-0000-0000-000000000000')::uuid,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'current_level', ''), '100')::int,
    'student'
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
