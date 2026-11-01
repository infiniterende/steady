import type { PlannerKind, Priority } from "@prisma/client";
import { addDays, parseTime, weekdayIndex, type DayKey } from "@/lib/dates";

export const PLANNER_KINDS: PlannerKind[] = ["TASK", "ASSIGNMENT", "DEADLINE", "APPOINTMENT", "EVENT", "REMINDER"];

export const KIND_META: Record<PlannerKind, { label: string; bg: string; color: string }> = {
  TASK: { label: "Task", bg: "#EEEFE6", color: "#4F5443" },
  ASSIGNMENT: { label: "Assignment", bg: "#E5ECF4", color: "#3E5570" },
  DEADLINE: { label: "Deadline", bg: "#F7DDD6", color: "#8A3F2E" },
  APPOINTMENT: { label: "Appointment", bg: "#F6E8DE", color: "#7A4B30" },
  EVENT: { label: "Event", bg: "#EFE6F3", color: "#5E4470" },
  REMINDER: { label: "Reminder", bg: "#FFF1BF", color: "#8A3B00" },
};

export const REMIND_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: "No reminder" },
  { value: 0, label: "At the time" },
  { value: 5, label: "5 min before" },
  { value: 10, label: "10 min before" },
  { value: 15, label: "15 min before" },
  { value: 30, label: "30 min before" },
  { value: 60, label: "1 hour before" },
  { value: 120, label: "2 hours before" },
  { value: 1440, label: "1 day before" },
];

export const REMIND_VALUES = REMIND_OPTIONS.map((o) => o.value);

/** Untimed items are "due" at 9:00 AM for the purpose of reminders. */
export const UNTIMED_MINUTE = 9 * 60;

export function remindLabel(min: number | null) {
  return REMIND_OPTIONS.find((o) => o.value === min)?.label ?? "Reminder";
}

/** Local Date at which a reminder should fire. `day` is YYYY-MM-DD in the viewer's own calendar. */
export function fireAt(day: DayKey, minuteOfDay: number | null, remindMin: number): Date {
  const [y, m, d] = day.split("-").map(Number);
  const due = minuteOfDay ?? UNTIMED_MINUTE;
  return new Date(y, m - 1, d, 0, due - remindMin, 0, 0);
}

export function dueDate(day: DayKey, minuteOfDay: number | null): Date {
  return fireAt(day, minuteOfDay, 0);
}

/* ---------------- Quick add ("Essay due fri 5pm #assignment !1 remind 1h") ---------------- */

export type QuickAdd = {
  title: string;
  date: DayKey;
  time: string | null;
  kind: PlannerKind | null;
  place: string | null;
  priority: Priority | null;
  remindMin: number | null | undefined; // undefined = not specified
};

const WEEKDAYS: Record<string, number> = { mon: 0, tue: 1, tues: 1, wed: 2, thu: 3, thur: 3, thurs: 3, fri: 4, sat: 5, sun: 6 };
const KIND_WORDS: Record<string, PlannerKind> = {
  task: "TASK",
  todo: "TASK",
  assignment: "ASSIGNMENT",
  homework: "ASSIGNMENT",
  hw: "ASSIGNMENT",
  deadline: "DEADLINE",
  due: "DEADLINE",
  appointment: "APPOINTMENT",
  appt: "APPOINTMENT",
  event: "EVENT",
  reminder: "REMINDER",
};

