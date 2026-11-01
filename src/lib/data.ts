import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { GoalKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import {
  addDays,
  dateToKey,
  diffDays,
  formatDay,
  formatMinute,
  keyToDate,
  parseTime,
  todayKey,
  weekdayIndex,
  type DayKey,
} from "@/lib/dates";
import { POINTS } from "@/lib/domain";
import { habitSizes } from "@/lib/sizes";
import {
  latestValue,
  milestoneStatus,
  paceNote,
  progressPct,
} from "@/lib/goals";

/* ------------------------------------------------------------------ */
/* Session, profile, timezone                                          */
/* ------------------------------------------------------------------ */

export const getTimeZone = cache(async (): Promise<string> => {
  const tz = (await cookies()).get("tz")?.value;
  return tz && tz.length < 64 ? tz : "UTC";
});

export const getToday = cache(
  async (): Promise<DayKey> => todayKey(await getTimeZone()),
);

/** Minutes since local midnight, in the user's timezone. */
export const getNowMinute = cache(async (): Promise<number> => {
  const tz = await getTimeZone();
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    }).formatToParts(new Date());
    const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0) % 24;
    const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
    return h * 60 + m;
  } catch {
    const d = new Date();
    return d.getUTCHours() * 60 + d.getUTCMinutes();
  }
});

/**
 * A profile left over from an earlier auth project (same email, different user id) is adopted by the
 * signed-in user: its id is re-keyed so every habit, goal and entry follows. Only done when the email is
 * confirmed and no live auth account still owns the old id, so one person can't claim another's data.
 */
async function adoptLeftoverProfile(user: { id: string; email?: string; email_confirmed_at?: string | null }) {
  if (!user.email || !user.email_confirmed_at) return null;
  const stale = await prisma.profile.findFirst({ where: { email: { equals: user.email, mode: "insensitive" } } });
  if (!stale || stale.id === user.id) return null;
  try {
    const live = await prisma.$queryRaw<{ n: number }[]>`select count(*)::int as n from auth.users where id = ${stale.id}::uuid`;
    if (live[0]?.n) return null;
  } catch {
    return null; // can't verify the old id is orphaned, so don't touch it
  }
  return prisma.$transaction(async (tx) => {
    await tx.journalPhoto.updateMany({ where: { userId: stale.id }, data: { userId: user.id } });
    return tx.profile.update({ where: { id: stale.id }, data: { id: user.id } });
  });
}

/** Returns the signed-in user's profile, creating an empty one on first visit. New accounts start clean; see the setup card on Today. */
export const requireProfile = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const existing = await prisma.profile.findUnique({ where: { id: user.id } });
  if (existing) return existing;

  const adopted = await adoptLeftoverProfile(user);
  if (adopted) return adopted;

  const name =
    (user.user_metadata?.full_name as string | undefined)?.trim() ||
    user.email?.split("@")[0] ||
    "Steady user";

  let profile;
  try {
    profile = await prisma.profile.create({
      data: { id: user.id, email: user.email ?? `${user.id}@unknown`, name },
    });
  } catch (error) {
    // A parallel request may have created it first.
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      const again = await prisma.profile.findUnique({ where: { id: user.id } });
      if (again) return again;
    }
    throw error;
  }

  return profile;
});

/* ------------------------------------------------------------------ */
/* Blocks                                                              */
/* ------------------------------------------------------------------ */

/** Make sure every active habit has a block for the given day (idempotent). */
export async function ensureBlocksForDay(userId: string, day: DayKey) {
  const habits = await prisma.habit.findMany({
    where: { userId, paused: false, archived: false },
    orderBy: { sortOrder: "asc" },
  });
  const isWeekend = weekdayIndex(day) >= 5;
  const eligible = habits.filter((h) => {
    if (dateToKey(h.createdAt) > day) return false;
    if (h.cadence.toLowerCase().startsWith("weekday") && isWeekend)
      return false;
    return true;
  });
  if (!eligible.length) return;

  const existing = await prisma.block.findMany({
    where: {
      userId,
      date: keyToDate(day),
      habitId: { in: eligible.map((h) => h.id) },
    },
    select: { habitId: true },
  });
  const have = new Set(existing.map((b) => b.habitId));
  const missing = eligible.filter((h) => !have.has(h.id));
  if (!missing.length) return;

  await prisma.block.createMany({
    data: missing.map((h) => ({
      userId,
      habitId: h.id,
      date: keyToDate(day),
      time: h.time,
      minuteOfDay: parseTime(h.time)?.minuteOfDay ?? 0,
      domain: h.domain,
      minutes: h.minutes,
      title: h.name,
      note: h.note,
    })),
    skipDuplicates: true,
  });
}

