import type { Domain } from "@prisma/client";

export const DOMAIN_LABEL: Record<Domain, string> = {
  HEALTH: "Health",
  GROWTH: "Personal development",
  FOCUS: "Focus",
  HOME: "Home",
};

/** Short category label used on task chips. */
export const CATEGORY_LABEL: Record<Domain, string> = {
  HEALTH: "Health",
  GROWTH: "Growth",
  FOCUS: "Focus",
  HOME: "Home",
};

export const DOMAIN_COLOR: Record<Domain, string> = {
  GROWTH: "#B7B7A4",
  HEALTH: "#DDBEA9",
  FOCUS: "#CB997E",
  HOME: "#A5A58D",
};

export const CAT: Record<Domain, { bg: string; stroke: string; icon: string }> = {
  HEALTH: {
    bg: "#EEEFE6",
    stroke: "#585D48",
    icon: "M11 18s-6.5-3.8-6.5-8.3A3.7 3.7 0 0 1 11 7.6a3.7 3.7 0 0 1 6.5 2.1C17.5 14.2 11 18 11 18z",
  },
  FOCUS: {
    bg: "#F6E8DE",
    stroke: "#8A553A",
    icon: "M11 3.5a7.5 7.5 0 1 0 0 15a7.5 7.5 0 1 0 0-15zM11 7.5a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0-7z",
  },
  GROWTH: {
    bg: "#F1E9E1",
    stroke: "#6E5644",
    icon: "M3.5 5.5c2.5-1 5-1 7.5.5v12c-2.5-1.5-5-1.5-7.5-.5zM18.5 5.5c-2.5-1-5-1-7.5.5v12c2.5-1.5 5-1.5 7.5-.5z",
  },
  HOME: { bg: "#ECEBE4", stroke: "#55574A", icon: "M4 10l7-6 7 6v8H4zM9 18v-5h4v5" },
};

export const DOMAINS: Domain[] = ["HEALTH", "FOCUS", "GROWTH", "HOME"];

export const PRIORITY_STYLE = {
  HIGH: { bg: "#F3DDD2", color: "#8A3F24", label: "High" },
  MEDIUM: { bg: "#F1E9E1", color: "#6E5644", label: "Medium" },
  LOW: { bg: "#ECEBE4", color: "#55574A", label: "Low" },
} as const;

export const POINTS = { block: 12, task: 5, habitLog: 8, timerStart: 2, session: 8 } as const;

export function initialsOf(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
