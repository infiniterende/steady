# Handoff: Steady — Habit Tracker Web App

## Overview
Steady is a habit-tracking web app: a daily plan of timed habit blocks, today's goals/tasks, longer-term goals, streaks, a calendar with reminders, a small accountability group, and a user profile. A marketing homepage (`Home.dc.html`) links into the app.

## About the Design Files
The files in this bundle are **design references built in HTML** — interactive prototypes showing intended look and behavior, not production code. Recreate them in the target codebase's environment using its patterns. If there is no codebase yet, a good default is **React + TypeScript + Vite**, with CSS Modules or Tailwind, and a small store (Zustand or React context + reducer). Persist to localStorage first; a backend can come later.

The `.dc.html` files open directly in a browser (keep `support.js` alongside). Each contains:
- a template (markup with inline styles; `{{ name }}` holes are values computed in JS),
- a `class Component` logic block at the bottom holding all state, sample data and handlers. **Read this class for exact behavior and data shapes.**

## Fidelity
**High-fidelity.** Colors, type, spacing, radii and interactions are final. Match them closely.

## Global layout (Habit Tracker.dc.html)
- **Header** (full width, white, 1px bottom border `#E8DDD3`, padding 14px 28px): logo tile (30×30, radius 9, olive `#6B705C`, white "st"), wordmark "STEADY" 15px/700 with "HABIT SYSTEM" 9px caption; right side streak pill ("14-day streak") and 32px round avatar button (initials) → opens Profile.
- **Sidebar** (216px fixed, white, right border): nav buttons Today, Dashboard, Habits, Goals, Calendar, Schedule, Streaks, Group. Button: padding 10px 12px, radius 10, 14px; active = weight 600, tinted bg + colored 7px dot. Footer card "Weekly review — Sunday, 7:00 pm — 12 minutes".
- **Main** (padding 24px, flex-wrap, gap 20): primary column (flex 1 1 520px) + right rail (300–360px). The rail shows only on Today and Dashboard.
- **Cards**: white, 1px border `#E8DDD3`, radius 18, padding 22–24px. Section titles 19px/700; page titles 26px/700, letter-spacing -0.02em.

## Screens
1. **Today** — date + prev/next day; "N of M done" pill. **Active sessions**: countdown timer cards (conic ring 78px, mm:ss, Start/Pause/Reset; "+ Session" adds one). **Stat cards** (tinted, icon tile): Points today, Minutes logged, % of daily goal (ring). **Today's goals** (tasks): progress ring + summary ("2 of 6 done · 2 high priority open"), All/Open/Done segmented tabs, add row (text input + 4 category icon buttons Health/Focus/Growth/Home + Add; Enter submits), grid of task cards (category icon tile, title, "Category · due", priority chip High/Medium/Low, round check, remove ×). Open + high priority sort first. **Schedule** timeline: time column, check circle, connector line, block card (domain · duration, icon tile, title, note, status chip, remove); "Earliest/Latest first" sort; "Add block" inline form.
2. **Dashboard** — 4 KPI tiles; clickable 7-day bar chart (selected bar olive `#6B705C`, others `#CFCFC0`); "By domain" progress bars; goals card (top 4 of N).
3. **Habits** — list rows: color swatch, name, "domain · cadence", streak + % bar, **Log** (+10%, +8 pts) and **Pause/Resume** (paused rows at 55% opacity).
4. **Goals** — "N goals · M met", New goal form (name + numeric target, validated), goal cards (progress, "X left", horizon, +step / Undo / delete). "Daily points" goal is derived from live points and can't be deleted.
5. **Calendar** — month grid (Mon-first, prev/next month), per-day 5 completion dots, selected + today outline. **Reminders** list (time, habit, channel · repeat, On/Off pill, delete) + "New reminder" (habit select + time, validated). **Notification settings**: Quiet hours, Weekly digest toggles.
6. **Schedule** — 7-day strip (grid of 7, selected olive border) + that day's blocks.
7. **Streaks** — hero current run ("14" + "day current run"), milestone chips (7/14 hit), 12-week heatmap (4 levels `#F4EDE6` → `#DDBEA9` → `#B7B7A4` → `#6B705C`), per-habit streak bars.
8. **Group** — leaderboard ranked by points (you highlighted), per-person Nudge → "Nudged", group "Nudge the group", activity feed.
9. **Profile** (from avatar) — back link, 74px avatar, name, meta; stat tiles; About text; **Identities** chips; **Favorite things** grid; Awards (4 badge cards); Milestones list; Groups list with role chips (Anchor/Member).

