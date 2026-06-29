# Frontend Build Prompt

**University Past Questions Platform**
Comprehensive prompt for an AI coding assistant to build the complete frontend.

---

## Context

You are building the frontend for a university past questions platform. This is a web-only app used by university students to browse, download, and upload past examination questions. The platform is built with Next.js 14 (App Router), TypeScript, Tailwind CSS, and shadcn/ui. The backend is entirely Supabase (auth, database, storage). There is no separate API server — all data fetching happens via the Supabase JS client.

Read everything below carefully before writing a single line of code.

---

## Core Rules (Never Violate These)

1. **TypeScript strict mode** — no `any`, no `!` non-null assertions without a comment explaining why
2. **Server Components by default** — only use `'use client'` when you need browser APIs, event handlers, or React hooks
3. **No client-side data fetching for listing pages** — all browse, course, and question list pages fetch server-side
4. **RLS is the access control layer** — never filter data in the UI assuming the DB will return everything; write queries as if the DB returns only what the student is allowed to see (because it does)
5. **Mobile-first** — every component must work on a 375px wide screen before being extended for desktop
6. **No hardcoded colors** — use only the design system tokens (see Design System doc)
7. **Accessibility** — all interactive elements need aria labels, focus rings, and keyboard navigation

---

## Tech Stack

```
Framework:        Next.js 14 (App Router)
Language:         TypeScript 5 (strict)
Styling:          Tailwind CSS 3
Components:       shadcn/ui (Dialog, Sheet, Toast, Select, Tabs, Badge, Skeleton, Dropdown)
Forms:            react-hook-form + zod
Icons:            lucide-react
PDF viewer:       react-pdf (lazy loaded)
Supabase:         @supabase/supabase-js v2 + @supabase/ssr
Date formatting:  date-fns
Class merging:    clsx + tailwind-merge (via cn() utility)
```

---

## Environment Variables Required

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=         # server-only — never in client bundle
GEMINI_API_KEY=                    # server-only
NEXT_PUBLIC_UNIVERSITY_EMAIL_DOMAIN=@your-university-domain.edu.ng
ADMIN_SECRET_PATH=                 # the hidden admin route slug
```

---

## File Structure to Build

```
app/
├── (public)/
│   ├── layout.tsx
│   ├── page.tsx                   → Landing page
│   ├── login/page.tsx
│   └── register/
│       ├── page.tsx
│       └── verify/page.tsx
├── (student)/
│   ├── layout.tsx                 → Sidebar + header + obligation check
│   ├── dashboard/page.tsx
│   ├── browse/page.tsx
│   ├── course/[id]/page.tsx
│   ├── question/[id]/page.tsx
│   ├── upload/page.tsx
│   └── profile/page.tsx
├── (admin)/
│   └── [secret]/
│       ├── layout.tsx
│       ├── page.tsx
│       ├── questions/page.tsx
│       ├── students/page.tsx
│       └── settings/page.tsx
└── api/
    ├── moderate/route.ts
    └── admin/route.ts

components/
├── layout/
│   ├── Sidebar.tsx
│   ├── Header.tsx
│   ├── BottomNav.tsx
│   └── MobileSidebarSheet.tsx
├── auth/
│   ├── RegisterForm.tsx
│   ├── LoginForm.tsx
│   └── OtpForm.tsx
├── browse/
│   ├── CourseCard.tsx
│   ├── CourseGrid.tsx
│   ├── LevelTabs.tsx
│   └── SearchBar.tsx
├── question/
│   ├── QuestionRow.tsx
│   ├── QuestionList.tsx
│   ├── QuestionFilters.tsx
│   ├── PdfViewer.tsx
│   ├── FlagModal.tsx
│   └── DownloadButton.tsx
├── upload/
│   ├── UploadForm.tsx
│   ├── FileDropzone.tsx
│   ├── UploadWall.tsx
│   └── ObligationBanner.tsx
├── solutions/
│   ├── SolutionList.tsx
│   ├── SolutionCard.tsx
│   ├── SolutionForm.tsx
│   └── VoteButtons.tsx
└── admin/
    ├── SuspendedQueue.tsx
    ├── AnalyticsCards.tsx
    └── SeedForm.tsx

