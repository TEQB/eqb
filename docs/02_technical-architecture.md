# Technical Architecture

**University Past Questions Platform**
Version 1.0 — Design & Architecture Phase

---

## 1. Architecture Pattern

The platform follows a **Jamstack + BFF (Backend-for-Frontend)** pattern:

- **Next.js App Router** serves all pages — static where possible, server-rendered for authenticated views
- **Supabase** acts as the primary backend: auth, database, storage, and realtime
- **Next.js Route Handlers** provide a thin custom API layer only where Supabase client calls are insufficient (Gemini integration, admin-only actions)
- **No standalone Express/Node server** — all backend logic lives in route handlers or database functions/triggers

This keeps the infrastructure minimal, the deployment simple (Vercel + Supabase), and the surface area for bugs small.

---

## 2. Full Stack Diagram

```
Browser
  │
  ├── Next.js App Router (Vercel)
  │     ├── /app/(public)/         → landing, login, register
  │     ├── /app/(student)/        → dashboard, browse, course, upload
  │     ├── /app/(admin)/          → hidden admin panel
  │     └── /app/api/              → route handlers
  │           ├── /api/moderate    → Gemini upload review
  │           └── /api/admin/...   → admin-only mutations
  │
  ├── Supabase Auth
  │     └── OTP email via Supabase SMTP
  │
  ├── Supabase PostgreSQL
  │     ├── Row Level Security policies
  │     ├── Database triggers (flag auto-suspend, upload unlock)
  │     └── pg_cron (daily lockout job)
  │
  ├── Supabase Storage
  │     ├── private/pending/       → files awaiting Gemini review
  │     └── public/approved/       → published past questions
  │
  └── Google Gemini 1.5 Flash API
        └── Vision-capable, free tier (1,500 req/day)
```

---

## 3. Database Architecture

### 3.1 Tables

#### `faculties`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `name` | text | e.g. Faculty of Science |
| `slug` | text unique | e.g. faculty-of-science |
| `created_at` | timestamptz | |

#### `departments`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `faculty_id` | uuid FK → faculties | |
| `name` | text | e.g. Computer Science |
| `slug` | text unique | |
| `available_levels` | int[] | e.g. {100,200,300,400} — varies per dept |
| `created_at` | timestamptz | |

#### `courses`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `department_id` | uuid FK → departments | null for general courses |
| `code` | text | e.g. CSC 301 |
| `title` | text | e.g. Data Structures |
| `level` | int | e.g. 300 |
| `scope` | text | `departmental` \| `shared` \| `general` |
| `created_at` | timestamptz | |

#### `department_courses` (junction — for shared courses)
| Column | Type | Notes |
|---|---|---|
| `department_id` | uuid FK → departments | |
| `course_id` | uuid FK → courses | |
| PRIMARY KEY | (department_id, course_id) | |

#### `profiles`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `auth_user_id` | uuid FK → auth.users | Supabase auth |
| `full_name` | text | |
| `matric_number` | text unique | |
| `department_id` | uuid FK → departments | |
| `current_level` | int | Dashboard default level filter |
| `role` | text | `student` \| `super_admin` |
| `last_upload_at` | timestamptz | Updated on publish trigger |
| `is_locked` | bool | default false |
| `created_at` | timestamptz | |

#### `platform_settings`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | Single row only |
| `upload_obligation_days` | int | default 90 |
| `lockout_enabled` | bool | Master switch |
| `updated_at` | timestamptz | |

#### `past_questions`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `course_id` | uuid FK → courses | |
| `uploaded_by` | uuid FK → profiles | |
| `level` | int | Denormalized from course |
| `file_url` | text | Supabase Storage path |
| `file_type` | text | `pdf` \| `image` |
| `year` | int | e.g. 2023 |
| `semester` | text | `first` \| `second` |
| `status` | text | `pending_review` \| `published` \| `rejected` \| `suspended` |
| `ai_rejection_reason` | text | Populated on Gemini fail |
| `flag_count` | int | Denormalized counter — default 0 |
| `created_at` | timestamptz | |

#### `solutions`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `question_id` | uuid FK → past_questions | |
| `submitted_by` | uuid FK → profiles | |
| `body` | text | Typed solution text (nullable) |
| `file_url` | text | Optional file (nullable) |
| `upvotes` | int | Denormalized — default 0 |
| `downvotes` | int | Denormalized — default 0 |
| `status` | text | `published` \| `pending_review` \| `rejected` |
| `created_at` | timestamptz | |

#### `solution_votes`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `solution_id` | uuid FK → solutions | |
| `voter_id` | uuid FK → profiles | |
| `vote` | text | `up` \| `down` |
| `created_at` | timestamptz | |
| UNIQUE | (solution_id, voter_id) | Prevents double voting |