export async function getBlocksForDay(userId: string, day: DayKey) {
  await ensureBlocksForDay(userId, day);
  return prisma.block.findMany({
    where: { userId, date: keyToDate(day), hidden: false },
    orderBy: [{ minuteOfDay: "asc" }, { createdAt: "asc" }],
    include: { habit: { select: HABIT_SIZING } },
  });
}

const HABIT_SIZING = {
  name: true,
  minutes: true,
  minLabel: true,
  stdLabel: true,
  stretchLabel: true,
  minMinutes: true,
  stretchMinutes: true,
} as const;

/** Shape a block row for the client, with the habit's three sizes attached. */
export function toBlockItem(
  b: Awaited<ReturnType<typeof getBlocksForDay>>[number],
) {
  return {
    id: b.id,
    time: b.time,
    minuteOfDay: b.minuteOfDay,
    domain: b.domain,
    minutes: b.minutes,
    title: b.title,
    note: b.note,
    done: b.done,
    size: b.size,
    sizes: b.habit ? habitSizes(b.habit) : null,
  };
}

export async function getTasksForDay(userId: string, day: DayKey) {
  return prisma.task.findMany({
    where: { userId, date: keyToDate(day) },
    orderBy: { createdAt: "asc" },
  });
}

export async function getPointsForDay(userId: string, day: DayKey) {
  const date = keyToDate(day);
  const [blocksDone, tasksDone, extra] = await Promise.all([
    prisma.block.count({ where: { userId, date, done: true, hidden: false } }),
    prisma.task.count({ where: { userId, date, done: true } }),
    prisma.pointEvent.aggregate({
      where: { userId, date },
      _sum: { amount: true },
    }),
  ]);
  return (
    blocksDone * POINTS.block +
    tasksDone * POINTS.task +
    (extra._sum.amount ?? 0)
  );
}

/* ------------------------------------------------------------------ */
/* History: streaks, heatmap, week bars                                */
/* ------------------------------------------------------------------ */

export type DayStat = { day: DayKey; done: number; total: number };

/** Per-day block stats for the `days` days ending at `end` (inclusive). */
export async function getHistory(
  userId: string,
  end: DayKey,
  days: number,
): Promise<DayStat[]> {
  const start = addDays(end, -(days - 1));
  const rows = await prisma.block.groupBy({
    by: ["date", "done"],
    where: {
      userId,
      hidden: false,
      date: { gte: keyToDate(start), lte: keyToDate(end) },
    },
    _count: { _all: true },
  });
  const map = new Map<DayKey, DayStat>();
  for (let i = 0; i < days; i++) {
    const day = addDays(start, i);
    map.set(day, { day, done: 0, total: 0 });
  }
  for (const r of rows) {
    const key = dateToKey(r.date);
    const s = map.get(key);
    if (!s) continue;
    s.total += r._count._all;
    if (r.done) s.done += r._count._all;
  }
  return [...map.values()];
}

export function computeStreaks(history: DayStat[], today: DayKey) {
  const active = new Set(history.filter((d) => d.done > 0).map((d) => d.day));
  // Current run: count back from today; a day with nothing done yet today doesn't break the run.
  let current = 0;
  let cursor = active.has(today) ? today : addDays(today, -1);
  while (active.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }
  let best = 0;
  let run = 0;
  let prev: DayKey | null = null;
  for (const d of history) {
    if (d.done > 0) {
      run = prev && diffDays(d.day, prev) === 1 ? run + 1 : 1;
      prev = d.day;
      best = Math.max(best, run);
    } else {
      run = 0;
      prev = null;
    }
  }
  return { current, best: Math.max(best, current) };
}

export function completionRate(history: DayStat[]) {
  const total = history.reduce((a, d) => a + d.total, 0);
  const done = history.reduce((a, d) => a + d.done, 0);
  return total ? Math.round((done / total) * 100) : 0;
}

