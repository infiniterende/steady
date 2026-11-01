"use server";

import { revalidatePath } from "next/cache";
import type { Domain, GoalKind, HabitSize, PlannerKind, Priority } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireProfile, getToday, JOURNAL_BUCKET } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { isDayKey, keyToDate, parseTime, type DayKey } from "@/lib/dates";
import { DOMAINS, POINTS } from "@/lib/domain";
import { defaultMilestones, fmtNum } from "@/lib/goals";
import { ruleFirstStep } from "@/lib/firstStep";
import { SIZES } from "@/lib/sizes";
import { STARTERS } from "@/lib/starters";
import { PHOTOS_PER_ENTRY, PHOTO_MAX_BYTES, PHOTO_MAX_MB, PHOTO_TYPES } from "@/lib/photos";
import { PLANNER_KINDS, REMIND_VALUES, TINT_KEYS } from "@/lib/planner";

export type ActionResult = { ok: true } | { ok: false; error: string };

const ok: ActionResult = { ok: true };
const fail = (error: string): ActionResult => ({ ok: false, error });

async function dayOr(day: unknown): Promise<DayKey> {
  return isDayKey(day) ? day : getToday();
}

function revalidateApp() {
  revalidatePath("/app", "layout");
}

/* ---------------- Blocks ---------------- */

export async function toggleBlock(id: string): Promise<ActionResult> {
  const me = await requireProfile();
  const block = await prisma.block.findFirst({ where: { id, userId: me.id } });
  if (!block) return fail("Block not found.");
  await prisma.block.update({
    where: { id },
    data: block.done ? { done: false, size: null } : { done: true, size: block.size ?? "STANDARD" },
  });
  revalidateApp();
  return ok;
}

/** One-tap logging at a chosen size. Tapping the size that is already set undoes it. */
export async function setBlockSize(id: string, size: HabitSize): Promise<ActionResult> {
  const me = await requireProfile();
  if (!SIZES.includes(size)) return fail("Unknown size.");
  const block = await prisma.block.findFirst({ where: { id, userId: me.id } });
  if (!block) return fail("Block not found.");
  const undo = block.done && block.size === size;
  await prisma.block.update({ where: { id }, data: undo ? { done: false, size: null } : { done: true, size } });
  revalidateApp();
  return ok;
}

export async function removeBlock(id: string): Promise<ActionResult> {
  const me = await requireProfile();
  await prisma.block.updateMany({ where: { id, userId: me.id }, data: { hidden: true } });
  revalidateApp();
  return ok;
}

export async function addBlock(input: { day: string; title: string; time: string; minutes?: number }): Promise<ActionResult> {
  const me = await requireProfile();
  const title = input.title.trim();
  if (!title) return fail("Give the block a name.");
  if (title.length > 60) return fail("Keep it under 60 characters.");
  const t = parseTime(input.time);
  if (!t) return fail("Add a time, like 7:00 AM.");
  const minutes = input.minutes === undefined ? 20 : Number(input.minutes);
  if (!Number.isInteger(minutes) || minutes < 5 || minutes > 480) return fail("Length must be 5–480 minutes.");
  await prisma.block.create({
    data: {
      userId: me.id,
      date: keyToDate(await dayOr(input.day)),
      time: t.label,
      minuteOfDay: t.minuteOfDay,
      domain: "FOCUS",
      minutes,
      title,
      note: "New block",
    },
  });
  revalidateApp();
  return ok;
}

/* ---------------- Tasks ---------------- */

export async function addTask(input: { day: string; title: string; category: string }): Promise<ActionResult> {
  const me = await requireProfile();
  const title = input.title.trim();
  if (!title) return fail("Write the goal first.");
  if (title.length > 60) return fail("Keep it under 60 characters.");
  const category = (DOMAINS as string[]).includes(input.category) ? (input.category as Domain) : "FOCUS";
  await prisma.task.create({
    data: { userId: me.id, date: keyToDate(await dayOr(input.day)), title, category, due: "Today", priority: "MEDIUM" },
  });
  revalidateApp();
  return ok;
}

export async function toggleTask(id: string): Promise<ActionResult> {
  const me = await requireProfile();
  const task = await prisma.task.findFirst({ where: { id, userId: me.id } });
  if (!task) return fail("Task not found.");
  await prisma.task.update({ where: { id }, data: { done: !task.done } });
  revalidateApp();
  return ok;
}

