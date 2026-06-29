# Tech Stack

**University Past Questions Platform**
Version 1.0 — Design & Architecture Phase

---

## 1. Stack Summary

| Layer | Technology | Version | Why |
|---|---|---|---|
| Frontend framework | Next.js | 14 (App Router) | SSR + SSG + API routes in one, Vercel-native |
| UI library | React | 18 | Component model, hooks, ecosystem |
| Styling | Tailwind CSS | 3.x | Utility-first, fast iteration, no CSS file overhead |
| Component library | shadcn/ui | latest | Accessible, unstyled-first, copy-paste components |
| Auth | Supabase Auth | — | OTP email built-in, session management, free tier |
| Database | Supabase PostgreSQL | 15 | RLS, triggers, pg_cron, free tier |
| Storage | Supabase Storage | — | S3-compatible, integrated with DB auth, free 5GB |
| ORM / query | Supabase JS Client | v2 | Type-safe queries, RLS-aware, realtime support |
| AI moderation | Google Gemini 1.5 Flash | — | Free tier (1,500 req/day), vision-capable |
| Hosting | Vercel | — | Zero-config Next.js deployment, free tier |
| Cron jobs | Supabase pg_cron | — | Postgres-native, no external scheduler needed |
| Email (OTP) | Supabase SMTP → Resend | — | Supabase default for dev, Resend for production |
| Type safety | TypeScript | 5.x | End-to-end types with Supabase codegen |
| PDF viewer | react-pdf | latest | In-browser PDF rendering, no third-party service |

---

## 2. Frontend Stack Detail

### Next.js 14 — App Router
The App Router is used throughout. Key decisions:

- **Server Components** for all browse/listing pages — fetches data server-side before render, fast initial load, SEO-friendly
- **Client Components** only where interactivity is required: upload form, flag modal, vote buttons, filter dropdowns
- **Route Groups** to separate public, student-authenticated, and admin layouts cleanly
- **Middleware** handles the lockout check — intercepts authenticated requests and redirects locked students to the upload wall before any page renders

```
/app
├── (public)/            → layout with no sidebar (landing, login, register)
├── (student)/           → layout with sidebar + lockout middleware
│   ├── dashboard/
│   ├── browse/
│   ├── course/[id]/
│   ├── upload/
│   └── question/[id]/
└── (admin)/             → hidden admin layout
    └── [secret-slug]/
```

### Tailwind CSS
- Mobile-first (`sm:`, `md:`, `lg:` breakpoints)
- Custom design tokens extended in `tailwind.config.ts` to match the design system
- `@apply` used sparingly — only for repeated utility combos (e.g. card base styles)

### shadcn/ui
Used for: Dialog, Sheet (mobile sidebar), Toast, Dropdown, Select, Tabs, Badge, Skeleton.
Not used for: custom components (CourseCard, QuestionRow, UploadForm) which are built from scratch.

### TypeScript
- Supabase CLI generates types from the database schema: `supabase gen types typescript`
- All database queries are fully typed
- No `any` — strict mode enabled in `tsconfig.json`

---

## 3. Backend Stack Detail

### Supabase PostgreSQL
- **Version:** PostgreSQL 15
- **Extensions enabled:** `uuid-ossp`, `pg_cron`, `pgcrypto`
- All business logic that must be atomic lives in Postgres functions and triggers (not in application code)
- RLS is enabled on all tables — no table has public read access without a policy

### Supabase Auth
- Email OTP via Supabase's built-in SMTP (dev) / Resend (production)
- Sessions stored as JWTs, verified server-side in Next.js middleware
- Custom metadata (`full_name`, `matric_number`, `department_id`, `current_level`) passed at signup and read by the `handle_new_user` trigger

### Supabase Storage
- Two buckets: `pending` (private) and `approved` (public with RLS)
- Max upload size: 10MB (enforced in bucket policy)
- Accepted MIME types: `application/pdf`, `image/jpeg`, `image/png`
- File path pattern: `approved/{department_id}/{course_id}/{question_id}.{ext}`

### Next.js Route Handlers (custom API)
Only two custom endpoints are needed beyond Supabase client calls:

#### `POST /api/moderate`
Handles Gemini AI review. Called server-side after file upload.
- Reads file from Supabase Storage `pending` bucket
- Constructs Gemini prompt with file + course metadata
- Parses JSON response
- Updates `past_questions.status` in DB
- Moves file between buckets on pass, deletes on fail

#### `POST /api/admin/[action]`
Admin-only mutations that bypass RLS (run with service role key).
- Accessible only from the admin panel route
- Verified against `super_admin` role before execution
- Examples: seed courses, restore suspended questions, delete content

### Google Gemini 1.5 Flash
- Used via `@google/generative-ai` npm package
- API key stored in Vercel environment variables (never in client bundle)
- Model: `gemini-1.5-flash` — fastest, cheapest, sufficient for this task
- Input: file as base64 or file URI + text prompt
- Output: JSON `{ "pass": boolean, "reason": string }`
- Rate limit: 1,500 requests/day on free tier — sufficient for a university-scale app

---

## 4. Infrastructure & DevOps

### Environment Variables
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server-only, never exposed to client

# Gemini
GEMINI_API_KEY=                   # server-only

# App config
NEXT_PUBLIC_UNIVERSITY_EMAIL_DOMAIN=@your-university-domain.edu.ng
ADMIN_SECRET_PATH=                # the hidden admin route slug
```

### Deployment Pipeline
```
Local dev
  └── push to GitHub
        └── Vercel auto-deploys on merge to main
              └── Preview deployments on every PR branch
```

### Database Migrations
- Managed via Supabase CLI: `supabase db push`
- Migration files live in `/supabase/migrations/`
- Schema changes are version-controlled and repeatable

---

## 5. Key Package List

```json
{
  "dependencies": {
    "next": "14.x",
    "react": "18.x",
    "react-dom": "18.x",
    "@supabase/supabase-js": "^2",
    "@supabase/ssr": "latest",
    "@google/generative-ai": "latest",
    "react-pdf": "latest",
    "react-hook-form": "latest",
    "zod": "latest",
    "date-fns": "latest",
    "clsx": "latest",
    "tailwind-merge": "latest",
    "lucide-react": "latest"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/node": "latest",
    "@types/react": "latest",
    "tailwindcss": "^3",
    "autoprefixer": "latest",
    "postcss": "latest",
    "supabase": "latest"
  }
}
```

---

## 6. What Is Deliberately Not Included

| Excluded | Reason |
|---|---|
| Redis / caching layer | Supabase + Next.js caching is sufficient at this scale |
| Separate Express server | Next.js route handlers cover all custom API needs |
| React Query / SWR | Next.js server components + Supabase realtime replace most client fetching |
| Prisma / Drizzle ORM | Supabase JS client with generated types is sufficient and simpler |
| Docker | Vercel + Supabase are fully managed — no container ops needed |
| Separate testing infrastructure | Unit + integration tests added in Sprint 3 after core features are stable |