## Homepage (Home.dc.html)
Pastel landing page: blurred color blobs, pill nav (Overview/How it works/Features/Stories smooth-scroll), hero "Build Habits That Actually Stick", CTAs to the app, phone mock with checkable habits + two floating cards, How it works (3 pastel step cards), Features (6 cards), Stories (3 quote cards) + CTA, giant faded headline, footer (brand, 3 link columns, email signup with validation, legal row). Pastels: `#F9D8CF` peach, `#D3E9DF` mint, `#D6E3F3` sky, `#F8EBC4` butter; ink `#3A3530`; bg `#FBF6F1`.

## Interactions & Behavior
- Timers tick every 1s while running; stop at 0 ("Complete").
- Checking a schedule block: ±12 points; a task: ±5 points; the goal % = points / pointsGoal (default 200).
- All forms validate inline with a red message under the field (`oklch(0.52 0.15 30)`); errors clear on typing.
- Transitions: progress bar widths 0.3s ease; hover = slightly darker bg or `#F4EDE6` tint.
- Layout reflows: cards use `auto-fit/auto-fill minmax()` grids and flex-wrap; rail wraps under main at narrow widths.

## State (see logic class for full shapes)
`nav`, `dayOffset`, `timers[]`, `blocks[]`, `tasks[]` {title, cat, due, prio, done}, `taskFilter`, `habits[]` {group, name, pct}, `paused{}`, `logged{}`, `goals[]` {name, cur, target, unit, horizon, note, step}, `points`, calendar `calMonth/calYear/calPick`, `reminders[]` {habit, time, channel, repeat, on}, `quietHours`, `weeklyDigest`, `nudged`, `nudgedPeers{}`, profile data. Configurable props: `userName`, `pointsGoal`, `showGroup`.

Suggested data model for a real build: User, Habit (schedule, duration, domain, reminder), HabitLog (date, done, minutes), Task (date, category, priority, done), Goal (target, unit, deadline, progress), Group/Membership, Reminder.

## Design Tokens (web app — "Cozy Neutral Retreat")
- Page bg `#F7F1EB`; surface `#F4EDE6`; border `#E8DDD3`; soft accent `#DDBEA9`; card `#FFFFFF`
- Olive primary `#6B705C` (hover `#565B4A`); sage `#B7B7A4`; clay `#CB997E`
- Ink `#40453A` / headings ≈ `oklch(0.31 0.03 40)`; muted text `oklch(0.5 0.014 80)`
- Category tints: Health `#EEEFE6`/`#585D48`, Focus `#F6E8DE`/`#8A553A`, Growth `#F1E9E1`/`#6E5644`, Home `#ECEBE4`/`#55574A`
- Type: **Plus Jakarta Sans** (400–700) for UI; **IBM Plex Mono** (400/500) for numbers/times. Sizes: 26 page title, 19 section, 15 item title, 13–14 body, 11–12 meta.
- Radii: 999 pills, 18 cards, 14 inner cards, 12 tiles, 9–10 buttons/inputs, 3 small dots.
- Spacing: 4 / 8 / 12 / 14 / 16 / 20 / 24.
- Shadows: minimal; cards rely on borders.

## Assets
No raster images. Icons are simple inline 22×22 stroke SVGs (1.7 stroke, round caps) defined in the logic class (`CAT` icons). In production, swap for a consistent icon set (e.g. Lucide: heart, target, book-open, home, clock, star, trending-up). Sample people/names are placeholders.

## Files
- `Habit Tracker.dc.html` — the web app (all screens)
- `Home.dc.html` — marketing homepage
- `support.js` — runtime needed to open the `.dc.html` files in a browser