const MAX_TOP = 3;

/** Mark or unmark a task as one of the day's (at most three) priorities. */
export async function setTop(id: string, on: boolean): Promise<ActionResult> {
  const me = await requireProfile();
  const task = await prisma.task.findFirst({ where: { id, userId: me.id } });
  if (!task) return fail("Task not found.");
  if (on && !task.top) {
    const n = await prisma.task.count({ where: { userId: me.id, date: task.date, top: true } });
    if (n >= MAX_TOP) return fail("Three priorities is the limit. Finish or drop one first.");
  }
  await prisma.task.update({ where: { id }, data: { top: on } });
  revalidateApp();
  return ok;
}

/** Add a task straight into today's three. */
export async function addPriority(input: { day: string; title: string }): Promise<ActionResult> {
  const me = await requireProfile();
  const title = input.title.trim();
  if (!title) return fail("Write the priority first.");
  if (title.length > 60) return fail("Keep it under 60 characters.");
  const date = keyToDate(await dayOr(input.day));
  const n = await prisma.task.count({ where: { userId: me.id, date, top: true } });
  if (n >= MAX_TOP) return fail("Three priorities is the limit. Finish or drop one first.");
  await prisma.task.create({
    data: { userId: me.id, date, title, category: "FOCUS", due: "Today", priority: "HIGH", top: true },
  });
  revalidateApp();
  return ok;
}

export async function finishTask(id: string): Promise<ActionResult> {
  const me = await requireProfile();
  await prisma.task.updateMany({ where: { id, userId: me.id, done: false }, data: { done: true } });
  revalidateApp();
  return ok;
}

/* ---------------- Help me start ---------------- */

export type StartResult = { ok: true; step: string; source: "claude" | "rules" } | { ok: false; error: string };

async function claudeFirstStep(title: string): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-haiku-5-5",
        max_tokens: 120,
        system:
          "You help someone start a task they find intimidating. Reply with exactly one concrete first action that takes under five minutes, in one sentence, imperative mood, under 25 words. No preamble, no list.",
        messages: [{ role: "user", content: `Task: ${title}` }],
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = data.content?.find((c) => c.type === "text")?.text?.trim();
    return text && text.length <= 220 ? text : null;
  } catch {
    return null;
  }
}

export async function helpMeStart(taskId: string): Promise<StartResult> {
  const me = await requireProfile();
  const task = await prisma.task.findFirst({ where: { id: taskId, userId: me.id } });
  if (!task) return { ok: false, error: "Task not found." };
  const fromClaude = await claudeFirstStep(task.title);
  const step = fromClaude ?? ruleFirstStep(task.title);
  await prisma.task.update({ where: { id: taskId }, data: { firstStep: step } });
  revalidateApp();
  return { ok: true, step, source: fromClaude ? "claude" : "rules" };
}

export async function setFirstStep(taskId: string, step: string): Promise<ActionResult> {
  const me = await requireProfile();
  const text = step.trim().slice(0, 220);
  await prisma.task.updateMany({ where: { id: taskId, userId: me.id }, data: { firstStep: text || null } });
  revalidateApp();
  return ok;
}

/* ---------------- Focus sessions ---------------- */

export async function recordFocus(input: {
  day: string;
  title: string;
  taskId?: string | null;
  plannedMin: number;
  actualSec: number;
  completed: boolean;
}): Promise<ActionResult> {
  const me = await requireProfile();
  const plannedMin = Math.round(Number(input.plannedMin));
  if (!Number.isFinite(plannedMin) || plannedMin < 1 || plannedMin > 180) return fail("Session length must be 1–180 minutes.");
  const actualSec = Math.max(0, Math.min(plannedMin * 60 + 600, Math.round(Number(input.actualSec) || 0)));
  if (actualSec < 20) return ok; // too short to count
  const taskId = input.taskId
    ? ((await prisma.task.findFirst({ where: { id: input.taskId, userId: me.id }, select: { id: true } }))?.id ?? null)
    : null;
  const date = keyToDate(await dayOr(input.day));
  await prisma.focusSession.create({
    data: {
      userId: me.id,
      taskId,
      date,
      title: input.title.trim().slice(0, 60) || "Focus",
      plannedMin,
      actualSec,
      completed: !!input.completed,
    },
  });
  if (input.completed) {
    await prisma.pointEvent.create({ data: { userId: me.id, date, amount: POINTS.session, reason: "Finished a focus session" } });
  }
  revalidateApp();
  return ok;
}

