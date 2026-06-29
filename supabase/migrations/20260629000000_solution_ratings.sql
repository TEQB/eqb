-- Add 1-5 star rating system for community solutions.
-- Each user can rate a solution once; the average (rating_sum / rating_count)
-- is sorted descending so the highest-rated solutions surface first.

ALTER TABLE solutions
  ADD COLUMN IF NOT EXISTS rating_sum int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_count int NOT NULL DEFAULT 0;

CREATE TABLE solution_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solution_id uuid NOT NULL REFERENCES solutions(id) ON DELETE CASCADE,
  rater_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (solution_id, rater_id)
);

CREATE INDEX idx_solution_ratings_solution_id ON solution_ratings(solution_id);

ALTER TABLE solution_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "students_read_solution_ratings"
ON solution_ratings FOR SELECT
USING (EXISTS (
  SELECT 1 FROM solutions s
  WHERE s.id = solution_ratings.solution_id
    AND s.status = 'published'
    AND s.question_id IN (
      SELECT id FROM past_questions WHERE status = 'published'
    )
));

CREATE POLICY "students_insert_solution_ratings"
ON solution_ratings FOR INSERT
WITH CHECK (
  rater_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM solutions s
    WHERE s.id = solution_ratings.solution_id
      AND s.status = 'published'
  )
);

CREATE POLICY "students_update_solution_ratings"
ON solution_ratings FOR UPDATE
USING (rater_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid()))
WITH CHECK (rater_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY "students_delete_solution_ratings"
ON solution_ratings FOR DELETE
USING (rater_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY "admins_read_solution_ratings"
ON solution_ratings FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.auth_user_id = auth.uid()
    AND profiles.role = 'super_admin'
));

-- Maintain denormalized rating_sum / rating_count on insert
CREATE OR REPLACE FUNCTION handle_solution_rating_insert()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE solutions
  SET
    rating_sum = rating_sum + NEW.rating,
    rating_count = rating_count + 1
  WHERE id = NEW.solution_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_solution_rating_inserted
AFTER INSERT ON solution_ratings
FOR EACH ROW EXECUTE FUNCTION handle_solution_rating_insert();

-- Maintain denormalized counters on update (rating changed)
CREATE OR REPLACE FUNCTION handle_solution_rating_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE solutions
  SET rating_sum = rating_sum + (NEW.rating - OLD.rating)
  WHERE id = NEW.solution_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_solution_rating_updated
AFTER UPDATE ON solution_ratings
FOR EACH ROW
WHEN (NEW.rating IS DISTINCT FROM OLD.rating)
EXECUTE FUNCTION handle_solution_rating_update();

-- Maintain denormalized counters on delete
CREATE OR REPLACE FUNCTION handle_solution_rating_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE solutions
  SET
    rating_sum = rating_sum - OLD.rating,
    rating_count = GREATEST(0, rating_count - 1)
  WHERE id = OLD.solution_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_solution_rating_deleted
AFTER DELETE ON solution_ratings
FOR EACH ROW EXECUTE FUNCTION handle_solution_rating_delete();

-- keep updated_at fresh
CREATE TRIGGER solution_ratings_updated
BEFORE UPDATE ON solution_ratings
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Index supporting the "sort by rating" query
CREATE INDEX IF NOT EXISTS idx_solutions_rating
  ON solutions((CASE WHEN rating_count > 0 THEN rating_sum::float / rating_count ELSE 0 END) DESC, created_at DESC);
