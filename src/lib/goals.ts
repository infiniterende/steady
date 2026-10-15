/** Pure helpers for goal progress and milestones (safe on server and client). */

export type GoalKind = "COUNT" | "MEASURE";

export type GoalLike = {
  kind: GoalKind;
  start: number;
  current: number;
  target: number;
  unit: string;
  step: number;
};

export type EntryLike = { date: string; value: number };
export type MilestoneLike = { id: string; label: string; value: number };

export function fmtNum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, "");
}

export function pluralUnit(n: number, unit: string) {
  return n === 1 && unit.endsWith("s") ? unit.slice(0, -1) : unit;
}

/** Latest logged value, or the starting value when nothing is logged yet. */
export function latestValue(goal: GoalLike, entries: EntryLike[]): number {
  if (goal.kind === "COUNT") return goal.current;
  const latest = [...entries].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  return latest ? latest.value : goal.start;
}

/** Direction of travel: +1 when the target is above the start, -1 when below. */
export function direction(goal: GoalLike): 1 | -1 {
  if (goal.kind === "COUNT") return 1;
  return goal.target >= goal.start ? 1 : -1;
}

/** 0–100 progress toward the target. */
export function progressPct(goal: GoalLike, entries: EntryLike[]): number {
  const value = latestValue(goal, entries);
  if (goal.kind === "COUNT") return goal.target ? clamp((value / goal.target) * 100) : 0;
  const span = goal.target - goal.start;
  if (!span) return 100;
  return clamp(((value - goal.start) / span) * 100);
}

export function remaining(goal: GoalLike, entries: EntryLike[]): number {
  const value = latestValue(goal, entries);
  const dir = direction(goal);
  return Math.max(0, (goal.target - value) * dir);
}

/** Has a value reached a checkpoint, respecting the goal's direction? */
export function reached(goal: GoalLike, value: number, checkpoint: number): boolean {
  return direction(goal) === 1 ? value >= checkpoint : value <= checkpoint;
}

export type MilestoneStatus = MilestoneLike & { achieved: boolean; achievedOn: string | null; isNext: boolean };

/** Milestones ordered along the direction of travel, with achievement state from the entry history. */
export function milestoneStatus(goal: GoalLike, entries: EntryLike[], milestones: MilestoneLike[]): MilestoneStatus[] {
  const dir = direction(goal);
  const sorted = [...milestones].sort((a, b) => (a.value - b.value) * dir);
  const history = [...entries].sort((a, b) => (a.date < b.date ? -1 : 1));
  const latest = latestValue(goal, entries);
  let nextFound = false;
  return sorted.map((m) => {
    const achieved = reached(goal, latest, m.value);
    const first = achieved ? history.find((e) => reached(goal, e.value, m.value)) : undefined;
    const isNext = !achieved && !nextFound;
    if (isNext) nextFound = true;
    return { ...m, achieved, achievedOn: first?.date ?? null, isNext };
  });
}

/** Default checkpoints at 25 / 50 / 75 / 100 % of the way. */
export function defaultMilestones(goal: GoalLike): { label: string; value: number; sortOrder: number }[] {
  const from = goal.kind === "COUNT" ? 0 : goal.start;
  const span = goal.target - from;
  if (!span) return [];
  return [0.25, 0.5, 0.75, 1].map((k, i) => {
    const raw = from + span * k;
    const value = goal.kind === "COUNT" ? Math.round(raw) : Math.round(raw * 10) / 10;
    const label =
      goal.kind === "COUNT"
        ? `${fmtNum(value)} ${pluralUnit(value, goal.unit)}`
        : k === 1
          ? `Target · ${fmtNum(value)} ${goal.unit}`
          : `${fmtNum(Math.abs(value - from))} ${goal.unit} ${direction(goal) === -1 ? "down" : "up"}`;
    return { label, value, sortOrder: i };
  });
}

/** Short, human status line for a card. */
export function paceNote(goal: GoalLike, entries: EntryLike[], deadline: string | null, today: string): string {
  const pct = progressPct(goal, entries);
  if (pct >= 100) return "Met";
  const left = remaining(goal, entries);
  const leftLabel = `${fmtNum(left)} ${pluralUnit(left, goal.unit)} to go`;
  if (!deadline) return entries.length ? leftLabel : "Just started";
  const daysLeft = Math.round((Date.parse(deadline) - Date.parse(today)) / 86_400_000);
  if (daysLeft < 0) return `Past deadline · ${leftLabel}`;
  if (daysLeft === 0) return `Due today · ${leftLabel}`;
  const perWeek = left / (daysLeft / 7);
  return `${leftLabel} · ${fmtNum(Math.round(perWeek * 10) / 10)} ${goal.unit}/week to make it`;
}

function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}