/** 12 columns (weeks) × 7 rows (days), oldest first, ending today. Level 0–3. */
export function heatmap(history84: DayStat[]) {
  const cells = history84.map((d) => {
    const lvl =
      d.total === 0 || d.done === 0
        ? 0
        : d.done < d.total / 2
          ? 1
          : d.done < d.total
            ? 2
            : 3;
    const title =
      d.total === 0
        ? "No blocks"
        : d.done === 0
          ? "Missed"
          : `${d.done} of ${d.total} blocks`;
    return { day: d.day, level: lvl, title: `${d.day} · ${title}` };
  });
  return Array.from({ length: 12 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
}

/* ------------------------------------------------------------------ */
/* Habits & goals                                                      */
/* ------------------------------------------------------------------ */

export async function getHabits(userId: string) {
  return prisma.habit.findMany({
    where: { userId, archived: false },
    orderBy: { sortOrder: "asc" },
  });
}

export async function getGoals(userId: string) {
  return prisma.goal.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
}

export type GoalSummary = {
  id: string;
  name: string;
  kind: GoalKind;
  unit: string;
  start: number;
  value: number;
  target: number;
  pct: number;
  horizon: string;
  deadline: string | null;
  note: string;
  step: number;
  entryCount: number;
  nextMilestone: string | null;
  milestonesHit: number;
  milestoneCount: number;
};

/** Goals with live progress, computed from entries and milestones. */
export async function getGoalSummaries(
  userId: string,
  today: DayKey,
): Promise<GoalSummary[]> {
  const goals = await prisma.goal.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: { entries: { orderBy: { date: "asc" } }, milestones: true },
  });
  return goals.map((g) => {
    const entries = g.entries.map((e) => ({
      date: dateToKey(e.date),
      value: e.value,
    }));
    const deadline = g.deadline ? dateToKey(g.deadline) : null;
    const ms = milestoneStatus(g, entries, g.milestones);
    return {
      id: g.id,
      name: g.name,
      kind: g.kind,
      unit: g.unit,
      start: g.start,
      value: latestValue(g, entries),
      target: g.target,
      pct: progressPct(g, entries),
      horizon: deadline
        ? formatDay(deadline, { month: "short", day: "numeric" })
        : g.horizon,
      deadline,
      note: paceNote(g, entries, deadline, today),
      step: g.step,
      entryCount: entries.length,
      nextMilestone: ms.find((m) => m.isNext)?.label ?? null,
      milestonesHit: ms.filter((m) => m.achieved).length,
      milestoneCount: ms.length,
    };
  });
}

export async function getGoalDetail(userId: string, id: string) {
  const g = await prisma.goal.findFirst({
    where: { id, userId },
    include: {
      entries: { orderBy: { date: "asc" } },
      milestones: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
    },
  });
  if (!g) return null;
  const entries = g.entries.map((e) => ({
    id: e.id,
    date: dateToKey(e.date),
    value: e.value,
    note: e.note,
  }));
  return {
    ...g,
    deadline: g.deadline ? dateToKey(g.deadline) : null,
    entries,
    milestones: milestoneStatus(g, entries, g.milestones),
  };
}

/** Per-habit current/best streak from block history. */
export async function getHabitStreaks(userId: string, today: DayKey) {
  const start = addDays(today, -119);
  const rows = await prisma.block.findMany({
    where: {
      userId,
      hidden: false,
      habitId: { not: null },
      date: { gte: keyToDate(start), lte: keyToDate(today) },
    },
    select: { habitId: true, date: true, done: true },
    orderBy: { date: "asc" },
  });
  const byHabit = new Map<string, DayStat[]>();
  for (const r of rows) {
    const list = byHabit.get(r.habitId!) ?? [];
    list.push({ day: dateToKey(r.date), done: r.done ? 1 : 0, total: 1 });
    byHabit.set(r.habitId!, list);
  }
  const out = new Map<string, { current: number; best: number }>();
  for (const [id, list] of byHabit) out.set(id, computeStreaks(list, today));
  return out;
}

/* ------------------------------------------------------------------ */
/* Calendar & reminders                                                */
/* ------------------------------------------------------------------ */

/** Per-day stats for every day of a month (1-based `month`). */
export async function getMonthStats(
  userId: string,
  year: number,
  month: number,
): Promise<DayStat[]> {
  const first = `${year}-${String(month).padStart(2, "0")}-01`;
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return getHistory(userId, addDays(first, days - 1), days);
}

export async function getReminders(userId: string) {
  return prisma.reminder.findMany({
    where: { userId },
    include: { habit: { select: { name: true } } },
    orderBy: [{ minuteOfDay: "asc" }, { createdAt: "asc" }],
  });
}

