-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
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
    (NEW.raw_user_meta_data->>'department_id')::uuid,
    (NEW.raw_user_meta_data->>'current_level')::int,
    'student'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-suspend on flag threshold
CREATE OR REPLACE FUNCTION handle_new_flag()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE past_questions
  SET
    flag_count = flag_count + 1,
    status = CASE
      WHEN flag_count + 1 >= 3 THEN 'suspended'
      ELSE status
    END
  WHERE id = NEW.question_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_flag_inserted
AFTER INSERT ON flags
FOR EACH ROW EXECUTE FUNCTION handle_new_flag();

-- Unlock account on approved upload
CREATE OR REPLACE FUNCTION handle_question_published()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status != 'published') THEN
    UPDATE profiles
    SET
      last_upload_at = NOW(),
      is_locked = false
    WHERE id = NEW.uploaded_by;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_question_status_change
AFTER UPDATE ON past_questions
FOR EACH ROW EXECUTE FUNCTION handle_question_published();

-- Solution vote counter
CREATE OR REPLACE FUNCTION handle_solution_vote()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.vote = 'up' THEN
    UPDATE solutions SET upvotes = upvotes + 1 WHERE id = NEW.solution_id;
  ELSE
    UPDATE solutions SET downvotes = downvotes + 1 WHERE id = NEW.solution_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_vote_inserted
AFTER INSERT ON solution_votes
FOR EACH ROW EXECUTE FUNCTION handle_solution_vote();

-- Update platform_settings updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER platform_settings_updated
BEFORE UPDATE ON platform_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
