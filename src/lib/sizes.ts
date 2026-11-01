import type { HabitSize } from "@prisma/client";

export const SIZES: HabitSize[] = ["MIN", "STANDARD", "STRETCH"];

export const SIZE_NAME: Record<HabitSize, string> = {
  MIN: "Minimum",
  STANDARD: "Standard",
  STRETCH: "Stretch",
};

export const SIZE_SHORT: Record<HabitSize, string> = { MIN: "Min", STANDARD: "Std", STRETCH: "Stretch" };

export type SizeOption = { size: HabitSize; label: string; minutes: number };

export type HabitSizing = {
  name: string;
  minutes: number;
  minLabel: string | null;
  stdLabel: string | null;
  stretchLabel: string | null;
  minMinutes: number;
  stretchMinutes: number | null;
};

/** The three versions of a habit. Falls back to time-based wording when no labels are set. */
export function habitSizes(h: HabitSizing): SizeOption[] {
  const stretch = h.stretchMinutes ?? Math.round(h.minutes * 1.5);
  return [
    { size: "MIN", label: h.minLabel?.trim() || `${h.minMinutes}-minute version`, minutes: h.minMinutes },
    { size: "STANDARD", label: h.stdLabel?.trim() || `${h.minutes} minutes`, minutes: h.minutes },
    { size: "STRETCH", label: h.stretchLabel?.trim() || `${stretch} minutes`, minutes: stretch },
  ];
}
