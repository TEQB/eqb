# Backend Build Prompt

**University Past Questions Platform**
Comprehensive prompt for an AI coding assistant to build the complete backend.

---

## Context

You are building the backend for a university past questions platform. The backend has no standalone server. It is composed entirely of:

1. **Supabase PostgreSQL** — all data, with Row Level Security, triggers, and pg_cron
2. **Next.js Route Handlers** — two custom endpoints (Gemini moderation + admin actions)
3. **Supabase Auth** — OTP-based email authentication
4. **Supabase Storage** — file storage for past question PDFs and images
5. **Google Gemini 1.5 Flash** — AI upload review

Read everything below before writing any SQL or TypeScript.

---

## Core Rules (Never Violate These)

1. **RLS on every table** — deny by default; only grant what is explicitly needed
2. **Service role key is server-only** — never in client bundle, never in `NEXT_PUBLIC_*` variables
3. **Business logic in Postgres** — anything that must be atomic (flag auto-suspend, upload unlock, vote counter) lives in a trigger, not in application code
4. **No trigger on auth.users** — you can only add a trigger via `AFTER INSERT ON auth.users` using `SECURITY DEFINER` function
5. **pg_cron jobs must be idempotent** — safe to run multiple times without side effects
6. **Validate inputs server-side** — never trust client-provided data, always re-validate in route handlers

---

## Part 1: Database Schema

Run these migrations in order.

### Migration 001 — Extensions
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

### Migration 002 — Core Tables
```sql
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
```

---

### Migration 003 — Indexes
```sql
CREATE INDEX idx_past_questions_course_id ON past_questions(course_id);
CREATE INDEX idx_past_questions_status ON past_questions(status);
CREATE INDEX idx_past_questions_level ON past_questions(level);
CREATE INDEX idx_past_questions_year ON past_questions(year);
CREATE INDEX idx_profiles_auth_user_id ON profiles(auth_user_id);
CREATE INDEX idx_profiles_department_id ON profiles(department_id);
CREATE INDEX idx_profiles_is_locked ON profiles(is_locked);
CREATE INDEX idx_solutions_question_id ON solutions(question_id);
CREATE INDEX idx_solutions_votes ON solutions((upvotes - downvotes) DESC);
CREATE INDEX idx_flags_question_id ON flags(question_id);
CREATE INDEX idx_courses_scope ON courses(scope);
CREATE INDEX idx_courses_department_id ON courses(department_id);
```

---

### Migration 004 — Triggers

#### Auto-create profile on user signup
```sql
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
```

#### Auto-suspend on flag threshold
```sql
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
```

#### Unlock account on approved upload
```sql
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
```

#### Solution vote counter
```sql
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
```

#### Update platform_settings updated_at
```sql
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
```

---

### Migration 005 — Row Level Security

#### Enable RLS on all tables
```sql
ALTER TABLE faculties ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE past_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE solutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE solution_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE flags ENABLE ROW LEVEL SECURITY;
```

#### Helper function: get current student's department_id
```sql
CREATE OR REPLACE FUNCTION current_student_department()
RETURNS uuid AS $$
  SELECT department_id FROM profiles
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

#### Faculties — public read
```sql
CREATE POLICY "anyone_can_read_faculties"
ON faculties FOR SELECT USING (true);
```

#### Departments — public read
```sql
CREATE POLICY "anyone_can_read_departments"
ON departments FOR SELECT USING (true);
```

#### Courses — students read based on scope
```sql
CREATE POLICY "students_read_relevant_courses"
ON courses FOR SELECT
TO authenticated
USING (
  scope = 'general'
  OR department_id = current_student_department()
  OR id IN (
    SELECT course_id FROM department_courses
    WHERE department_id = current_student_department()
  )
);
```

#### department_courses — public read
```sql
CREATE POLICY "anyone_read_dept_courses"
ON department_courses FOR SELECT USING (true);
```

#### Profiles — students read own profile only
```sql
CREATE POLICY "students_read_own_profile"
ON profiles FOR SELECT
TO authenticated
USING (auth_user_id = auth.uid());

