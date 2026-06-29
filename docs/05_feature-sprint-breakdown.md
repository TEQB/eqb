# Feature Sprint Breakdown

**University Past Questions Platform**
Version 1.0 — Design & Architecture Phase

---

## Overview

The build is organized into **5 sprints**, each producing a shippable increment. Sprint 1 produces a working foundation. Each subsequent sprint adds a complete feature layer. The platform is fully functional after Sprint 4. Sprint 5 is hardening and polish.

| Sprint | Focus | Outcome |
|---|---|---|
| 1 | Foundation | Auth, DB, project scaffold |
| 2 | Core access | Browse + view + download |
| 3 | Upload pipeline | AI moderation, upload flow |
| 4 | Community features | Solutions, voting, flagging, lockout |
| 5 | Admin + polish | Admin panel, analytics, hardening |

---

## Sprint 1 — Foundation

**Goal:** A working Next.js app with authentication, database, and navigation shell.

### Database
- [ ] Create all Supabase tables with correct types and constraints
- [ ] Enable RLS on all tables (deny-by-default)
- [ ] Write and test all RLS policies
- [ ] Write `handle_new_user` trigger (auto-create profile on signup)
- [ ] Seed `platform_settings` with default values
- [ ] Create `faculties`, `departments`, `courses` seed data for one faculty
- [ ] Enable pg_cron extension

### Authentication
- [ ] Configure Supabase Auth (email OTP, university domain validation)
- [ ] Registration form: name, email, matric, faculty, department, level
- [ ] Email domain validation (client + server)
- [ ] OTP entry screen with resend option
- [ ] Login form
- [ ] Password reset via OTP
- [ ] Session handling via `@supabase/ssr` middleware
- [ ] Redirect unauthenticated users to login

### Project Scaffold
- [ ] Next.js 14 project with TypeScript + Tailwind + shadcn/ui
- [ ] Route group structure: `(public)`, `(student)`, `(admin)`
- [ ] Shared layout: header with search + avatar menu
- [ ] Sidebar navigation (desktop) + bottom nav (mobile)
- [ ] Middleware: auth check + lockout redirect
- [ ] Supabase type generation script in `package.json`
- [ ] Environment variable setup and validation

### Deliverable
A student can register with a university email, verify via OTP, and log in to see an empty dashboard shell with navigation.

---

## Sprint 2 — Core Access (Browse + View + Download)

**Goal:** Students can find and access past questions.

