-- Performance indexes for query optimization

-- loadPublishedQuestionCounts: past_questions queried by course_id + status
CREATE INDEX IF NOT EXISTS idx_past_questions_course_status
  ON past_questions(course_id, status)
  WHERE status = 'published';

-- loadStudentCourseGroups: courses queried by scope + department_id
CREATE INDEX IF NOT EXISTS idx_courses_scope_department
  ON courses(scope, department_id);

-- Browse: departments filtered by faculty
CREATE INDEX IF NOT EXISTS idx_departments_faculty_id
  ON departments(faculty_id);

-- Browse: courses filtered + ordered by department_id, level
CREATE INDEX IF NOT EXISTS idx_courses_department_level
  ON courses(department_id, level, code);

-- Profiles: fast lookup by department for dashboard queries
CREATE INDEX IF NOT EXISTS idx_profiles_department_current_level
  ON profiles(department_id, current_level);

-- Solutions: fast lookup by question_id with rating ordering
CREATE INDEX IF NOT EXISTS idx_solutions_question_rating
  ON solutions(question_id, rating_count DESC, rating_sum DESC);

-- Solution ratings: unique constraint to prevent duplicate ratings
CREATE UNIQUE INDEX IF NOT EXISTS idx_solution_ratings_unique
  ON solution_ratings(solution_id, rater_id);