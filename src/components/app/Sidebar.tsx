"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { label: "Today", href: "/app" },
  { label: "Dashboard", href: "/app/dashboard" },
  { label: "Habits", href: "/app/habits" },
  { label: "Goals", href: "/app/goals" },
  { label: "Calendar", href: "/app/calendar" },
  { label: "Schedule", href: "/app/schedule" },
  { label: "Streaks", href: "/app/streaks" },
  { label: "Group", href: "/app/group" },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <nav className="hidden w-[216px] shrink-0 flex-col gap-1 border-r border-line bg-white px-3.5 py-5 md:flex">
      {NAV.map((n) => {
        const on = n.href === "/app" ? pathname === "/app" : pathname.startsWith(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-sm transition hover:bg-surface"
            style={{
              fontWeight: on ? 600 : 500,
              color: on ? "#40453A" : "oklch(0.48 0.014 80)",
              background: on ? "#F4EDE6" : "transparent",
            }}
          >
            <span className="h-[7px] w-[7px] shrink-0 rounded-[3px]" style={{ background: on ? "#B7B7A4" : "#DDBEA9" }} />
            {n.label}
          </Link>
        );
      })}
      <div className="mt-auto rounded-xl bg-surface p-3.5 text-xs leading-relaxed text-muted">
        <div className="mb-1 font-semibold text-[oklch(0.33_0.014_80)]">Weekly review</div>
        Sunday, 7:00 pm — 12 minutes
      </div>
    </nav>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-line bg-white px-3 py-2 md:hidden">
      {NAV.map((n) => {
        const on = n.href === "/app" ? pathname === "/app" : pathname.startsWith(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            className="shrink-0 rounded-full px-3 py-1.5 text-[13px]"
            style={{
              fontWeight: on ? 600 : 500,
              color: on ? "#40453A" : "oklch(0.48 0.014 80)",
              background: on ? "#F4EDE6" : "transparent",
            }}
          >
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
