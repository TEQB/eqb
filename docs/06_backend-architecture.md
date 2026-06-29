# Backend Architecture

**University Past Questions Platform**
Version 1.0 — Design & Architecture Phase

---

## 1. Backend Philosophy

There is no standalone backend server. The backend is composed of three layers:

1. **Supabase** — handles auth, the database, storage, and all standard CRUD via the JS client
2. **Postgres functions & triggers** — handle all business logic that must be atomic or server-enforced
3. **Next.js Route Handlers** — a thin custom API layer for the two operations Supabase client calls cannot handle alone (Gemini integration + admin-only service-role mutations)

This means zero servers to maintain, zero deployments beyond Vercel + Supabase, and zero ongoing ops overhead.

---

## 2. Request Flow

### Standard data request (browse, view)
```
Browser (React Server Component)
  → Supabase JS client (server-side)
  → PostgreSQL (RLS applied)
  → Returns filtered rows
  → Rendered as HTML on server
  → Sent to browser
```

### Upload request
```
Browser (Client Component)
  → Upload file to Supabase Storage (pending bucket)
  → Insert past_questions row (status: pending_review)
  → POST /api/moderate  (route handler)
       → Read file from storage
       → Call Gemini API
       → Parse JSON verdict
       → Update past_questions.status
       → Move file (pass) or delete file (fail)
       → Trigger fires: update profiles.last_upload_at + is_locked
  → Return result to browser
  → Show notification
```

### Flag request
```
Browser (Client Component)
  → Insert into flags table (via Supabase JS client)
  → Postgres trigger fires automatically:
       → Increment past_questions.flag_count
       → If flag_count >= 3: set status = 'suspended'
  → Browser polls / realtime subscription reflects change
```

---

## 3. Database Layer

### Connection
- **Anon key** (client-side): scoped to RLS policies — students can only read their own department's data
- **Service role key** (server-side only, in route handlers): bypasses RLS — used only for admin actions and the Gemini moderation endpoint

Never expose the service role key in client-side code or the browser bundle.

### Supabase JS Client Setup

```typescript
// lib/supabase/server.ts — for Server Components and Route Handlers
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) { return cookieStore.get(name)?.value },
        set(name, value, options) { cookieStore.set({ name, value, ...options }) },
        remove(name, options) { cookieStore.set({ name, value: '', ...options }) },
      },
    }
  )
}

// lib/supabase/service.ts — for admin/moderation route handlers only
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
```

---

## 4. Route Handlers

### `POST /api/moderate`

**Purpose:** Runs Gemini AI review on an uploaded file.

**Auth:** Requires valid session (anon key — student must be logged in).

**Request:**
```typescript
{
  questionId: string     // UUID of the past_questions row
  courseCode: string     // e.g. "CSC 301"
  courseName: string     // e.g. "Data Structures"
}
// File URL is read from past_questions row — not passed directly
```

**Logic:**
```typescript
export async function POST(req: Request) {
  const { questionId, courseCode, courseName } = await req.json()

  // 1. Verify student session
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // 2. Fetch question row (service client — read pending file URL)
  const service = createServiceClient()
  const { data: question } = await service
    .from('past_questions')
    .select('file_url, file_type, uploaded_by')
    .eq('id', questionId)
    .single()

  if (!question) return Response.json({ error: 'Not found' }, { status: 404 })

  // 3. Verify uploader matches session
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (question.uploaded_by !== profile.id)
    return Response.json({ error: 'Forbidden' }, { status: 403 })

  // 4. Download file from pending bucket
  const { data: fileData } = await service.storage
    .from('pending')
    .download(question.file_url)

  const fileBase64 = Buffer.from(await fileData.arrayBuffer()).toString('base64')

  // 5. Call Gemini
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

  const prompt = `
You are reviewing a university past question upload.
Analyze the attached file and return ONLY a valid JSON object:
{ "pass": true or false, "reason": "..." }

Check all four — fail if ANY is false:
1. Is this clearly a university exam, test, or past question paper?
2. Is the image or PDF clear enough for a student to read?
3. Does the visible content match the course: ${courseCode} — ${courseName}?
4. Is the content free of harmful, offensive, or completely unrelated material?