export async function removeTask(id: string): Promise<ActionResult> {
  const me = await requireProfile();
  await prisma.task.deleteMany({ where: { id, userId: me.id } });
  revalidateApp();
  return ok;
}

export async function setTaskPriority(id: string, priority: Priority): Promise<ActionResult> {
  const me = await requireProfile();
  await prisma.task.updateMany({ where: { id, userId: me.id }, data: { priority } });
  revalidateApp();
  return ok;
}

/* ---------------- Points ---------------- */

export async function addPoints(amount: number, reason: string, day?: string): Promise<ActionResult> {
  const me = await requireProfile();
  if (!Number.isInteger(amount) || Math.abs(amount) > 50) return fail("Invalid amount.");
  await prisma.pointEvent.create({
    data: { userId: me.id, date: keyToDate(await dayOr(day)), amount, reason: reason.slice(0, 80) },
  });
  revalidateApp();
  return ok;
}

/* ---------------- Habits ---------------- */

export async function logHabit(id: string): Promise<ActionResult> {
  const me = await requireProfile();
  const habit = await prisma.habit.findFirst({ where: { id, userId: me.id } });
  if (!habit) return fail("Habit not found.");
  await prisma.$transaction([
    prisma.habit.update({ where: { id }, data: { progress: Math.min(100, habit.progress + 10) } }),
    prisma.pointEvent.create({
      data: { userId: me.id, date: keyToDate(await getToday()), amount: POINTS.habitLog, reason: `Logged ${habit.name}` },
    }),
  ]);
  revalidateApp();
  return ok;
}

export async function togglePauseHabit(id: string): Promise<ActionResult> {
  const me = await requireProfile();
  const habit = await prisma.habit.findFirst({ where: { id, userId: me.id } });
  if (!habit) return fail("Habit not found.");
  await prisma.habit.update({ where: { id }, data: { paused: !habit.paused } });
  revalidateApp();
  return ok;
}

export async function addHabit(input: {
  name: string;
  domain: string;
  time: string;
  minutes: number;
  cadence: string;
  minLabel?: string;
  stdLabel?: string;
  stretchLabel?: string;
}): Promise<ActionResult> {
  const me = await requireProfile();
  const name = input.name.trim();
  if (!name) return fail("Name the habit.");
  if (name.length > 60) return fail("Keep it under 60 characters.");
  const t = parseTime(input.time);
  if (!t) return fail("Add a time, like 7:00 AM.");
  const minutes = Number(input.minutes);
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 600) return fail("Length must be 1–600 minutes.");
  const domain = (DOMAINS as string[]).includes(input.domain) ? (input.domain as Domain) : "FOCUS";
  const cadence = input.cadence === "Weekdays" ? "Weekdays" : "Daily";
  const count = await prisma.habit.count({ where: { userId: me.id } });
  await prisma.habit.create({
    data: {
      userId: me.id,
      name,
      domain,
      time: t.label,
      minutes,
      cadence,
      sortOrder: count,
      minLabel: input.minLabel?.trim().slice(0, 60) || null,
      stdLabel: input.stdLabel?.trim().slice(0, 60) || null,
      stretchLabel: input.stretchLabel?.trim().slice(0, 60) || null,
    },
  });
  revalidateApp();
  return ok;
}

export async function setHabitSizes(
  id: string,
  input: { minLabel: string; stdLabel: string; stretchLabel: string; minMinutes: number; stretchMinutes: number | null },
): Promise<ActionResult> {
  const me = await requireProfile();
  const clean = (v: string) => v.trim().slice(0, 60) || null;
  const minMinutes = Math.round(Number(input.minMinutes));
  if (!Number.isInteger(minMinutes) || minMinutes < 1 || minMinutes > 60) return fail("Minimum length must be 1–60 minutes.");
  const stretchMinutes = input.stretchMinutes === null || input.stretchMinutes === undefined ? null : Math.round(Number(input.stretchMinutes));
  if (stretchMinutes !== null && (!Number.isInteger(stretchMinutes) || stretchMinutes < 1 || stretchMinutes > 600))
    return fail("Stretch length must be 1–600 minutes.");
  await prisma.habit.updateMany({
    where: { id, userId: me.id },
    data: { minLabel: clean(input.minLabel), stdLabel: clean(input.stdLabel), stretchLabel: clean(input.stretchLabel), minMinutes, stretchMinutes },
  });
  revalidateApp();
  return ok;
}