/* ------------------------------------------------------------------ */
/* Journal                                                             */
/* ------------------------------------------------------------------ */

export const JOURNAL_BUCKET = "journal";

export type JournalPhotoView = { id: string; url: string };

/** Signed, short-lived URLs for private photos (keyed by storage path). */
async function signPhotoUrls(paths: string[]): Promise<Map<string, string>> {
  if (!paths.length) return new Map();
  const supabase = await createClient();
  const { data } = await supabase.storage
    .from(JOURNAL_BUCKET)
    .createSignedUrls(paths, 60 * 60);
  return new Map(
    (data ?? []).flatMap((d) =>
      d.signedUrl && d.path ? [[d.path, d.signedUrl] as [string, string]] : [],
    ),
  );
}

export async function getJournalEntry(userId: string, day: DayKey) {
  const entry = await prisma.journalEntry.findUnique({
    where: { userId_date: { userId, date: keyToDate(day) } },
    include: { photos: { orderBy: { createdAt: "asc" } } },
  });
  if (!entry) return null;
  const urls = await signPhotoUrls(entry.photos.map((p) => p.path));
  const photos: JournalPhotoView[] = entry.photos.flatMap((p) =>
    urls.get(p.path) ? [{ id: p.id, url: urls.get(p.path)! }] : [],
  );
  return { ...entry, photos };
}

/** Most recent entries first, with up to three photo thumbnails each. */
export async function getJournalEntries(userId: string, limit = 30) {
  const rows = await prisma.journalEntry.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: limit,
    include: {
      photos: { orderBy: { createdAt: "asc" }, take: 3 },
      _count: { select: { photos: true } },
    },
  });
  const urls = await signPhotoUrls(
    rows.flatMap((r) => r.photos.map((p) => p.path)),
  );
  return rows.map((r) => ({
    id: r.id,
    day: dateToKey(r.date),
    mood: r.mood,
    title: r.title,
    body: r.body,
    updatedAt: r.updatedAt,
    photoCount: r._count.photos,
    photos: r.photos.flatMap((p) =>
      urls.get(p.path) ? [{ id: p.id, url: urls.get(p.path)! }] : [],
    ),
  }));
}

/** Mood per day for the `days` days ending at `end` (null when nothing logged). */
export async function getMoodHistory(
  userId: string,
  end: DayKey,
  days: number,
) {
  const start = addDays(end, -(days - 1));
  const rows = await prisma.journalEntry.findMany({
    where: { userId, date: { gte: keyToDate(start), lte: keyToDate(end) } },
    select: { date: true, mood: true },
  });
  const byDay = new Map(rows.map((r) => [dateToKey(r.date), r.mood]));
  return Array.from({ length: days }, (_, i) => {
    const day = addDays(start, i);
    return { day, mood: byDay.get(day) ?? null };
  });
}

/* ------------------------------------------------------------------ */
/* Calendar items                                                      */
/* ------------------------------------------------------------------ */

export type CalendarItem = {
  id: string;
  day: DayKey;
  kind: "EVENT" | "TASK" | "REMINDER" | "HABIT_REMINDER" | "AUTO_REMINDER";
  title: string;
  time: string | null;
  minuteOfDay: number | null;
  note: string | null;
  done: boolean | null; // null = not completable (reminders)
  repeat?: string;
};

function matchesRepeat(repeat: string, day: DayKey) {
  return !(
    repeat.toLowerCase().startsWith("weekday") && weekdayIndex(day) >= 5
  );
}