#### `flags`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `question_id` | uuid FK → past_questions | |
| `flagged_by` | uuid FK → profiles | |
| `reason` | text | `wrong_course` \| `poor_quality` \| `duplicate` \| `inappropriate` |
| `created_at` | timestamptz | |
| UNIQUE | (question_id, flagged_by) | One flag per student per question |

---

### 3.2 Key Database Functions & Triggers

#### Auto-create profile on signup
```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (auth_user_id, full_name, matric_number, department_id, current_level, role)
  VALUES (
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

#### Auto-suspend at 3 flags
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
  IF NEW.status = 'published' AND OLD.status != 'published' THEN
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

#### Daily lockout cron job
```sql
SELECT cron.schedule(
  'daily-lockout-check',
  '0 2 * * *',  -- runs at 2am daily
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

#### Solution vote counter trigger
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

---

### 3.3 Row Level Security Policies

#### Students can only read published questions in their department
```sql
CREATE POLICY "students_read_dept_questions"
ON past_questions FOR SELECT
USING (
  status = 'published'
  AND course_id IN (
    SELECT c.id FROM courses c
    WHERE
      c.scope = 'general'
      OR c.department_id = (
        SELECT department_id FROM profiles
        WHERE auth_user_id = auth.uid()
      )
      OR c.id IN (
        SELECT course_id FROM department_courses
        WHERE department_id = (
          SELECT department_id FROM profiles
          WHERE auth_user_id = auth.uid()
        )
      )
  )
);
```

#### Students can only insert their own uploads
```sql
CREATE POLICY "students_insert_questions"
ON past_questions FOR INSERT
WITH CHECK (
  uploaded_by = (
    SELECT id FROM profiles WHERE auth_user_id = auth.uid()
  )
  AND (
    SELECT is_locked FROM profiles WHERE auth_user_id = auth.uid()
  ) = false
);
```

#### Students cannot update past_questions (only the system can via triggers)
```sql
CREATE POLICY "no_student_update_questions"
ON past_questions FOR UPDATE
USING (false);
```

---

## 4. Storage Architecture

Two buckets in Supabase Storage:

| Bucket | Access | Purpose |
|---|---|---|
| `pending` | Private | Files uploaded but not yet reviewed by Gemini |
| `approved` | Public (with RLS) | Files that passed AI review and are published |

**Flow:**
1. Student uploads → file saved to `pending/` bucket
2. Gemini reviews file from `pending/` URL
3. On pass → file moved to `approved/` bucket, `file_url` updated
4. On fail → file deleted from `pending/`, student notified

---

## 5. Gemini Integration

**Endpoint:** `POST /api/moderate`

**Request body:**
```json
{
  "fileUrl": "https://...",
  "fileType": "pdf|image",
  "courseName": "Data Structures",
  "courseCode": "CSC 301",
  "questionId": "uuid"
}
```

**Gemini prompt structure:**
```
You are reviewing a university past question upload.
Analyze the attached file and return ONLY a valid JSON object:
{ "pass": true|false, "reason": "..." }

Check all four — fail if ANY is false:
1. Is this clearly a university exam, test, or past question paper?
2. Is the image or PDF clear enough for a student to read?
3. Does the visible content match the course: [courseCode] — [courseName]?
4. Is the content free of harmful, offensive, or completely unrelated material?

Keep the reason under 20 words. No preamble. JSON only.
```

**On pass:** Update `past_questions.status` to `published`, move file to approved bucket
**On fail:** Update `past_questions.status` to `rejected`, save `ai_rejection_reason`, delete pending file

---

## 6. Authentication Flow

1. Student submits registration form (name, email, matric, faculty, department, level)
2. Server validates email domain against allowlist
3. Supabase Auth sends OTP to university email
4. Student enters OTP — Supabase verifies
5. `on_auth_user_created` trigger fires → profile row created
6. Session token issued → student redirected to dashboard

**Password reset:** Same OTP flow via email — consistent, no separate mechanism needed.

---

## 7. Deployment Architecture

| Layer | Service | Tier |
|---|---|---|
| Frontend + API routes | Vercel | Free / Hobby |
| Database + Auth | Supabase | Free |
| File Storage | Supabase Storage | Free (5GB) |
| AI Moderation | Google Gemini 1.5 Flash | Free (1,500 req/day) |
| Cron jobs | Supabase pg_cron | Included |
| Email (OTP) | Supabase SMTP | Free (limited) → upgrade to Resend for production |

**Estimated cost at launch: $0/month**