CREATE POLICY "students_update_own_profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (
  auth_user_id = auth.uid()
  AND role = 'student'  -- prevent self-promotion
);
```

#### Past questions — scoped read, insert for non-locked students
```sql
CREATE POLICY "students_read_published_questions"
ON past_questions FOR SELECT
TO authenticated
USING (
  status = 'published'
  AND course_id IN (
    SELECT id FROM courses
    WHERE
      scope = 'general'
      OR department_id = current_student_department()
      OR id IN (
        SELECT course_id FROM department_courses
        WHERE department_id = current_student_department()
      )
  )
);

CREATE POLICY "students_insert_questions"
ON past_questions FOR INSERT
TO authenticated
WITH CHECK (
  uploaded_by = (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  AND (SELECT is_locked FROM profiles WHERE auth_user_id = auth.uid()) = false
);

-- No student UPDATE policy — only triggers and service role can update status
```

#### Solutions
```sql
CREATE POLICY "students_read_published_solutions"
ON solutions FOR SELECT
TO authenticated
USING (status = 'published');

CREATE POLICY "students_insert_solutions"
ON solutions FOR INSERT
TO authenticated
WITH CHECK (
  submitted_by = (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
);
```

#### Solution votes
```sql
CREATE POLICY "students_read_votes"
ON solution_votes FOR SELECT
TO authenticated
USING (voter_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY "students_insert_votes"
ON solution_votes FOR INSERT
TO authenticated
WITH CHECK (
  voter_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  AND solution_id NOT IN (
    SELECT id FROM solutions
    WHERE submitted_by = (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  )
);
```

#### Flags
```sql
CREATE POLICY "students_insert_flags"
ON flags FOR INSERT
TO authenticated
WITH CHECK (
  flagged_by = (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
);
```

#### Platform settings — no student access
```sql
-- Only accessible via service role
```

---

### Migration 006 — pg_cron Job
```sql
SELECT cron.schedule(
  'daily-lockout-check',
  '0 2 * * *',
  $$
  UPDATE profiles
  SET is_locked = true
  WHERE
    role = 'student'
    AND is_locked = false
    AND (
      last_upload_at IS NULL
      OR last_upload_at < NOW() - (
        SELECT (upload_obligation_days || ' days')::interval
        FROM platform_settings LIMIT 1
      )
    )
    AND (SELECT lockout_enabled FROM platform_settings LIMIT 1) = true;
  $$
);
```

---

## Part 2: Supabase Storage Setup

Create two buckets via Supabase dashboard or CLI:

```sql
-- pending bucket: private, files awaiting review
insert into storage.buckets (id, name, public)
values ('pending', 'pending', false);

-- approved bucket: public reads allowed (RLS still applies via signed URLs or public policy)
insert into storage.buckets (id, name, public)
values ('approved', 'approved', true);

-- Storage policies
CREATE POLICY "authenticated_upload_pending"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'pending');

CREATE POLICY "service_role_all_storage"
ON storage.objects
TO service_role
USING (true)
WITH CHECK (true);
```

---

## Part 3: Route Handlers

### `app/api/moderate/route.ts`
Build this endpoint completely. It must:

1. Verify student session (return 401 if none)
2. Accept `{ questionId, courseCode, courseName }` in request body
3. Validate all three fields are present and non-empty
4. Fetch the `past_questions` row using service client
5. Verify `uploaded_by` matches the requesting student's profile id (return 403 if not)
6. Verify status is `pending_review` (return 409 if already processed)
7. Download file from `pending` bucket using service client
8. Convert to base64
9. Build Gemini prompt (see prompt template below)
10. Call Gemini with file + prompt
11. Parse JSON response — handle malformed JSON gracefully
12. On **pass**:
    - Move file: copy from `pending/{file_url}` to `approved/{questionId}.{ext}`, then delete from pending
    - Update `past_questions`: `status = 'published'`, `file_url = new path`
    - Trigger fires automatically: updates `profiles.last_upload_at` and `is_locked`
13. On **fail**:
    - Delete file from pending bucket
    - Update `past_questions`: `status = 'rejected'`, `ai_rejection_reason = verdict.reason`
14. Return `{ pass: boolean, reason: string }`
15. Wrap entire operation in try/catch — on any Gemini error, set status back to `pending_review` and return 500

**Gemini prompt template:**
```
You are reviewing a university past question upload for a student platform.
Analyze the attached file carefully and return ONLY a valid JSON object — no preamble, no markdown, no explanation:
{ "pass": true or false, "reason": "..." }

Evaluate all four criteria. Fail if ANY single criterion is not met:

1. EXAM DOCUMENT: Is this file clearly a university examination, test paper, or past question paper? It should look like an official academic assessment with questions students are expected to answer.

2. READABILITY: Is the image or PDF sufficiently clear and legible for a student to read and study from? Blurry, extremely dark, or partially obscured documents should fail this check.

3. COURSE MATCH: Does the visible content of the document match the course it has been tagged as: "${courseCode} — ${courseName}"? Look for course codes, subject matter, department references, or any visible header information.

4. SAFE CONTENT: Is the document free from harmful, offensive, sexually explicit, or completely unrelated content?

Keep the reason field under 20 words. If pass is true, reason can be empty string.
Return JSON only.
```

### `app/api/admin/route.ts`
Build a multi-action admin endpoint. Must verify `super_admin` role on every request.

Support these actions via `?action=` query param:

- `seed-faculty` — POST, insert into faculties
- `seed-department` — POST, insert into departments
- `seed-course` — POST, insert into courses
- `restore-question` — POST, set past_questions.status = 'published' by id
- `delete-question` — DELETE, remove past_questions row and storage file by id
- `lock-student` — POST, set profiles.is_locked = true by id
- `unlock-student` — POST, set profiles.is_locked = false by id
- `update-settings` — POST, update platform_settings row

All mutations use the service client (bypasses RLS). Return appropriate HTTP status codes.

---

## Part 4: Middleware

Build `middleware.ts` to:

1. For routes matching `/dashboard`, `/browse`, `/course`, `/question`, `/profile`:
   - Check for valid Supabase session
   - If no session: redirect to `/login`
   - If session: check `profiles.is_locked`
   - If locked and not already on `/upload`: redirect to `/upload?locked=true`

2. For routes matching `/admin`:
   - Check session
   - If no session: redirect to `/login`
   - Check `profiles.role === 'super_admin'`
   - If not super_admin: redirect to `/`

3. Refresh session token on every request (standard Supabase SSR pattern)

---

## Part 5: Type Generation

After all migrations are run, generate TypeScript types:
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.ts
```

Use the generated `Database` type in all Supabase client calls:
```typescript
createServerClient<Database>(url, key, options)
```

---

## Part 6: Seed Data

Write a seed script (`supabase/seed.sql`) that inserts:
1. One faculty: "Faculty of Science"
2. Two departments under it: "Computer Science" (levels 100-400), "Electrical Engineering" (levels 100-500)
3. Three courses under Computer Science: CSC 101 (100 level), CSC 201 (200 level), CSC 301 (300 level)
4. Two general courses: GST 101 (Use of English, level 100), ENT 201 (Entrepreneurship, level 200)
5. One platform_settings row (already in migration, but confirm it exists)

---

## Error Handling Requirements

- Every route handler wrapped in try/catch
- Gemini API failures must not leave orphaned `pending_review` rows — always update status
- Storage errors must roll back DB changes
- Unique constraint violations (duplicate flag, duplicate vote) must return 409 with clear message
- Never return raw Supabase error objects to the client — sanitize first
- Log errors server-side with enough context to debug (questionId, userId, action)

---

## Security Checklist

Before considering any route handler complete, verify:
- [ ] Session verified before any DB operation
- [ ] Ownership verified before any mutation (student can only modify their own data)
- [ ] Service role key only used in server-side code
- [ ] All user-provided strings sanitized (no raw SQL interpolation — use parameterized queries)
- [ ] File type validated server-side before Gemini call
- [ ] Admin role re-verified on every admin endpoint call — not just at login
