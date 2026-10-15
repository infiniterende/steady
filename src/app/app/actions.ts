"use server";

import { revalidatePath } from "next/cache";
import type { Domain, GoalKind, Priority } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireProfile, getToday } from "@/lib/data";
import { isDayKey, keyToDate, parseTime, type DayKey } from "@/lib/dates";
import { DOMAINS, POINTS } from "@/lib/domain";
import { defaultMilestones, fmtNum } from "@/lib/goals";

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
  await prisma.block.update({ where: { id }, data: { done: !block.done } });
  revalidateApp();
  return ok;
}

export async function removeBlock(id: string): Promise<ActionResult> {
  const me = await requireProfile();
  await prisma.block.updateMany({ where: { id, userId: me.id }, data: { hidden: true } });
  revalidateApp();
  return ok;
}

export async function addBlock(input: { day: string; title: string; time: string }): Promise<ActionResult> {
  const me = await requireProfile();
  const title = input.title.trim();
  if (!title) return fail("Give the block a name.");
  if (title.length > 60) return fail("Keep it under 60 characters.");
  const t = parseTime(input.time);
  if (!t) return fail("Add a time, like 7:00 AM.");
  await prisma.block.create({
    data: {
      userId: me.id,
      date: keyToDate(await dayOr(input.day)),
      time: t.label,
      minuteOfDay: t.minuteOfDay,
      domain: "FOCUS",
      minutes: 20,
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
    data: { userId: me.id, name, domain, time: t.label, minutes, cadence, sortOrder: count },
  });
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