Keep the reason under 20 words. No preamble. JSON only.`

  const result = await model.generateContent([
    { inlineData: { mimeType: question.file_type === 'pdf' ? 'application/pdf' : 'image/jpeg', data: fileBase64 } },
    prompt
  ])

  // 6. Parse verdict
  const raw = result.response.text().trim()
  const verdict = JSON.parse(raw.replace(/```json|```/g, '').trim())

  // 7. Update DB + move/delete file
  if (verdict.pass) {
    const newPath = `approved/${questionId}.${question.file_type === 'pdf' ? 'pdf' : 'jpg'}`
    await service.storage.from('approved').copy(`pending/${question.file_url}`, newPath)
    await service.storage.from('pending').remove([question.file_url])
    await service.from('past_questions').update({
      status: 'published',
      file_url: newPath
    }).eq('id', questionId)
  } else {
    await service.storage.from('pending').remove([question.file_url])
    await service.from('past_questions').update({
      status: 'rejected',
      ai_rejection_reason: verdict.reason
    }).eq('id', questionId)
  }

  return Response.json({ pass: verdict.pass, reason: verdict.reason })
}
```

---

### `POST /api/admin/seed`

**Purpose:** Allows Super Admin to seed faculties, departments, courses.

**Auth:** Requires `super_admin` role — verified server-side before any mutation.

```typescript
export async function POST(req: Request) {
  const service = createServiceClient()
  const supabase = createClient()

  // Verify super_admin role
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await service
    .from('profiles')
    .select('role')
    .eq('auth_user_id', user?.id)
    .single()

  if (profile?.role !== 'super_admin')
    return Response.json({ error: 'Forbidden' }, { status: 403 })

  // Proceed with seed operation...
}
```

---

## 5. Middleware

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const supabase = createServerClient(/* ... */)

  const { data: { session } } = await supabase.auth.getSession()

  // Protect student routes
  if (request.nextUrl.pathname.startsWith('/dashboard') ||
      request.nextUrl.pathname.startsWith('/browse') ||
      request.nextUrl.pathname.startsWith('/course') ||
      request.nextUrl.pathname.startsWith('/question')) {

    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Check lockout
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_locked')
      .eq('auth_user_id', session.user.id)
      .single()

    if (profile?.is_locked && !request.nextUrl.pathname.startsWith('/upload')) {
      return NextResponse.redirect(new URL('/upload?locked=true', request.url))
    }
  }

  // Protect admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!session) return NextResponse.redirect(new URL('/login', request.url))
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('auth_user_id', session.user.id)
      .single()
    if (profile?.role !== 'super_admin')
      return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/browse/:path*', '/course/:path*',
            '/question/:path*', '/upload/:path*', '/admin/:path*']
}
```

---

## 6. Data Fetching Patterns

### Server Component (listing pages)
```typescript
// app/(student)/browse/page.tsx
import { createClient } from '@/lib/supabase/server'

export default async function BrowsePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('department_id, current_level')
    .eq('auth_user_id', user!.id)
    .single()

  const { data: courses } = await supabase
    .from('courses')
    .select('id, code, title, level, scope, department_id')
    .or(`scope.eq.general,department_id.eq.${profile!.department_id}`)
    .order('level')

  return <CourseGrid courses={courses} defaultLevel={profile!.current_level} />
}
```

### Client Component (interactive, e.g. upload form)
```typescript
'use client'
import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

---

## 7. Error Handling Strategy

| Error type | Handling |
|---|---|
| Gemini API timeout | Retry once after 3s; on second failure, set status to `pending_review` and notify admin |
| Gemini returns invalid JSON | Catch parse error, treat as fail with reason "Review could not be completed — please re-upload" |
| Storage upload failure | Delete partial record, show user "Upload failed — please try again" |
| RLS policy violation | Supabase returns 403 — surface as "You don't have access to this content" |
| Duplicate flag | Supabase returns 409 (unique violation) — surface as "You've already flagged this" |
| Duplicate vote | Same as flag — "You've already voted on this solution" |
| pg_cron failure | Supabase logs alert — jobs are idempotent so re-running is safe |

---

## 8. Background Jobs

### Daily lockout check
```sql
-- Runs at 2am daily via pg_cron
-- Idempotent — safe to run multiple times
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
```

No other scheduled jobs are needed. All other automation runs via Postgres triggers on data events.