/** Approve a weekly-review suggestion that moves a habit to a new time (also updates open blocks from today on). */
export async function moveHabitTime(id: string, time: string): Promise<ActionResult> {
  const me = await requireProfile();
  const t = parseTime(time);
  if (!t) return fail("Add a time, like 7:00 AM.");
  const habit = await prisma.habit.findFirst({ where: { id, userId: me.id } });
  if (!habit) return fail("Habit not found.");
  await prisma.$transaction([
    prisma.habit.update({ where: { id }, data: { time: t.label } }),
    prisma.block.updateMany({
      where: { habitId: id, userId: me.id, done: false, date: { gte: keyToDate(await getToday()) } },
      data: { time: t.label, minuteOfDay: t.minuteOfDay },
    }),
  ]);
  revalidateApp();
  return ok;
}

export async function archiveHabit(id: string): Promise<ActionResult> {
  const me = await requireProfile();
  await prisma.habit.updateMany({ where: { id, userId: me.id }, data: { archived: true, paused: true } });
  revalidateApp();
  return ok;
}

/* ---------------- Goals ---------------- */

export async function addGoal(input: {
  name: string;
  kind: string;
  unit: string;
  start: string;
  target: string;
  step: string;
  deadline: string;
}): Promise<ActionResult> {
  const me = await requireProfile();
  const name = input.name.trim();
  if (!name) return fail("Name the goal.");
  if (name.length > 60) return fail("Keep it under 60 characters.");
  const kind: GoalKind = input.kind === "MEASURE" ? "MEASURE" : "COUNT";
  const target = Number(input.target);
  if (!Number.isFinite(target) || (kind === "COUNT" && target < 1)) return fail("Target must be a number above zero.");
  const start = kind === "MEASURE" ? Number(input.start) : 0;
  if (kind === "MEASURE" && !Number.isFinite(start)) return fail("Add your starting value.");
  if (kind === "MEASURE" && start === target) return fail("Start and target can't be the same.");
  const step = kind === "COUNT" ? Number(input.step) || 1 : 1;
  const unit = input.unit.trim().slice(0, 16) || (kind === "MEASURE" ? "lbs" : "units");
  const deadline = isDayKey(input.deadline) ? keyToDate(input.deadline) : null;
  const goal = { kind, start, current: 0, target, unit, step };
  await prisma.goal.create({
    data: {
      userId: me.id,
      name,
      ...goal,
      deadline,
      horizon: deadline ? "Deadline" : "No deadline",
      milestones: { create: defaultMilestones(goal) },
      // A measurement goal starts with its first data point.
      entries: kind === "MEASURE" ? { create: { date: keyToDate(await getToday()), value: start } } : undefined,
    },
  });
  revalidateApp();
  return ok;
}

export async function stepGoal(id: string, direction: 1 | -1): Promise<ActionResult> {
  const me = await requireProfile();
  const goal = await prisma.goal.findFirst({ where: { id, userId: me.id } });
  if (!goal) return fail("Goal not found.");
  if (goal.kind !== "COUNT") return fail("Log a value instead.");
  const next = Math.max(0, Math.min(goal.target, goal.current + direction * goal.step));
  const today = keyToDate(await getToday());
  await prisma.$transaction([
    prisma.goal.update({ where: { id }, data: { current: next } }),
    prisma.goalEntry.upsert({
      where: { goalId_date: { goalId: id, date: today } },
      create: { goalId: id, date: today, value: next },
      update: { value: next },
    }),
  ]);
  revalidateApp();
  return ok;
}

export async function logGoalEntry(input: { goalId: string; date: string; value: string; note: string }): Promise<ActionResult> {
  const me = await requireProfile();
  const goal = await prisma.goal.findFirst({ where: { id: input.goalId, userId: me.id } });
  if (!goal) return fail("Goal not found.");
  const value = Number(input.value);
  if (input.value.trim() === "" || !Number.isFinite(value)) return fail("Enter a number.");
  const today = await getToday();
  const day = isDayKey(input.date) ? input.date : today;
  if (day > today) return fail("You can't log a future day.");
  const date = keyToDate(day);
  const note = input.note.trim().slice(0, 120) || null;
  await prisma.$transaction([
    prisma.goalEntry.upsert({
      where: { goalId_date: { goalId: goal.id, date } },
      create: { goalId: goal.id, date, value, note },
      update: { value, note },
    }),
    ...(goal.kind === "COUNT" ? [prisma.goal.update({ where: { id: goal.id }, data: { current: Math.max(0, value) } })] : []),
  ]);
  revalidateApp();
  return ok;
}

