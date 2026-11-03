# Steady

A habit-tracking web app: a daily plan of timed habit blocks, today's goals, longer-term goals, streaks, a planner and a journal.

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
| `/app/calendar` | Calendar: month grid with completion dots and item pips; click a day to see and add events, tasks and reminders; "This week" list of upcoming reminders and events; habit reminders; a heads-up reminder N minutes before every timed block, event and task (default 5); in-app toasts and optional browser notifications; quiet hours / weekly digest |
| `/app/journal` | Journal: one entry per day with a title, mood, insertable prompts and up to six photos; searchable timeline of entries, a daily completion card with journal streak, and monthly mood stats |
| `/app` (Today) | Your three for today (up to three priorities, starred from the goals list), a **Help me start** button that turns a task into one small first action with an optional 5-minute timer, a focus timer with a clear stop time, and habit blocks you can log at **minimum / standard / stretch** size in one tap |
| `/app/planner` | Planner: the week as a grid of day cards (Boxed) or a single column (List). Each day can have a label pill, a note and a color, plus tasks, timed items grouped into Morning / Afternoon / Evening, and yellow reminder callouts with an optional @place. Add tasks inline, or use the quick-add line (`Essay due fri 5pm #assignment !1 remind 1h @library`). Open items from earlier days collect in an Overdue card. Reminders show an in-app popup with Mark done and Snooze, play a chime and send a system notification while Steady is open in a tab |
| `/app/review` | Weekly review: last 7 days vs the 7 before, what worked, what was skipped three or more times, comebacks after missed days, and one rule-based suggestion you can approve or skip |
| `/app/schedule` | Schedule: seven-day strip, a 15-minute timeblock timeline for the selected day (blocks, events, tasks, reminders, now line, click-to-add), and the day's block list |

Every active habit automatically becomes a block on each day's schedule. Checking a block is worth 12 points, a task 5, a habit log 8, starting a timer 2. Streaks, the 12-week heatmap and the weekly chart are computed from block history.

## Setup

### 1. Supabase project

