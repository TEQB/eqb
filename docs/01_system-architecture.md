# System Architecture

**University Past Questions Platform**
Version 1.0 — Design & Architecture Phase

---

## 1. System Overview

The University Past Questions Platform is a web-only application that allows verified university students to browse, download, upload, and discuss past examination questions. The platform is designed to be **fully self-sustaining** — requiring zero ongoing human intervention after initial seeding at launch.

The only human with elevated access is the **Super Admin** (the builder), whose identity is never exposed to students. All moderation, access enforcement, and quality control is handled automatically by a combination of AI review, database triggers, and community signals.

---

## 2. Core Design Principles

| Principle | Implementation |
|---|---|
| Zero human moderation | Google Gemini AI reviews every upload before publish |
| Self-sustaining enforcement | Postgres triggers + pg_cron enforce upload obligations automatically |
| Access scoped by department | Row Level Security (RLS) policies enforce data isolation at DB level |
| Hidden admin identity | Admin route is secret, not linked anywhere in the public UI |
| Community as safety net | 3-flag threshold auto-hides content — no human decision needed |
| Denormalized for speed | `level` and `flag_count` duplicated where needed for fast queries |

---

## 3. Role System

The platform operates with exactly **two roles**.

### 3.1 Super Admin
- The builder — identity hidden from all students
- Access via a secret route (e.g. `/admin/x7k2-secret`) not linked anywhere public
- Capabilities: seed Faculty/Department/Course/Level structure, delete any content, view analytics, manage all accounts, configure platform settings (obligation window, lockout toggle)
- Super Admin row is inserted directly into the database once at launch — no UI for this

### 3.2 Student
- Any verified university member
- Capabilities: register, browse past questions (all levels in their department + all general courses), upload past questions, download past questions, submit solutions, rate solutions, flag content
- Access is automatically scoped to their registered department via RLS

---

## 4. Data Hierarchy

All content is organized in a strict four-level hierarchy:

```
Faculty
└── Department
    └── Course  (scope: departmental | shared | general)
        └── Past Questions  (grouped by level, year, semester)
            └── Solutions   (text and/or file, community-rated)
```

### Course Scope Types

| Scope | Description | Who can access |
|---|---|---|
| `departmental` | Standard dept course | Students in that department only |
| `shared` | Cross-department course | Students in linked departments (via `department_courses` junction table) |
| `general` | University-wide course (GST, ENT, USE) | Every student on the platform |

---

## 5. Self-Sustaining Mechanisms

### 5.1 AI Moderation (Gemini Flash)
- Every past question upload triggers a single Gemini API call
- Every solution file upload also goes through Gemini review
- Text-only solutions auto-publish without review (lower risk)
- Gemini returns `{ "pass": true/false, "reason": "..." }`
- Uses Google Gemini 1.5 Flash — free tier, 1,500 requests/day, vision-capable

**Four checks per upload:**
1. Is this recognizably an exam or past question document?
2. Is the image/PDF clear enough to read?
3. Does the content match the tagged course?
4. Is the content safe and appropriate?

### 5.2 Community Flagging
- Every student can flag any published past question
- Flag reasons: Wrong course / Poor quality / Duplicate / Inappropriate
- Flag count is stored as a denormalized counter on `past_questions.flag_count`
- A Postgres trigger increments the counter and checks the threshold on every insert into `flags`
- At 3 flags: status automatically changes to `suspended` — no admin action needed

### 5.3 Upload Obligation Enforcement
- Every student must upload at least one approved past question within the obligation window
- Window length is configured by the Super Admin in `platform_settings.upload_obligation_days` (default: 90)
- A `pg_cron` job runs daily, locking all students who have exceeded the window without uploading
- Locked students see only the upload wall — no browsing, no downloads
- Approval of an upload automatically unlocks the account via database trigger

### 5.4 Domain-Locked Registration
- Only emails matching the university domain (e.g. `@your-university-domain.edu.ng`) are accepted
- OTP is sent to the university email — verifying the student is a real enrolled person
- Matric number is stored as an additional identity anchor
- No manual approval step — the email domain is the gatekeeper

### 5.5 Scoped Access via RLS
- Supabase Row Level Security policies enforce department scoping at the database level
- Even if a student calls the API directly, they cannot read data outside their department
- This is not just a UI restriction — it is enforced in PostgreSQL

---

## 6. Upload State Machine

Every uploaded past question moves through the following states:

```
pending_review
    ├── pass  →  published
    │               ├── flag_count < 3  →  stays published
    │               └── flag_count >= 3 →  suspended
    └── fail  →  rejected  (student can fix and re-upload)
```

Solutions follow the same pattern for file uploads. Text-only solutions skip directly to `published`.

---

## 7. High-Level Component Map

```
┌─────────────────────────────────────────────────────┐
│                  Student Browser                    │
│              Next.js 14 (App Router)                │
└────────────────────────┬────────────────────────────┘
                         │
              ┌──────────▼──────────┐
              │   Supabase Auth     │
              │   (OTP email)       │
              └──────────┬──────────┘
                         │
         ┌───────────────▼────────────────┐
         │         Supabase               │
         │  ┌────────────────────────┐    │
         │  │  PostgreSQL + RLS      │    │
         │  │  (all app data)        │    │
         │  └────────────────────────┘    │
         │  ┌────────────────────────┐    │
         │  │  Supabase Storage      │    │
         │  │  (PDFs and images)     │    │
         │  └────────────────────────┘    │
         └───────────────┬────────────────┘
                         │
         ┌───────────────▼────────────────┐
         │   Next.js Route Handler        │
         │   /api/moderate                │
         │   (Gemini integration)         │
         └───────────────┬────────────────┘
                         │
         ┌───────────────▼────────────────┐
         │   Google Gemini 1.5 Flash      │
         │   (AI upload review)           │
         └────────────────────────────────┘
```

---

## 8. Navigation Structure (Student View)

```
Dashboard
├── General courses (visible to all)
│   └── [GST, ENT, USE, ...]
├── My department
│   ├── Level 100
│   │   └── [Course list]
│   ├── Level 200
│   │   └── [Course list]
│   └── [All levels in department]
└── Search (by course code or title)

Course Page
├── Past questions (filtered by year / semester / level)
│   ├── Inline preview
│   ├── Download
│   ├── Flag
│   └── Solutions
│       ├── View & rate solutions
│       └── Add solution
└── Upload past question
```

---

## 9. Security Model

| Concern | Mitigation |
|---|---|
| Unauthorized data access | Supabase RLS enforces department scoping at DB level |
| Fake student accounts | University email OTP + matric number verification |
| Bad content upload | Gemini AI pre-publish review |
| Post-publish bad content | Community flagging with auto-suspend at 3 flags |
| Admin identity exposure | Secret route, no UI link, admin role not visible to students |
| Double-voting on solutions | Unique constraint on `(solution_id, voter_id)` in `solution_votes` |
| Upload obligation bypass | Server-side lockout check — cannot be bypassed via URL manipulation |