export async function removeGoalEntry(id: string): Promise<ActionResult> {
  const me = await requireProfile();
  const entry = await prisma.goalEntry.findFirst({ where: { id, goal: { userId: me.id } }, include: { goal: true } });
  if (!entry) return fail("Entry not found.");
  await prisma.goalEntry.delete({ where: { id } });
  if (entry.goal.kind === "COUNT") {
    const latest = await prisma.goalEntry.findFirst({ where: { goalId: entry.goalId }, orderBy: { date: "desc" } });
    await prisma.goal.update({ where: { id: entry.goalId }, data: { current: latest?.value ?? 0 } });
  }
  revalidateApp();
  return ok;
}

export async function addMilestone(input: { goalId: string; label: string; value: string }): Promise<ActionResult> {
  const me = await requireProfile();
  const goal = await prisma.goal.findFirst({ where: { id: input.goalId, userId: me.id }, include: { milestones: true } });
  if (!goal) return fail("Goal not found.");
  const value = Number(input.value);
  if (input.value.trim() === "" || !Number.isFinite(value)) return fail("Enter the value this milestone is at.");
  const label = input.label.trim().slice(0, 40) || `${fmtNum(value)} ${goal.unit}`;
  await prisma.milestone.create({ data: { goalId: goal.id, label, value, sortOrder: goal.milestones.length } });
  revalidateApp();
  return ok;
}

export async function removeMilestone(id: string): Promise<ActionResult> {
  const me = await requireProfile();
  await prisma.milestone.deleteMany({ where: { id, goal: { userId: me.id } } });
  revalidateApp();
  return ok;
}

export async function removeGoal(id: string): Promise<ActionResult> {
  const me = await requireProfile();
  await prisma.goal.deleteMany({ where: { id, userId: me.id } });
  revalidateApp();
  return ok;
}

/* ---------------- Profile ---------------- */

export async function updateProfile(input: { name: string; about: string; pointsGoal: number }): Promise<ActionResult> {
  const me = await requireProfile();
  const name = input.name.trim();
  if (!name) return fail("Add your name.");
  const pointsGoal = Number(input.pointsGoal);
  if (!Number.isInteger(pointsGoal) || pointsGoal < 50 || pointsGoal > 500) return fail("Daily goal must be 50–500 points.");
  await prisma.profile.update({
    where: { id: me.id },
    data: { name, about: input.about.trim().slice(0, 400) || null, pointsGoal },
  });
  revalidateApp();
  return ok;
}

/* ---------------- Reminders & notifications ---------------- */

export async function addReminder(input: { habitId: string; time: string; repeat: string }): Promise<ActionResult> {
  const me = await requireProfile();
  const habit = await prisma.habit.findFirst({ where: { id: input.habitId, userId: me.id, archived: false } });
  if (!habit) return fail("Pick a habit.");
  const t = parseTime(input.time);
  if (!t) return fail("Add a time, like 7:30 AM.");
  const repeat = input.repeat === "Weekdays" ? "Weekdays" : "Every day";
  await prisma.reminder.create({
    data: { userId: me.id, habitId: habit.id, time: t.label, minuteOfDay: t.minuteOfDay, repeat },
  });
  revalidateApp();
  return ok;
}

export async function toggleReminder(id: string): Promise<ActionResult> {
  const me = await requireProfile();
  const r = await prisma.reminder.findFirst({ where: { id, userId: me.id } });
  if (!r) return fail("Reminder not found.");
  await prisma.reminder.update({ where: { id }, data: { on: !r.on } });
  revalidateApp();
  return ok;
}

export async function removeReminder(id: string): Promise<ActionResult> {
  const me = await requireProfile();
  await prisma.reminder.deleteMany({ where: { id, userId: me.id } });
  revalidateApp();
  return ok;
}