Create a project at [supabase.com](https://supabase.com), then copy `.env.example` to `.env` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY` on older projects) — Settings → API
- `DATABASE_URL` (pooled, port 6543) and `DIRECT_URL` (direct, port 5432) — Settings → Database
- `NEXT_PUBLIC_SITE_URL` — where confirmation emails should send users back (add it to Authentication → URL Configuration → Redirect URLs as `.../auth/callback`)

If email confirmations are enabled in Authentication → Providers → Email, sign-up shows a "check your inbox" state and the confirmation link lands on `/auth/callback`. Turn confirmations off for the quickest local loop.

### 2. Database

```bash
npm install
npm run db:deploy
```

Journal photos live in a private Supabase Storage bucket and are uploaded straight from the browser to it (up to 15 MB each, six per day), so the app server's request size limit doesn't apply. Create it and its owner-only policies by running `supabase/migrations/20261021220000_journal_photos_bucket.sql` in the SQL editor (or `supabase db push` on a linked project).

`db:deploy` applies the migrations in `prisma/migrations` (the `init` migration creates all tables). `npm run db:migrate` creates a new migration after you change `prisma/schema.prisma`; `npm run db:generate` regenerates the Prisma client (also runs on `npm install`).

Optional: set `ANTHROPIC_API_KEY` in `.env` and **Help me start** asks Claude (Haiku) for the first step. Without it, or if the call fails, a small set of readable rules in `src/lib/firstStep.ts` is used. Only the task title is sent.

### Installable app (PWA)

Steady is an installable web app: `src/app/manifest.ts` (name, icons, standalone display, start at `/app`), `public/sw.js` (service worker: offline fallback page, caches only immutable build assets, never signed-in pages or data), icons in `public/icons` and `src/app/apple-icon.png`. The service worker registers only in production builds. On Android and desktop Chrome the app shows an Install button on phones; on iPhone it shows an "Add to Home Screen" hint (Safari only offers installing through the Share menu). Pages are checked at 375px wide, and on touch devices form fields use 16px text (stops iPhone zoom) and small buttons get a larger tap area. Installing requires HTTPS in production.

### Security: row-level security

Every table has row-level security on, with an owner-only policy for signed-in users and no access for the anonymous role (`prisma/migrations/20261102130000_row_level_security`). The app talks to the database through Prisma as the database owner, so it is unaffected; RLS only governs Supabase's public API. When you add a table, enable RLS and add a policy in the same migration, then run `npm run check:rls` (it fails if any table is exposed).

### 3. Run

```bash
npm run dev
```

The first visit to `/app` after signing up creates an empty profile. New accounts see a short setup card on Today: pick any starter habits (each with minimum, standard and stretch sizes), add one priority for today, or start with a clean slate. Nothing is created unless it is picked.

## Local Supabase (optional)

With Docker running you can develop against a fully local stack instead of a hosted project:

```bash
npx supabase start
```

The local stack needs the storage service for journal photos, so don't exclude `storage-api` when starting it.

The local API gateway is on port 54331 (`supabase/config.toml`). Point `.env` at the printed values (`API URL` → `NEXT_PUBLIC_SUPABASE_URL`, `anon key`, and `postgresql://postgres:postgres@127.0.0.1:54322/postgres` for both database URLs) and run `npm run db:deploy`. Email confirmation is off by default locally.

## Project layout

```
prisma/schema.prisma      Profile, Habit, Block, Task, Goal, GoalEntry, Milestone, PointEvent, Reminder, CalendarEvent, JournalEntry, JournalPhoto, FocusSession, PlannerItem, PlannerDay
src/proxy.ts              Refreshes the Supabase session; guards /app
src/lib/supabase/         Server, browser and proxy Supabase clients
src/lib/data.ts           Queries: profile, block generation, streak math
src/lib/dates.ts          Day keys ("YYYY-MM-DD"), timezone, time parsing
src/lib/goals.ts          Goal progress, milestone status, pace notes (pure helpers)
src/app/(marketing)/      Homepage
src/app/(auth)/           Login / signup pages and server actions
src/app/app/              Signed-in app (layout, Today, Dashboard, Habits, Goals, Profile)
src/app/app/actions.ts    Server actions used by the app's client components
src/components/           UI: app shell, rail, today panels, dashboard chart, forms
```

## Work

`/app/work` is a small scrum-style board for the day. Tasks move To do → In progress → Done for the chosen day; unplanned tasks wait in the Backlog and unfinished ones from earlier days can be pulled into today. Tasks can be sorted into **buckets** (streams such as Design or Build), tied to a **milestone** (shows done/total progress and a due date) and sized in points (1, 2, 3, 5, 8). Tables: `WorkTask`, `WorkBucket`, `WorkMilestone` (row-level security on, owner-only).

## Database on Google Cloud SQL

Production runs on Cloud SQL for PostgreSQL (`steady-db`, project `steady-513617`) with no open network access. `src/lib/prisma.ts` connects through Google's Cloud SQL connector when `CLOUD_SQL_INSTANCE` is set, using a service account (`GCP_SERVICE_ACCOUNT_JSON`, role Cloud SQL Client) plus `CLOUD_SQL_USER`, `CLOUD_SQL_PASSWORD` and `CLOUD_SQL_DATABASE`. Without `CLOUD_SQL_INSTANCE` it uses `DATABASE_URL` as usual. Run migrations through the Cloud SQL Auth Proxy: `cloud-sql-proxy steady-513617:us-central1:steady-db --port 5433 --gcloud-auth`, then `prisma migrate deploy` with `DATABASE_URL`/`DIRECT_URL` pointing at `127.0.0.1:5433` (`sslmode=disable`; the proxy encrypts).

## Journal photos on Google Cloud Storage

Photos live in the private bucket `gs://steady-513617-journal` (public access prevention on). The server signs short-lived upload and view links (`src/lib/gcs.ts`) using the same service account as the database, after checking who is asking; each upload is capped at 15 MB by the signed link itself. Set `GCS_BUCKET` and `GCP_SERVICE_ACCOUNT_JSON` (the service account also needs Storage Object Admin on the bucket). The bucket's CORS rule allows browser PUT/GET. Supabase Storage is no longer used.