/** Events, tasks and reminders (one-off and recurring) for every day in a range, sorted by time. */
export async function getCalendarItems(
  userId: string,
  start: DayKey,
  end: DayKey,
): Promise<CalendarItem[]> {
  const range = { gte: keyToDate(start), lte: keyToDate(end) };
  const [events, tasks, reminders, blocks, profile] = await Promise.all([
    prisma.calendarEvent.findMany({ where: { userId, date: range } }),
    prisma.task.findMany({ where: { userId, date: range } }),
    prisma.reminder.findMany({
      where: { userId, on: true },
      include: {
        habit: { select: { name: true, paused: true, archived: true } },
      },
    }),
    prisma.block.findMany({
      where: { userId, hidden: false, date: range },
      select: {
        id: true,
        date: true,
        title: true,
        minuteOfDay: true,
        done: true,
      },
    }),
    prisma.profile.findUnique({
      where: { id: userId },
      select: { blockReminders: true, reminderLead: true },
    }),
  ]);
  const items: CalendarItem[] = [
    ...events.map((e) => ({
      id: e.id,
      day: dateToKey(e.date),
      kind: e.kind as "EVENT" | "REMINDER",
      title: e.title,
      time: e.time,
      minuteOfDay: e.minuteOfDay,
      note: e.note,
      done: e.kind === "EVENT" ? e.done : null,
    })),
    ...tasks.map((t) => {
      const parsed = parseTime(t.due);
      return {
        id: t.id,
        day: dateToKey(t.date),
        kind: "TASK" as const,
        title: t.title,
        time: parsed ? parsed.label : null,
        minuteOfDay: parsed?.minuteOfDay ?? null,
        note: null,
        done: t.done,
      };
    }),
  ];
  const active = reminders.filter((r) => !r.habit.paused && !r.habit.archived);
  for (let d = start; d <= end; d = addDays(d, 1)) {
    for (const r of active) {
      if (!matchesRepeat(r.repeat, d)) continue;
      items.push({
        id: `${r.id}:${d}`,
        day: d,
        kind: "HABIT_REMINDER",
        title: r.habit.name,
        time: r.time,
        minuteOfDay: r.minuteOfDay,
        note: null,
        done: null,
        repeat: r.repeat,
      });
    }
  }
  // Heads-up reminders N minutes before every timed block, event and task.
  if (profile?.blockReminders) {
    const lead = profile.reminderLead;
    const heads: {
      id: string;
      day: DayKey;
      title: string;
      start: number;
      done: boolean;
    }[] = [
      ...blocks.map((b) => ({
        id: `block:${b.id}`,
        day: dateToKey(b.date),
        title: b.title,
        start: b.minuteOfDay,
        done: b.done,
      })),
      ...items
        .filter(
          (i) =>
            (i.kind === "EVENT" || i.kind === "TASK") && i.minuteOfDay !== null,
        )
        .map((i) => ({
          id: `${i.kind.toLowerCase()}:${i.id}`,
          day: i.day,
          title: i.title,
          start: i.minuteOfDay!,
          done: !!i.done,
        })),
    ];
    for (const h of heads) {
      if (h.done) continue;
      const at = h.start - lead;
      if (at < 0) continue;
      items.push({
        id: `auto:${h.id}`,
        day: h.day,
        kind: "AUTO_REMINDER",
        title: h.title,
        time: formatMinute(at),
        minuteOfDay: at,
        note: `starts in ${lead} min`,
        done: null,
      });
    }
  }
  const order = {
    REMINDER: 0,
    HABIT_REMINDER: 0,
    AUTO_REMINDER: 0,
    EVENT: 1,
    TASK: 2,
  };
  return items.sort(
    (a, b) =>
      a.day.localeCompare(b.day) ||
      (a.minuteOfDay ?? 1e9) - (b.minuteOfDay ?? 1e9) ||
      order[a.kind] - order[b.kind],
  );
}


/* ------------------------------------------------------------------ */
/* Focus sessions                                                      */
/* ------------------------------------------------------------------ */

export async function getFocusForDay(userId: string, day: DayKey) {
  const rows = await prisma.focusSession.findMany({
    where: { userId, date: keyToDate(day) },
    select: { actualSec: true, completed: true },
  });
  return {
    sessions: rows.length,
    minutes: Math.round(rows.reduce((a, r) => a + r.actualSec, 0) / 60),
    completed: rows.filter((r) => r.completed).length,
  };
}

/* ------------------------------------------------------------------ */
/* Weekly review                                                       */
/* ------------------------------------------------------------------ */

export type ReviewHabit = {
  id: string;
  name: string;
  time: string;
  minutes: number;
  done: number;
  total: number;
  missed: number;
  comebacks: number;
  bySize: Record<"MIN" | "STANDARD" | "STRETCH", number>;
  hasMin: boolean;
};

export type Suggestion =
  | { kind: "SET_MIN"; habitId: string; habit: string; why: string; title: string }
  | { kind: "MOVE_TIME"; habitId: string; habit: string; time: string; why: string; title: string }
  | { kind: "TRY_STRETCH"; habitId: string; habit: string; why: string; title: string }
  | { kind: "FEWER_PRIORITIES"; why: string; title: string }
  | { kind: "KEEP_GOING"; why: string; title: string };