lib/
├── supabase/
│   ├── server.ts
│   ├── client.ts
│   └── service.ts
├── validations.ts
└── utils.ts

middleware.ts
```

---

## Page-by-Page Build Instructions

### 1. Landing Page `app/(public)/page.tsx`
- Statically generated (no auth required)
- Show: platform name, one-sentence description, "Get started" and "Log in" buttons
- Show live stats: total questions, total students (ISR, revalidate every 24h)
- No sidebar, centered content, max-width 640px

### 2. Register `app/(public)/register/page.tsx`
Build the `RegisterForm` component with `react-hook-form` + zod.

Fields in this exact order:
1. Full name (text)
2. University email — validate domain on blur, show error immediately if wrong domain
3. Matric number
4. Faculty (Select — fetch all faculties on mount)
5. Department (Select — fetch departments filtered by selected faculty, reset when faculty changes)
6. Level (Select — fetch `available_levels` from selected department, show as "100 Level", "200 Level" etc.)
7. Password (min 8 chars)

On submit:
```typescript
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: { full_name, matric_number, department_id, current_level }
  }
})
```
Then redirect to `/register/verify`.

OTP screen `app/(public)/register/verify/page.tsx`:
- 6-box OTP input (build as a single controlled input that renders 6 separate digit boxes)
- Countdown timer: 10:00, ticks down every second
- "Resend OTP" button appears after 60s
- On verify: `supabase.auth.verifyOtp({ email, token, type: 'signup' })` → redirect to `/dashboard`

### 3. Login `app/(public)/login/page.tsx`
Standard email + password form. On success redirect to `/dashboard`. On lockout, middleware will redirect to upload wall.

### 4. Student Layout `app/(student)/layout.tsx`
- Fetch student profile server-side
- Pass `daysRemaining` to `ObligationBanner` (calculate from `last_upload_at` + `upload_obligation_days`)
- Desktop: sidebar (240px) + header + main content
- Mobile: header + main content + bottom nav (no sidebar in layout — sheet opened from header)
- Wrap in a provider that makes the student profile available to client components via context

### 5. Dashboard `app/(student)/dashboard/page.tsx`
Fetch server-side:
```typescript
const { data: courses } = await supabase
  .from('courses')
  .select('id, code, title, level, scope, department_id')
  .or(`scope.eq.general,department_id.eq.${profile.department_id}`)
  .order('level')
```

Render:
- ObligationBanner (if daysRemaining <= 14)
- "General courses" section — always pinned at top
- LevelTabs — tabs for each level in `profile.department.available_levels`
- CourseGrid — courses for the active tab level
- Default active tab = `profile.current_level`

### 6. Course Page `app/(student)/course/[id]/page.tsx`
Fetch:
- Course metadata
- All published past questions for this course (ordered by year desc, then semester)

Render:
- Course header: code + title + department + level + "X past questions"
- QuestionFilters (year multi-select, semester radio, client component)
- QuestionList (filtered by QuestionFilters state)
- Upload FAB (floating action button, bottom-right, mobile only)
- Upload button in header (desktop)

QuestionFilters should update URL params (`?year=2023&semester=first`) so filters are shareable and survive page refresh.

### 7. Question Detail `app/(student)/question/[id]/page.tsx`
Fetch:
- Question metadata + file URL (signed URL for download)
- Solutions (ordered by `upvotes - downvotes` desc)

Render (stacked):
1. Breadcrumb: Faculty → Department → Course
2. Question header: year, semester, level, file type badge
3. File viewer: PdfViewer (lazy) or `<img>` depending on `file_type`
4. Download button: generates signed URL on click, triggers browser download
5. Flag button: opens FlagModal
6. Divider + "Community Solutions" heading
7. SolutionList
8. SolutionForm (collapsed behind "Add a solution" button, expands inline)

### 8. Upload Page `app/(student)/upload/page.tsx`
Receives `?locked=true` query param when accessed from lockout redirect.

Two modes based on `locked` param:
- Normal: header + form
- Locked: UploadWall component (full-screen, no nav visible)

Upload flow (implement entirely in `UploadForm`):
```
1. User selects file (FileDropzone) + fills metadata
2. On submit:
   a. Upload file to Supabase Storage pending bucket
      path: `pending/{uuid}.{ext}`
   b. Insert into past_questions
      { course_id, uploaded_by: profile.id, level: course.level, file_url, file_type, year, semester, status: 'pending_review' }
   c. Call POST /api/moderate with { questionId, courseCode, courseName }
   d. Show loading state: "Our AI is reviewing your upload..."
   e. On pass: show success + "View your question →" link
   f. On fail: show rejection reason + "Fix and re-upload" button
