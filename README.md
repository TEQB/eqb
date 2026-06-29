# EQB — UniPastQ

A community-driven past questions archive for university students. Built with Next.js 14 (App Router), Supabase, and Tailwind CSS.

## Features

- **Programme-scoped browse** — questions are filtered by the student's faculty, department, and level.
- **AI-moderated uploads** — every uploaded PDF/image is reviewed before it goes live.
- **Inline viewers** — read past questions directly in the browser, or download as PDF.
- **Community flagging** — content can be flagged for review.
- **Community solutions** — students can attach text or PDF/image answers, vote, and rate (1–5 stars).
- **Admin dashboard** — moderation queue, feedback inbox, programme/course management.

## Tech Stack

- [Next.js](https://nextjs.org) — App Router, Server Components, dynamic imports.
- [React 19](https://react.dev) + TypeScript.
- [Supabase](https://supabase.com) — Auth, Postgres, RLS, Storage.
- [Tailwind CSS](https://tailwindcss.com) — design system.
- [React Hook Form](https://react-hook-form.com) + [Zod](https://zod.dev) — validation.
- [Base UI](https://base-ui.com) — accessible primitives.

## Local Development

```bash
npm install
cp .env.local.example .env.local   # fill in Supabase keys
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

## Scripts

| Command             | Description                          |
|---------------------|--------------------------------------|
| `npm run dev`       | Start the dev server                 |
| `npm run build`     | Production build                     |
| `npm run lint`      | ESLint (Next.js config)              |
| `npm run typecheck` | `tsc --noEmit`                       |

## Project Layout

```
src/
  app/
    (public)/    — landing, login, register
    (student)/   — dashboard, browse, course, question, upload, profile, feedback
    admin/       — admin dashboard, moderation, settings
  components/
    auth/        — auth flows
    landing/     — public landing page parts
    layout/      — chrome (header, sidebars, sidebar items)
    question/    — viewers, filters, flagging
    solutions/   — community solutions: form, list, card, ratings, votes
  lib/           — Supabase clients, validation, shared helpers
  types/         — generated Supabase types
supabase/
  migrations/    — SQL migrations
```
