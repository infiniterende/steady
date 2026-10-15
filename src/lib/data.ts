import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Domain, GoalKind, Priority } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { addDays, dateToKey, diffDays, formatDay, keyToDate, parseTime, todayKey, weekdayIndex, type DayKey } from "@/lib/dates";
import { POINTS } from "@/lib/domain";
import { defaultMilestones, latestValue, milestoneStatus, paceNote, progressPct } from "@/lib/goals";

/* ------------------------------------------------------------------ */
/* Session, profile, timezone                                          */
/* ------------------------------------------------------------------ */

export const getTimeZone = cache(async (): Promise<string> => {
  const tz = (await cookies()).get("tz")?.value;
  return tz && tz.length < 64 ? tz : "UTC";
});

export const getToday = cache(async (): Promise<DayKey> => todayKey(await getTimeZone()));

/** Returns the signed-in user's profile, creating (and seeding) it on first visit. */
export const requireProfile = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const existing = await prisma.profile.findUnique({ where: { id: user.id } });
  if (existing) return existing;

  const name =
    (user.user_metadata?.full_name as string | undefined)?.trim() ||
    user.email?.split("@")[0] ||
    "Steady user";

  const profile = await prisma.profile.create({
    data: { id: user.id, email: user.email ?? `${user.id}@unknown`, name },
  });
  await seedDefaults(profile.id, await getToday());
  return profile;
});

const DEFAULT_HABITS: Array<{ name: string; domain: Domain; time: string; minutes: number; cadence: string; note: string; progress: number }> = [
  { name: "Morning mobility", domain: "HEALTH", time: "6:30 AM", minutes: 20, cadence: "Daily", note: "Full routine plus 5 min breathing", progress: 88 },
  { name: "Reading", domain: "GROWTH", time: "8:00 AM", minutes: 45, cadence: "Daily", note: "Continue the current chapter, take two notes", progress: 62 },
  { name: "Deep work block", domain: "FOCUS", time: "10:00 AM", minutes: 90, cadence: "Weekdays", note: "One task, notifications off", progress: 71 },
  { name: "Walk outside", domain: "HEALTH", time: "12:30 PM", minutes: 30, cadence: "Daily", note: "No podcast, no phone", progress: 40 },
  { name: "Language practice", domain: "FOCUS", time: "6:00 PM", minutes: 25, cadence: "Daily", note: "Speaking drill, then review deck", progress: 25 },
  { name: "Day close-out", domain: "FOCUS", time: "9:30 PM", minutes: 10, cadence: "Daily", note: "Log the day, set tomorrow's three", progress: 55 },
];