export async function setNotificationSetting(key: "quietHours" | "weeklyDigest", value: boolean): Promise<ActionResult> {
  const me = await requireProfile();
  await prisma.profile.update({ where: { id: me.id }, data: { [key]: value } });
  revalidateApp();
  return ok;
}

/* ---------------- Journal ---------------- */

export async function saveJournal(input: { day: string; mood: number | null; title: string; body: string }): Promise<ActionResult> {
  const me = await requireProfile();
  const today = await getToday();
  const day = isDayKey(input.day) ? input.day : today;
  if (day > today) return fail("You can't journal a future day.");
  const mood = input.mood === null ? null : Number(input.mood);
  if (mood !== null && (!Number.isInteger(mood) || mood < 1 || mood > 5)) return fail("Pick a mood from 1 to 5.");
  const body = input.body.trim().slice(0, 5000);
  const title = input.title.trim().slice(0, 80);
  const date = keyToDate(day);
  if (!body && !title && mood === null) {
    const existing = await prisma.journalEntry.findUnique({ where: { userId_date: { userId: me.id, date } }, include: { _count: { select: { photos: true } } } });
    if (!existing?._count.photos) return fail("Write a line, pick a mood, or add a photo.");
  }
  await prisma.journalEntry.upsert({
    where: { userId_date: { userId: me.id, date } },
    create: { userId: me.id, date, mood, title, body },
    update: { mood, title, body },
  });
  revalidateApp();
  return ok;
}

export async function removeJournal(id: string): Promise<ActionResult> {
  const me = await requireProfile();
  const entry = await prisma.journalEntry.findFirst({ where: { id, userId: me.id }, include: { photos: true } });
  if (!entry) return fail("Entry not found.");
  if (entry.photos.length) {
    const supabase = await createClient();
    await supabase.storage.from(JOURNAL_BUCKET).remove(entry.photos.map((p) => p.path));
  }
  await prisma.journalEntry.delete({ where: { id } });
  revalidateApp();
  return ok;
}

/**
 * Photos are uploaded straight from the browser to Supabase Storage (so file size isn't limited by this
 * server's request body). This records them once they're there, after checking each one.
 */
export async function registerJournalPhotos(input: { day: string; paths: string[] }): Promise<ActionResult> {
  const me = await requireProfile();
  const today = await getToday();
  const day = isDayKey(input.day) ? input.day : today;
  const paths = [...new Set(input.paths)];
  if (!paths.length) return fail("Choose a photo first.");
  const supabase = await createClient();

  const discard = (list: string[]) => supabase.storage.from(JOURNAL_BUCKET).remove(list);
  if (day > today) {
    await discard(paths.filter((p) => p.startsWith(`${me.id}/`)));
    return fail("You can't journal a future day.");
  }

  const exts = Object.values(PHOTO_TYPES).join("|");
  const shape = new RegExp(`^${me.id}/${day}/[0-9a-f-]{36}\\.(${exts})$`);
  const bad = paths.filter((p) => !shape.test(p));
  if (bad.length) {
    await discard(paths.filter((p) => p.startsWith(`${me.id}/`)));
    return fail("That upload wasn't recognised.");
  }

  // Confirm each object really exists and is within the size limit.
  const { data: listed, error: listError } = await supabase.storage.from(JOURNAL_BUCKET).list(`${me.id}/${day}`, { limit: 100 });
  if (listError) return fail(`Couldn't check the upload: ${listError.message}`);
  const found = new Map((listed ?? []).map((o) => [`${me.id}/${day}/${o.name}`, o]));
  const missing = paths.filter((p) => !found.has(p));
  const oversize = paths.filter((p) => ((found.get(p)?.metadata as { size?: number } | null)?.size ?? 0) > PHOTO_MAX_BYTES);
  if (oversize.length) {
    await discard(oversize);
    return fail(`Photos can be up to ${PHOTO_MAX_MB} MB.`);
  }
  if (missing.length) return fail("One of the photos didn't finish uploading. Please try again.");

  const date = keyToDate(day);
  const entry = await prisma.journalEntry.upsert({
    where: { userId_date: { userId: me.id, date } },
    create: { userId: me.id, date, body: "" },
    update: {},
    include: { _count: { select: { photos: true } } },
  });
  if (entry._count.photos + paths.length > PHOTOS_PER_ENTRY) {
    await discard(paths);
    return fail(`Up to ${PHOTOS_PER_ENTRY} photos per day.`);
  }
  await prisma.journalPhoto.createMany({ data: paths.map((path) => ({ entryId: entry.id, userId: me.id, path })), skipDuplicates: true });
  revalidateApp();
  return ok;
}