### Browse & Navigation
- [ ] Dashboard: course grid filtered to student's level (default)
- [ ] Level switcher on dashboard (all levels in student's dept)
- [ ] General courses section (visible to all, pinned at top)
- [ ] Faculty → Department → Level → Course sidebar tree
- [ ] Global search by course code or title
- [ ] Search results page with course cards

### Course Page
- [ ] List all published questions for a course
- [ ] Group by year descending
- [ ] Filter bar: year, semester, level
- [ ] Question row component: year, semester, file type, solution count
- [ ] Empty state when no questions exist yet

### View & Download
- [ ] Inline PDF viewer (react-pdf)
- [ ] Inline image viewer
- [ ] Download button (triggers Supabase Storage signed URL)
- [ ] Question detail page: metadata + file + solutions list (empty for now)

### RLS Verification
- [ ] Confirm students cannot access questions outside their department via direct API calls
- [ ] Confirm general courses appear for all students
- [ ] Confirm shared courses appear for students in linked departments

### Deliverable
A student can navigate from dashboard to any course in their department, view past questions inline, and The shouldn't be able to download them.

---

## Sprint 3 — Upload Pipeline (AI Moderation)

**Goal:** Students can upload past questions. Gemini reviews them automatically.

### Upload Flow
- [ ] Upload button on dashboard and course page
- [ ] Upload form: file picker (PDF/image), course selector, year, semester
- [ ] Client-side file validation: type, size limit (10MB)
- [ ] File upload to Supabase Storage `pending` bucket
- [ ] Create `past_questions` row with `status: pending_review`
- [ ] Trigger `POST /api/moderate` after successful file upload

### Gemini Integration
- [ ] `/api/moderate` route handler
- [ ] Gemini API setup with `@google/generative-ai`
- [ ] Prompt construction with file + course metadata
- [ ] JSON response parsing with error handling
- [ ] On pass: move file to `approved` bucket, update status to `published`, trigger `handle_question_published`
- [ ] On fail: update status to `rejected`, save `ai_rejection_reason`, delete pending file

### Upload Feedback
- [ ] Loading state during AI review ("Reviewing your upload...")
- [ ] Success notification: "Your upload was published"
- [ ] Rejection notification: reason from Gemini displayed clearly
- [ ] Re-upload prompt on rejection

### Upload Obligation (basic)
- [ ] Warning banner on dashboard when < 14 days remaining
- [ ] `last_upload_at` and `is_locked` updated by trigger on publish
- [ ] Lockout middleware redirect to upload wall
- [ ] Upload wall UI (cannot dismiss without uploading)

### Deliverable
A student can upload a past question, have it reviewed by Gemini, see it published instantly on the course page, and have their obligation window reset.

---

## Sprint 4 — Community Features

**Goal:** Solutions, voting, flagging, and full upload obligation enforcement.

### Solutions
- [ ] "Add solution" button on question detail page
- [ ] Solution form: text area + optional file upload
- [ ] Text-only solutions: auto-publish, no AI review
- [ ] File solutions: go through same Gemini 4-check review
- [ ] Solutions displayed below question, sorted by net votes (upvotes - downvotes)
- [ ] Solution card: author name, body text, file download (if any), vote buttons

### Solution Voting
- [ ] Upvote / downvote buttons
- [ ] One vote per student per solution (unique constraint enforced at DB)
- [ ] Vote triggers: increment `upvotes` or `downvotes` counter on `solutions`
- [ ] Visual feedback: selected vote state highlighted
- [ ] Prevent voting on own solution

### Community Flagging
- [ ] Flag button on every published past question
- [ ] Flag modal: reason selector (wrong course, poor quality, duplicate, inappropriate)
- [ ] Insert into `flags` table
- [ ] Prevent duplicate flag from same student (unique constraint)
- [ ] `on_flag_inserted` trigger: increment `flag_count`, auto-suspend at 3
- [ ] Visual feedback: "Thanks for reporting"
- [ ] Suspended questions disappear from browse immediately

### Upload Obligation — Full Enforcement
- [ ] `pg_cron` job: daily lockout check (lock students past obligation window)
- [ ] Admin can toggle lockout on/off in platform_settings
- [ ] Admin can change obligation window (days)
- [ ] Lockout wall fully enforced — cannot access any page until upload

### Deliverable
A student can submit solutions, rate other solutions, flag bad content, and the platform automatically suspends flagged content and locks inactive students.

---

## Sprint 5 — Admin Panel, Analytics & Hardening

**Goal:** Super Admin has full visibility and control. Platform is production-ready.

### Admin Panel
- [ ] Hidden route setup (`/admin/[secret-slug]`)
- [ ] Admin login (same Supabase Auth, role checked server-side)
- [ ] Dashboard: total questions, total students, uploads today, flag rate
- [ ] Suspended questions queue: review, restore, or permanently delete
- [ ] Student management: view all students, manually lock/unlock
- [ ] Faculty / Department / Course seed UI
- [ ] Platform settings: obligation window, lockout toggle

### Analytics
- [ ] Most uploaded courses (by question count)
- [ ] Most active students (by approved uploads)
- [ ] Flag rate by course (flag count / question count)
- [ ] Upload trend: questions per week chart

### Hardening
- [ ] Rate limiting on upload endpoint (prevent spam)
- [ ] Gemini API error handling + retry logic
- [ ] Supabase Storage error handling (file size exceeded, wrong type)
- [ ] Graceful error pages (404, 500)
- [ ] Input sanitization on all form fields
- [ ] CSRF protection on all route handlers
- [ ] Review all RLS policies with adversarial test cases

### Performance
- [ ] Static generation for landing page
- [ ] Next.js `unstable_cache` for course lists (invalidated on new upload)
- [ ] Pagination on course question list (20 per page)
- [ ] Lazy-load PDF viewer
- [ ] Image optimization via Next.js `<Image>`

### Deliverable
A fully hardened, production-ready platform with admin visibility and all self-sustaining mechanisms verified working end-to-end.

---

## Dependency Map

```
Sprint 1 (Auth + DB)
    └── Sprint 2 (Browse) — requires auth + DB
          └── Sprint 3 (Upload) — requires browse + auth
                └── Sprint 4 (Community) — requires upload + browse
                      └── Sprint 5 (Admin) — requires everything
```

All sprints are sequential. No sprint can be started before the previous is complete.