async function seedDefaults(userId: string, today: DayKey) {
  await prisma.habit.createMany({
    data: DEFAULT_HABITS.map((h, i) => ({ ...h, userId, sortOrder: i })),
  });
  const habits = await prisma.habit.findMany({ where: { userId }, select: { id: true, name: true } });
  const byName = new Map(habits.map((h) => [h.name, h.id]));
  const reminderSeeds = [
    { name: "Morning mobility", time: "6:20 AM", repeat: "Every day" },
    { name: "Reading", time: "7:50 AM", repeat: "Weekdays" },
    { name: "Day close-out", time: "9:20 PM", repeat: "Every day" },
  ];
  await prisma.reminder.createMany({
    data: reminderSeeds
      .filter((r) => byName.has(r.name))
      .map((r) => ({ userId, habitId: byName.get(r.name)!, time: r.time, minuteOfDay: parseTime(r.time)!.minuteOfDay, repeat: r.repeat })),
  });
  const tasks: Array<{ title: string; category: Domain; due: string; priority: Priority }> = [
    { title: "Drink 2L of water", category: "HEALTH", due: "All day", priority: "LOW" },
    { title: "Finish chapter 4", category: "GROWTH", due: "8:30 AM", priority: "HIGH" },
    { title: "Plan tomorrow's three", category: "FOCUS", due: "9:30 PM", priority: "MEDIUM" },
    { title: "20 min Spanish speaking drill", category: "GROWTH", due: "6:00 PM", priority: "HIGH" },
    { title: "Prep lunch for tomorrow", category: "HOME", due: "7:30 PM", priority: "LOW" },
    { title: "Stretch before bed", category: "HEALTH", due: "10:00 PM", priority: "MEDIUM" },
  ];
  await prisma.task.createMany({
    data: tasks.map((t) => ({ ...t, userId, date: keyToDate(today) })),
  });
  const goalSeeds: Array<{ name: string; kind: GoalKind; start: number; target: number; unit: string; horizon: string; step: number }> = [
    { name: "Read 20 books this year", kind: "COUNT", start: 0, target: 20, unit: "books", horizon: "Dec 31", step: 1 },
    { name: "Move 5 days a week", kind: "COUNT", start: 0, target: 5, unit: "days", horizon: "This week", step: 1 },
    { name: "Log 600 focus minutes", kind: "COUNT", start: 0, target: 600, unit: "min", horizon: "This month", step: 25 },
  ];
  for (const g of goalSeeds) {
    await prisma.goal.create({
      data: { ...g, userId, milestones: { create: defaultMilestones({ ...g, current: 0 }) } },
    });
  }
}

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
    if (h.cadence.toLowerCase().startsWith("weekday") && isWeekend) return false;
    return true;
  });
  if (!eligible.length) return;

  const existing = await prisma.block.findMany({
    where: { userId, date: keyToDate(day), habitId: { in: eligible.map((h) => h.id) } },
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
  });
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
    prisma.pointEvent.aggregate({ where: { userId, date }, _sum: { amount: true } }),
  ]);
  return blocksDone * POINTS.block + tasksDone * POINTS.task + (extra._sum.amount ?? 0);
}

/* ------------------------------------------------------------------ */
/* History: streaks, heatmap, week bars                                */
/* ------------------------------------------------------------------ */

export type DayStat = { day: DayKey; done: number; total: number };

/** Per-day block stats for the `days` days ending at `end` (inclusive). */
export async function getHistory(userId: string, end: DayKey, days: number): Promise<DayStat[]> {
  const start = addDays(end, -(days - 1));
  const rows = await prisma.block.groupBy({
    by: ["date", "done"],
    where: { userId, hidden: false, date: { gte: keyToDate(start), lte: keyToDate(end) } },
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
    const lvl = d.total === 0 || d.done === 0 ? 0 : d.done < d.total / 2 ? 1 : d.done < d.total ? 2 : 3;
    const title = d.total === 0 ? "No blocks" : d.done === 0 ? "Missed" : `${d.done} of ${d.total} blocks`;
    return { day: d.day, level: lvl, title: `${d.day} · ${title}` };
  });
  return Array.from({ length: 12 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
}

/* ------------------------------------------------------------------ */
/* Habits & goals                                                      */
/* ------------------------------------------------------------------ */

export async function getHabits(userId: string) {
  return prisma.habit.findMany({ where: { userId, archived: false }, orderBy: { sortOrder: "asc" } });
}

export async function getGoals(userId: string) {
  return prisma.goal.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
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
export async function getGoalSummaries(userId: string, today: DayKey): Promise<GoalSummary[]> {
  const goals = await prisma.goal.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: { entries: { orderBy: { date: "asc" } }, milestones: true },
  });
  return goals.map((g) => {
    const entries = g.entries.map((e) => ({ date: dateToKey(e.date), value: e.value }));
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
      horizon: deadline ? formatDay(deadline, { month: "short", day: "numeric" }) : g.horizon,
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
    include: { entries: { orderBy: { date: "asc" } }, milestones: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } },
  });
  if (!g) return null;
  const entries = g.entries.map((e) => ({ id: e.id, date: dateToKey(e.date), value: e.value, note: e.note }));
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
    where: { userId, hidden: false, habitId: { not: null }, date: { gte: keyToDate(start), lte: keyToDate(today) } },
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
export async function getMonthStats(userId: string, year: number, month: number): Promise<DayStat[]> {
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
