/** Dates are handled as "YYYY-MM-DD" strings in the user's timezone. */

export type DayKey = string;

export function todayKey(timeZone: string): DayKey {
  return keyInZone(new Date(), timeZone);
}

export function keyInZone(d: Date, timeZone: string): DayKey {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(d);
    const get = (t: string) => parts.find((p) => p.type === t)!.value;
    return `${get("year")}-${get("month")}-${get("day")}`;
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

export function isDayKey(v: unknown): v is DayKey {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v + "T00:00:00Z"));
}

/** Prisma @db.Date column value for a key (UTC midnight). */
export function keyToDate(key: DayKey): Date {
  return new Date(key + "T00:00:00Z");
}

export function dateToKey(d: Date): DayKey {
  return d.toISOString().slice(0, 10);
}

export function addDays(key: DayKey, n: number): DayKey {
  const d = keyToDate(key);
  d.setUTCDate(d.getUTCDate() + n);
  return dateToKey(d);
}

export function diffDays(a: DayKey, b: DayKey): number {
  return Math.round((keyToDate(a).getTime() - keyToDate(b).getTime()) / 86_400_000);
}

/** 0 = Monday … 6 = Sunday */
export function weekdayIndex(key: DayKey): number {
  return (keyToDate(key).getUTCDay() + 6) % 7;
}

export const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function formatDay(key: DayKey, opts: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" }) {
  return keyToDate(key).toLocaleDateString("en-US", { ...opts, timeZone: "UTC" });
}

/** "6:30 AM" → 390. Returns null if unparseable. */
export function parseTime(input: string): { label: string; minuteOfDay: number } | null {
  const m = input.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*([ap]\.?m\.?)?$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const ampm = m[3]?.toLowerCase().replace(/\./g, "");
  if (min > 59) return null;
  if (ampm) {
    if (h < 1 || h > 12) return null;
    if (ampm === "pm" && h !== 12) h += 12;
    if (ampm === "am" && h === 12) h = 0;
  } else if (h > 23) {
    return null;
  }
  const minuteOfDay = h * 60 + min;
  return { label: formatMinute(minuteOfDay), minuteOfDay };
}

export function formatMinute(minuteOfDay: number): string {
  const h24 = Math.floor(minuteOfDay / 60) % 24;
  const min = minuteOfDay % 60;
  const ampm = h24 >= 12 ? "PM" : "AM";
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${String(min).padStart(2, "0")} ${ampm}`;
}
