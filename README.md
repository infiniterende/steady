# Steady

A habit-tracking web app: a daily plan of timed habit blocks, today's goals, longer-term goals, streaks and a small accountability group.

Built with **Next.js 16** (App Router), **Prisma** on **Supabase Postgres**, and **Supabase Auth**. Design references live in [`docs/design`](docs/design).

## What's here

| Route | What it is |
| --- | --- |
| `/` | Marketing homepage with Log in / Sign up |
| `/signup`, `/login` | Email + password auth (Supabase) |
| `/app` | **Today**: timers, points, today's goals, schedule blocks, day navigation |
| `/app/dashboard` | **Dashboard**: weekly KPIs, 7-day bar chart, progress by domain, goals |
| `/app/habits` | Habits list: log progress, pause/resume, add, archive |
| `/app/goals` | Goals: count goals (books read) and measurement goals (weight), with progress and next milestone |
| `/app/goals/[id]` | Goal detail: progress chart, daily log with backfill, milestones (auto-marked when reached), entry history |
| `/app/profile` | Profile: stats, about, daily points goal, log out |
| `/app/calendar` | Calendar: month grid with completion dots, reminders per habit, quiet hours / weekly digest |
| `/app/schedule` | Schedule: seven-day strip with block counts, week navigation, that day's blocks |
| `/app/streaks`, `/app/group` | Placeholders (not built yet) |

Every active habit automatically becomes a block on each day's schedule. Checking a block is worth 12 points, a task 5, a habit log 8, starting a timer 2. Streaks, the 12-week heatmap and the weekly chart are computed from block history.

## Setup

### 1. Supabase project

Create a project at [supabase.com](https://supabase.com), then copy `.env.example` to `.env` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Settings → API
- `DATABASE_URL` (pooled, port 6543) and `DIRECT_URL` (direct, port 5432) — Settings → Database
- `NEXT_PUBLIC_SITE_URL` — where confirmation emails should send users back (add it to Authentication → URL Configuration → Redirect URLs as `.../auth/callback`)

If email confirmations are enabled in Authentication → Providers → Email, sign-up shows a "check your inbox" state and the confirmation link lands on `/auth/callback`. Turn confirmations off for the quickest local loop.

### 2. Database

```bash
npm install
npm run db:deploy
```

`db:deploy` applies the migrations in `prisma/migrations` (the `init` migration creates all tables). `npm run db:migrate` creates a new migration after you change `prisma/schema.prisma`; `npm run db:generate` regenerates the Prisma client (also runs on `npm install`).

### 3. Run

```bash
npm run dev
```

The first visit to `/app` after signing up creates the user's profile and seeds a starter set of habits, today's goals and goals so the dashboard has something to show.

## Local Supabase (optional)

With Docker running you can develop against a fully local stack instead of a hosted project:

```bash
npx supabase start
```

The local API gateway is on port 54331 (`supabase/config.toml`). Point `.env` at the printed values (`API URL` → `NEXT_PUBLIC_SUPABASE_URL`, `anon key`, and `postgresql://postgres:postgres@127.0.0.1:54322/postgres` for both database URLs) and run `npm run db:deploy`. Email confirmation is off by default locally.

## Project layout

```
prisma/schema.prisma      Profile, Habit, Block, Task, Goal, GoalEntry, Milestone, PointEvent, Reminder
src/proxy.ts              Refreshes the Supabase session; guards /app
src/lib/supabase/         Server, browser and proxy Supabase clients
src/lib/data.ts           Queries: profile + seeding, block generation, streak math
src/lib/dates.ts          Day keys ("YYYY-MM-DD"), timezone, time parsing
src/lib/goals.ts          Goal progress, milestone status, pace notes (pure helpers)
src/app/(marketing)/      Homepage
src/app/(auth)/           Login / signup pages and server actions
src/app/app/              Signed-in app (layout, Today, Dashboard, Habits, Goals, Profile)
src/app/app/actions.ts    Server actions used by the app's client components
src/components/           UI: app shell, rail, today panels, dashboard chart, forms
```
