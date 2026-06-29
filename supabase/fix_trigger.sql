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
    -- Log and continue — profile will be created via API fallback
    RAISE WARNING 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