export async function removeJournalPhoto(id: string): Promise<ActionResult> {
  const me = await requireProfile();
  const photo = await prisma.journalPhoto.findFirst({ where: { id, userId: me.id } });
  if (!photo) return fail("Photo not found.");
  const supabase = await createClient();
  const { error } = await supabase.storage.from(JOURNAL_BUCKET).remove([photo.path]);
  if (error) return fail(`Couldn't delete: ${error.message}`);
  await prisma.journalPhoto.delete({ where: { id } });
  revalidateApp();
  return ok;
}

/* ---------------- Calendar items ---------------- */

export async function addCalendarItem(input: { day: string; kind: string; title: string; time: string; note: string }): Promise<ActionResult> {
  const me = await requireProfile();
  if (!isDayKey(input.day)) return fail("Pick a day.");
  const title = input.title.trim();
  if (!title) return fail("Give it a name.");
  if (title.length > 80) return fail("Keep it under 80 characters.");
  const timeRaw = input.time.trim();
  const t = timeRaw ? parseTime(timeRaw) : null;
  if (timeRaw && !t) return fail("Time should look like 7:30 AM.");
  const note = input.note.trim().slice(0, 200) || null;
  const date = keyToDate(input.day);

  if (input.kind === "TASK") {
    await prisma.task.create({ data: { userId: me.id, date, title, category: "FOCUS", due: t ? t.label : "All day", priority: "MEDIUM" } });
  } else {
    const kind = input.kind === "REMINDER" ? "REMINDER" : "EVENT";
    if (kind === "REMINDER" && !t) return fail("A reminder needs a time.");
    await prisma.calendarEvent.create({ data: { userId: me.id, date, kind, title, time: t?.label ?? null, minuteOfDay: t?.minuteOfDay ?? null, note } });
  }
  revalidateApp();
  return ok;
}

export async function toggleCalendarEvent(id: string): Promise<ActionResult> {
  const me = await requireProfile();
  const e = await prisma.calendarEvent.findFirst({ where: { id, userId: me.id } });
  if (!e) return fail("Not found.");
  await prisma.calendarEvent.update({ where: { id }, data: { done: !e.done } });
  revalidateApp();
  return ok;
}

export async function removeCalendarEvent(id: string): Promise<ActionResult> {
  const me = await requireProfile();
  await prisma.calendarEvent.deleteMany({ where: { id, userId: me.id } });
  revalidateApp();
  return ok;
}

export async function setReminderPrefs(input: { blockReminders?: boolean; reminderLead?: number }): Promise<ActionResult> {
  const me = await requireProfile();
  const data: { blockReminders?: boolean; reminderLead?: number } = {};
  if (input.blockReminders !== undefined) data.blockReminders = !!input.blockReminders;
  if (input.reminderLead !== undefined) {
    const lead = Number(input.reminderLead);
    if (![5, 10, 15, 30].includes(lead)) return fail("Lead time must be 5, 10, 15 or 30 minutes.");
    data.reminderLead = lead;
  }
  if (!Object.keys(data).length) return fail("Nothing to change.");
  await prisma.profile.update({ where: { id: me.id }, data });
  revalidateApp();
  return ok;
}


/* ---------------- Planner ---------------- */

export type PlannerInput = {
  title: string;
  date: string;
  kind: string;
  time: string;
  note: string;
  place: string;
  priority: string;
  remindMin: number | null;
};

function cleanPlanner(input: PlannerInput) {
  const title = input.title.trim();
  if (!title) return { error: "Give it a title." } as const;
  if (title.length > 120) return { error: "Keep the title under 120 characters." } as const;
  if (!isDayKey(input.date)) return { error: "Pick a date." } as const;
  if (!(PLANNER_KINDS as string[]).includes(input.kind)) return { error: "Unknown type." } as const;
  const timeText = input.time.trim();
  const t = timeText ? parseTime(timeText) : null;
  if (timeText && !t) return { error: "Time should look like 5:00 PM." } as const;
  const remindMin = input.remindMin === null || input.remindMin === undefined ? null : Number(input.remindMin);
  if (!REMIND_VALUES.includes(remindMin)) return { error: "Unknown reminder option." } as const;
  const priority = (["HIGH", "MEDIUM", "LOW"] as string[]).includes(input.priority) ? (input.priority as Priority) : "MEDIUM";
  return {
    data: {
      title,
      date: keyToDate(input.date),
      kind: input.kind as PlannerKind,
      time: t?.label ?? null,
      minuteOfDay: t?.minuteOfDay ?? null,
      note: input.note.trim().slice(0, 300) || null,
      place: input.place?.trim().replace(/^@/, "").slice(0, 60) || null,
      priority,
      remindMin,
    },
  } as const;
}