/**
 * A plain, explainable look at the last seven days (ending `today`) against the seven before.
 * Everything here is counting; the one suggestion comes from a short ordered rule list.
 */
export async function getWeeklyReview(userId: string, today: DayKey) {
  // Blocks are created lazily, so make sure days nobody opened still count as missed.
  await Promise.all(Array.from({ length: 14 }, (_, i) => ensureBlocksForDay(userId, addDays(today, -i))));
  const start = addDays(today, -6);
  const prevStart = addDays(today, -13);
  const dayRange = { gte: keyToDate(prevStart), lte: keyToDate(today) };

  const [blocks, tasks, focus, habits] = await Promise.all([
    prisma.block.findMany({
      where: { userId, hidden: false, date: dayRange },
      select: { habitId: true, date: true, done: true, size: true },
      orderBy: { date: "asc" },
    }),
    prisma.task.findMany({
      where: { userId, date: dayRange },
      select: { date: true, done: true, top: true },
    }),
    prisma.focusSession.findMany({
      where: { userId, date: dayRange },
      select: { date: true, actualSec: true, completed: true },
    }),
    prisma.habit.findMany({
      where: { userId, archived: false },
      select: { id: true, name: true, time: true, minutes: true, minLabel: true, paused: true },
    }),
  ]);

  const inWeek = (d: Date) => dateToKey(d) >= start;
  const thisWeek = blocks.filter((b) => inWeek(b.date));
  const lastWeek = blocks.filter((b) => !inWeek(b.date));
  const pct = (rows: { done: boolean }[]) =>
    rows.length ? Math.round((rows.filter((r) => r.done).length / rows.length) * 100) : 0;

  // Per-habit tallies, plus "comebacks": a done day right after a missed one.
  const perHabit: ReviewHabit[] = [];
  for (const h of habits) {
    const rows = thisWeek.filter((b) => b.habitId === h.id);
    if (!rows.length) continue;
    const all = blocks.filter((b) => b.habitId === h.id);
    let comebacks = 0;
    for (let i = 1; i < all.length; i++) {
      if (inWeek(all[i].date) && all[i].done && !all[i - 1].done) comebacks++;
    }
    const bySize = { MIN: 0, STANDARD: 0, STRETCH: 0 };
    for (const r of rows) if (r.done && r.size) bySize[r.size]++;
    const done = rows.filter((r) => r.done).length;
    perHabit.push({
      id: h.id,
      name: h.name,
      time: h.time,
      minutes: h.minutes,
      done,
      total: rows.length,
      missed: rows.length - done,
      comebacks,
      bySize,
      hasMin: !!h.minLabel,
    });
  }

  const tops = tasks.filter((t) => t.top && inWeek(t.date));
  const prioritiesDone = tops.filter((t) => t.done).length;
  const topDays = new Set(tops.map((t) => dateToKey(t.date)));
  const focusWeek = focus.filter((f) => inWeek(f.date));
  const focusPrev = focus.filter((f) => !inWeek(f.date));
  const sumMin = (rows: { actualSec: number }[]) => Math.round(rows.reduce((a, r) => a + r.actualSec, 0) / 60);

  const activeDays = new Set(thisWeek.filter((b) => b.done).map((b) => dateToKey(b.date))).size;

  const worked = [...perHabit].filter((h) => h.done > 0).sort((a, b) => b.done / b.total - a.done / a.total || b.done - a.done).slice(0, 3);
  const skipped = perHabit.filter((h) => h.missed >= 3).sort((a, b) => b.missed - a.missed);

  const suggestion = suggest({ perHabit, skipped, worked, topDays: topDays.size, prioritiesDone, prioritiesTotal: tops.length });

  return {
    start,
    end: today,
    done: thisWeek.filter((b) => b.done).length,
    total: thisWeek.length,
    rate: pct(thisWeek),
    prevRate: lastWeek.length ? pct(lastWeek) : null,
    activeDays,
    comebacks: perHabit.reduce((a, h) => a + h.comebacks, 0),
    prioritiesDone,
    prioritiesTotal: tops.length,
    focusMinutes: sumMin(focusWeek),
    focusSessions: focusWeek.length,
    focusPrevMinutes: focusPrev.length ? sumMin(focusPrev) : null,
    worked,
    skipped,
    suggestion,
  };
}