```

### 9. Sidebar `components/layout/Sidebar.tsx`
Build a collapsible tree:
```
📌 General Courses
   GST 101 — Use of English
   ENT 201 — Entrepreneurship
   ...

📚 Computer Science (my dept)
  ▼ 100 Level
      CSC 101, CSC 102...
  ▶ 200 Level
  ▶ 300 Level
  ▶ 400 Level
```

- Active course highlighted
- Levels collapse/expand (accordion — only one level open at a time)
- `current_level` is auto-expanded on mount
- Scrollable if long

---

## Component Specifications

### `CourseCard`
```typescript
interface CourseCardProps {
  id: string
  code: string        // monospace font
  title: string
  level: number
  scope: 'departmental' | 'shared' | 'general'
  questionCount: number
  solutionCount?: number
}
```
Card with hover state, click navigates to `/course/${id}`.
Scope badge: "General" (purple) for general, "Shared" (blue) for shared, nothing for departmental.

### `QuestionRow`
```typescript
interface QuestionRowProps {
  id: string
  year: number
  semester: 'first' | 'second'
  fileType: 'pdf' | 'image'
  solutionCount: number
  flagCount: number
}
```
Row with: year + semester label, file type badge, solution count, download button, flag button.
Row body click → navigate to `/question/${id}`.
Download button click → `stopPropagation()` then trigger download.

### `ObligationBanner`
```typescript
interface ObligationBannerProps {
  daysRemaining: number
}
// Only render if daysRemaining <= 14
// daysRemaining <= 3: danger styling
// daysRemaining 4–14: warning styling
```

### `VoteButtons`
```typescript
interface VoteButtonsProps {
  solutionId: string
  upvotes: number
  downvotes: number
  userVote: 'up' | 'down' | null
  isOwn: boolean  // disable if student submitted this solution
}
```
On click: insert into solution_votes. Handle unique constraint error gracefully.
Optimistic update: update local count immediately, revert on error.

### `FileDropzone`
- Drag-and-drop + click to upload
- Shows file name, size, and type icon after selection
- Validates: max 10MB, PDF/JPG/PNG only
- Clear button to deselect

---

## Middleware

```typescript
// middleware.ts
// Protect (student) routes:
//   - Redirect to /login if no session
//   - Check profiles.is_locked
//   - If locked and not on /upload: redirect to /upload?locked=true
// Protect (admin) routes:
//   - Redirect to /login if no session
//   - Check profiles.role === 'super_admin'
//   - If not admin: redirect to /dashboard
```

---

## Supabase Client Setup

```typescript
// lib/supabase/server.ts — Server Components, Route Handlers
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export function createClient() {
  const cookieStore = cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { /* get/set/remove */ } }
  )
}

// lib/supabase/client.ts — Client Components only
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

---

## Error & Loading States

Every page and component must handle:
- **Loading state**: use shadcn `Skeleton` components that match the shape of the loaded content
- **Empty state**: friendly message + CTA (e.g. "No past questions yet — be the first to upload!")
- **Error state**: show error message with retry option, never a blank screen
- **Network error**: catch Supabase errors and surface them as toast notifications

---

## Important UI Details

- Course codes (e.g. CSC 301, GST 101) always render in `font-mono`
- Status badges use both color and text — never color alone
- All buttons have `:disabled` states styled with `opacity-50 cursor-not-allowed`
- All links use Next.js `<Link>` — never `<a>` for internal navigation
- Toast notifications appear top-right (desktop) / top-center (mobile) and auto-dismiss after 4s
- Every form has a loading state on submit — disable all inputs + show spinner on button

---

## What NOT to Build

- No dark mode toggle (not in scope for v1)
- No student-to-student messaging
- No notifications feed page (toasts only for now)
- No social sharing buttons
- No pagination UI beyond simple "Load more" button (no numbered pages)