export async function addPlannerItem(input: PlannerInput): Promise<ActionResult> {
  const me = await requireProfile();
  const c = cleanPlanner(input);
  if (c.error !== undefined) return fail(c.error);
  await prisma.plannerItem.create({ data: { ...c.data, userId: me.id } });
  revalidateApp();
  return ok;
}

export async function updatePlannerItem(id: string, input: PlannerInput): Promise<ActionResult> {
  const me = await requireProfile();
  const c = cleanPlanner(input);
  if (c.error !== undefined) return fail(c.error);
  const res = await prisma.plannerItem.updateMany({ where: { id, userId: me.id }, data: c.data });
  if (!res.count) return fail("Item not found.");
  revalidateApp();
  return ok;
}

export async function setPlannerDone(id: string, done: boolean): Promise<ActionResult> {
  const me = await requireProfile();
  await prisma.plannerItem.updateMany({ where: { id, userId: me.id }, data: { done } });
  revalidateApp();
  return ok;
}

export async function removePlannerItem(id: string): Promise<ActionResult> {
  const me = await requireProfile();
  await prisma.plannerItem.deleteMany({ where: { id, userId: me.id } });
  revalidateApp();
  return ok;
}

/** Set the label pill, note and tint for one day on the Planner. Empty everything to clear it. */
export async function setPlannerDay(input: { date: string; label: string; note: string; tint: string }): Promise<ActionResult> {
  const me = await requireProfile();
  if (!isDayKey(input.date)) return fail("Pick a date.");
  const label = input.label.trim().slice(0, 30) || null;
  const note = input.note.trim().slice(0, 500) || null;
  const tint = (TINT_KEYS as string[]).includes(input.tint) ? input.tint : null;
  const date = keyToDate(input.date);
  if (!label && !note && !tint) await prisma.plannerDay.deleteMany({ where: { userId: me.id, date } });
  else
    await prisma.plannerDay.upsert({
      where: { userId_date: { userId: me.id, date } },
      create: { userId: me.id, date, label, note, tint },
      update: { label, note, tint },
    });
  revalidateApp();
  return ok;
}

/* ---------------- First-run setup ---------------- */

/**
 * Finish the first-run setup. Creates only what the person picked: starter habits (by key) and an
 * optional first priority for today. Passing nothing is a clean start.
 */
export async function completeSetup(input: { habits: string[]; priority: string }): Promise<ActionResult> {
  const me = await requireProfile();
  if (me.onboarded) return ok;
  const picked = STARTERS.filter((s) => input.habits.includes(s.key));
  const priority = input.priority.trim();
  if (priority.length > 60) return fail("Keep the priority under 60 characters.");

  for (const [i, h] of picked.entries()) {
    const habit = await prisma.habit.create({
      data: {
        userId: me.id,
        name: h.name,
        domain: h.domain,
        time: h.time,
        minutes: h.minutes,
        cadence: h.cadence,
        note: h.note,
        minLabel: h.minLabel,
        stdLabel: h.stdLabel,
        stretchLabel: h.stretchLabel,
        sortOrder: i,
        progress: 0,
      },
    });
    if (h.reminder) {
      const t = parseTime(h.reminder.time);
      if (t) await prisma.reminder.create({ data: { userId: me.id, habitId: habit.id, time: t.label, minuteOfDay: t.minuteOfDay, repeat: h.reminder.repeat } });
    }
  }
  if (priority) {
    await prisma.task.create({
      data: { userId: me.id, date: keyToDate(await getToday()), title: priority, category: "FOCUS", due: "Today", priority: "HIGH", top: true },
    });
  }
  await prisma.profile.update({ where: { id: me.id }, data: { onboarded: true } });
  revalidateApp();
  return ok;
}