export function parseQuickAdd(input: string, today: DayKey): QuickAdd {
  let text = ` ${input.trim()} `;
  const take = (re: RegExp) => {
    const m = re.exec(text);
    if (m) text = text.replace(re, " ");
    return m;
  };

  let kind: PlannerKind | null = null;
  const k = take(/\s#(\w+)(?=\s)/i);
  if (k) kind = KIND_WORDS[k[1].toLowerCase()] ?? KIND_WORDS[k[1].toLowerCase().replace(/s$/, "")] ?? null;

  let place: string | null = null;
  const pl = take(/\s@([\w'-]+)(?=\s)/);
  if (pl) place = pl[1];

  let priority: Priority | null = null;
  const p = take(/\s!([1-3])(?=\s)/);
  if (p) priority = p[1] === "1" ? "HIGH" : p[1] === "2" ? "MEDIUM" : "LOW";

  let remindMin: number | null | undefined;
  const r = take(/\s(?:remind(?:\s+me)?|r)\s+(?:(\d+)\s*(m|min|mins|h|hr|hrs|hour|hours|d|day|days)|(none|off)|(at\s+time))(?=\s)/i);
  if (r) {
    if (r[3]) remindMin = null;
    else if (r[4]) remindMin = 0;
    else {
      const n = parseInt(r[1], 10);
      const u = r[2].toLowerCase()[0];
      remindMin = u === "m" ? n : u === "h" ? n * 60 : n * 1440;
    }
  }

  let time: string | null = null;
  const t = take(/\s(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s?(am|pm)(?=\s)/i) ?? take(/\s(?:at\s+)?([01]?\d|2[0-3]):([0-5]\d)()(?=\s)/i);
  if (t) {
    const parsed = parseTime(`${t[1]}:${t[2] ?? "00"}${t[3] ? " " + t[3] : ""}`);
    if (parsed) time = parsed.label;
  }

  let date: DayKey = today;
  const rel = take(/\s(today|tonight|tomorrow|tmr|tmrw)(?=\s)/i);
  if (rel) date = /^to(day|night)$/i.test(rel[1]) ? today : addDays(today, 1);
  else {
    const inN = take(/\sin\s+(\d{1,2})\s+days?(?=\s)/i);
    if (inN) date = addDays(today, parseInt(inN[1], 10));
    else {
      const wd = take(/\s(next\s+)?(mon|tues?|wed|thu(?:rs?)?|fri|sat|sun)(?:day|sday|nesday|rsday|urday)?(?=\s)/i);
      if (wd) {
        const target = WEEKDAYS[wd[2].toLowerCase()];
        let diff = (target - weekdayIndex(today) + 7) % 7;
        if (wd[1] && diff === 0) diff = 7;
        date = addDays(today, diff);
      } else {
        const md = take(/\s(\d{1,2})\/(\d{1,2})(?=\s)/);
        if (md) {
          const [y] = today.split("-").map(Number);
          const mm = String(parseInt(md[1], 10)).padStart(2, "0");
          const dd = String(parseInt(md[2], 10)).padStart(2, "0");
          let cand = `${y}-${mm}-${dd}` as DayKey;
          if (cand < today) cand = `${y + 1}-${mm}-${dd}` as DayKey;
          date = cand;
        }
      }
    }
  }

  // "due" alone is a strong hint it's a deadline; leave the word in the title.
  if (!kind && /\bdue\b/i.test(input)) kind = "DEADLINE";
  const title = text.replace(/\s+(due|on|by|at)\s*$/i, "").replace(/\s+/g, " ").trim();
  return { title, date, time, kind, place, priority, remindMin };
}

/* ---------------- Day decoration ---------------- */

/** Day-card colors, taken from the app's own palette (olive, clay, sand, peach). */
export const TINTS = {
  sage: { bg: "#EEEFE6", accent: "#585D48" },
  clay: { bg: "#F6E8DE", accent: "#8A553A" },
  sand: { bg: "#F1E9E1", accent: "#6E5644" },
  blush: { bg: "#F9E4DC", accent: "#A5523B" },
} as const;

export type Tint = keyof typeof TINTS;
export const TINT_KEYS = Object.keys(TINTS) as Tint[];

const LEGACY_TINTS: Record<string, Tint> = { pink: "blush", butter: "sand", mint: "sage", sky: "sage" };

/** Map a stored tint (including the earlier color names) to a current palette key. */
export function resolveTint(value: string | null | undefined): Tint | null {
  if (!value) return null;
  if (value in TINTS) return value as Tint;
  return LEGACY_TINTS[value] ?? null;
}

export function partOfDay(minuteOfDay: number): "Morning" | "Afternoon" | "Evening" {
  return minuteOfDay < 12 * 60 ? "Morning" : minuteOfDay < 17 * 60 ? "Afternoon" : "Evening";
}
