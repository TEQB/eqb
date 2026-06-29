CREATE TABLE faculties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id uuid NOT NULL REFERENCES faculties(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  available_levels int[] NOT NULL DEFAULT '{100,200,300,400}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid REFERENCES departments(id) ON DELETE CASCADE,
  code text NOT NULL,
  title text NOT NULL,
  level int NOT NULL,
  scope text NOT NULL DEFAULT 'departmental'
    CHECK (scope IN ('departmental', 'shared', 'general')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE department_courses (
  department_id uuid NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  PRIMARY KEY (department_id, course_id)
);

CREATE TABLE profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  matric_number text NOT NULL UNIQUE,
  department_id uuid NOT NULL REFERENCES departments(id),
  current_level int NOT NULL,
  role text NOT NULL DEFAULT 'student'
    CHECK (role IN ('student', 'super_admin')),
  last_upload_at timestamptz,
  is_locked bool NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_obligation_days int NOT NULL DEFAULT 90,
  lockout_enabled bool NOT NULL DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

INSERT INTO platform_settings (upload_obligation_days, lockout_enabled)
VALUES (90, true);

CREATE TABLE past_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  level int NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL CHECK (file_type IN ('pdf', 'image')),
  year int NOT NULL CHECK (year >= 1990 AND year <= 2100),
  semester text NOT NULL CHECK (semester IN ('first', 'second')),
  status text NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'published', 'rejected', 'suspended')),
  ai_rejection_reason text,
  flag_count int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE solutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES past_questions(id) ON DELETE CASCADE,
  submitted_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body text,
  file_url text,
  upvotes int NOT NULL DEFAULT 0,
  downvotes int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'published'
    CHECK (status IN ('published', 'pending_review', 'rejected')),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT solution_has_content CHECK (body IS NOT NULL OR file_url IS NOT NULL)
);

CREATE TABLE solution_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solution_id uuid NOT NULL REFERENCES solutions(id) ON DELETE CASCADE,
  voter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vote text NOT NULL CHECK (vote IN ('up', 'down')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (solution_id, voter_id)
);

CREATE TABLE flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES past_questions(id) ON DELETE CASCADE,
  flagged_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason text NOT NULL
    CHECK (reason IN ('wrong_course', 'poor_quality', 'duplicate', 'inappropriate')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (question_id, flagged_by)
);