function suggest(i: {
  perHabit: ReviewHabit[];
  skipped: ReviewHabit[];
  worked: ReviewHabit[];
  topDays: number;
  prioritiesDone: number;
  prioritiesTotal: number;
}): Suggestion {
  const noMin = i.skipped.find((h) => !h.hasMin);
  if (noMin)
    return {
      kind: "SET_MIN",
      habitId: noMin.id,
      habit: noMin.name,
      title: `Give "${noMin.name}" a tiny minimum version`,
      why: `You skipped it ${noMin.missed} of ${noMin.total} days and it has no minimum yet. A 2-minute version keeps low-energy days from counting as zero.`,
    };
  const best = i.worked.find((h) => h.done / h.total >= 0.7);
  const stuck = i.skipped[0];
  if (stuck && best && best.id !== stuck.id) {
    const start = parseTime(best.time);
    const after = start ? formatMinute(Math.min(23 * 60 + 30, start.minuteOfDay + best.minutes + 5)) : best.time;
    return {
      kind: "MOVE_TIME",
      habitId: stuck.id,
      habit: stuck.name,
      time: after,
      title: `Move "${stuck.name}" right after "${best.name}"`,
      why: `You did "${best.name}" ${best.done} of ${best.total} days. Attaching "${stuck.name}" to a routine that already works makes it easier to start.`,
    };
  }
  if (stuck)
    return {
      kind: "SET_MIN",
      habitId: stuck.id,
      habit: stuck.name,
      title: `Shrink "${stuck.name}" for a week`,
      why: `You missed it ${stuck.missed} times even with a minimum version. Try making the minimum smaller still.`,
    };
  if (i.prioritiesTotal >= 4 && i.prioritiesDone / i.prioritiesTotal < 0.5)
    return {
      kind: "FEWER_PRIORITIES",
      title: "Pick two priorities instead of three",
      why: `You finished ${i.prioritiesDone} of ${i.prioritiesTotal} priorities. Fewer, clearer picks leave room for a normal day.`,
    };
  const stretchy = i.worked.find((h) => h.done === h.total && h.total >= 5 && h.bySize.STRETCH === 0);
  if (stretchy)
    return {
      kind: "TRY_STRETCH",
      habitId: stretchy.id,
      habit: stretchy.name,
      title: `Try the stretch version of "${stretchy.name}" once`,
      why: `You did it every day without stretching. Pick one day and go a little further, then drop back if it feels heavy.`,
    };
  return {
    kind: "KEEP_GOING",
    title: "Nothing to change this week",
    why: "Your routines held up. Keep them as they are and notice what feels easy.",
  };
}


/* ------------------------------------------------------------------ */
/* Planner                                                             */
/* ------------------------------------------------------------------ */

const plannerOrder = [{ date: "asc" }, { minuteOfDay: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }] as const;

export async function getPlannerRange(userId: string, start: DayKey, end: DayKey) {
  return prisma.plannerItem.findMany({
    where: { userId, date: { gte: keyToDate(start), lte: keyToDate(end) } },
    orderBy: [...plannerOrder],
  });
}

/** Open items from before `today`, oldest first. */
export async function getPlannerOverdue(userId: string, today: DayKey) {
  return prisma.plannerItem.findMany({
    where: { userId, done: false, date: { lt: keyToDate(today) } },
    orderBy: [...plannerOrder],
    take: 50,
  });
}

/** Open items with a reminder that could still be due soon (client decides when to fire). */
export async function getPlannerReminders(userId: string, today: DayKey) {
  const rows = await prisma.plannerItem.findMany({
    where: {
      userId,
      done: false,
      remindMin: { not: null },
      date: { gte: keyToDate(addDays(today, -1)), lte: keyToDate(addDays(today, 3)) },
    },
    select: { id: true, title: true, kind: true, date: true, minuteOfDay: true, remindMin: true },
  });
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    kind: r.kind,
    day: dateToKey(r.date),
    minuteOfDay: r.minuteOfDay,
    remindMin: r.remindMin!,
  }));
}

export async function getPlannerDays(userId: string, start: DayKey, end: DayKey) {
  const rows = await prisma.plannerDay.findMany({
    where: { userId, date: { gte: keyToDate(start), lte: keyToDate(end) } },
  });
  return rows.map((r) => ({ day: dateToKey(r.date), label: r.label, note: r.note, tint: r.tint }));
}
