import type { Domain } from "@prisma/client";

export type Starter = {
  key: string;
  name: string;
  domain: Domain;
  time: string;
  minutes: number;
  cadence: string;
  note: string;
  minLabel: string;
  stdLabel: string;
  stretchLabel: string;
  /** Optional daily nudge created with the habit. */
  reminder?: { time: string; repeat: string };
};

/** Suggestions offered during first-run setup. Nothing here is created unless the person picks it. */
export const STARTERS: Starter[] = [
  {
    key: "mobility",
    name: "Morning mobility",
    domain: "HEALTH",
    time: "6:30 AM",
    minutes: 20,
    cadence: "Daily",
    note: "Full routine plus 5 min breathing",
    minLabel: "Stretch for 2 minutes",
    stdLabel: "Full 20-minute routine",
    stretchLabel: "Routine plus 10 min breathing",
    reminder: { time: "6:20 AM", repeat: "Every day" },
  },
  {
    key: "reading",
    name: "Reading",
    domain: "GROWTH",
    time: "8:00 AM",
    minutes: 30,
    cadence: "Daily",
    note: "Continue the current chapter",
    minLabel: "Read 1 page",
    stdLabel: "Read 10 pages",
    stretchLabel: "Read 20 pages",
  },
  {
    key: "deepwork",
    name: "Deep work block",
    domain: "FOCUS",
    time: "10:00 AM",
    minutes: 60,
    cadence: "Weekdays",
    note: "One task, notifications off",
    minLabel: "5 focused minutes",
    stdLabel: "One 60-minute block",
    stretchLabel: "Two blocks",
  },
  {
    key: "walk",
    name: "Walk outside",
    domain: "HEALTH",
    time: "12:30 PM",
    minutes: 30,
    cadence: "Daily",
    note: "No podcast, no phone",
    minLabel: "Step outside for 2 minutes",
    stdLabel: "30-minute walk",
    stretchLabel: "45-minute walk",
  },
  {
    key: "language",
    name: "Language practice",
    domain: "FOCUS",
    time: "6:00 PM",
    minutes: 25,
    cadence: "Daily",
    note: "Speaking drill, then review deck",
    minLabel: "Review 3 flashcards",
    stdLabel: "25-minute drill and deck",
    stretchLabel: "40 minutes with a speaking partner",
  },
  {
    key: "closeout",
    name: "Day close-out",
    domain: "FOCUS",
    time: "9:30 PM",
    minutes: 10,
    cadence: "Daily",
    note: "Log the day, set tomorrow's three",
    minLabel: "Write one line",
    stdLabel: "Log the day, set tomorrow's three",
    stretchLabel: "Plus a short reflection",
    reminder: { time: "9:20 PM", repeat: "Every day" },
  },
];
