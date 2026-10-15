"use client";

import Link from "next/link";
import { useState } from "react";
import { DAY_NAMES, formatDay } from "@/lib/dates";

export type CalendarCell = { day: string; num: number; done: number; total: number; isToday: boolean };

export function MonthGrid({
  monthLabel,
  cells,
  lead,
  prevHref,
  nextHref,
  initialSelected,
}: {
  monthLabel: string;
  cells: CalendarCell[];
  lead: number;
  prevHref: string;
  nextHref: string;
  initialSelected: string;
}) {
  const [selected, setSelected] = useState(initialSelected);
  const sel = cells.find((c) => c.day === selected) ?? cells[0];
  const navBtn =
    "grid h-[34px] w-[34px] place-items-center rounded-[10px] border border-line bg-white text-sm text-[oklch(0.45_0.014_80)] hover:bg-surface hover:text-[oklch(0.45_0.014_80)]";

  return (
    <>
      <div className="mb-[18px] flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="mb-1 text-[26px] font-bold tracking-[-0.02em]">{monthLabel}</h1>
          <p className="text-[13px] text-muted-2">
            {formatDay(sel.day, { weekday: "long", month: "long", day: "numeric" })} selected ·{" "}
            {sel.total === 0 ? "no blocks" : `${sel.done} of ${sel.total} blocks done`} ·{" "}
            <Link href={`/app?d=${sel.day}`} className="font-semibold">
              Open day
            </Link>
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={prevHref} className={navBtn} aria-label="Previous month">
            ‹
          </Link>
          <Link href={nextHref} className={navBtn} aria-label="Next month">
            ›
          </Link>
        </div>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-2">
        {DAY_NAMES.map((d) => (
          <div key={d} className="pl-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-3">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: lead }, (_, i) => (
          <div key={`b${i}`} className="min-h-[78px]" />
        ))}
        {cells.map((c) => {
          const on = c.day === selected;
          const filled = c.total ? Math.round((c.done / c.total) * 5) : 0;
          const full = c.total > 0 && c.done === c.total;
          return (
            <button
              key={c.day}
              type="button"
              onClick={() => setSelected(c.day)}
              aria-pressed={on}
              className="flex min-h-[78px] cursor-pointer flex-col items-start gap-[7px] rounded-xl px-2.5 py-[9px] text-left text-inherit hover:bg-surface"
              style={{
                border: `1px solid ${on ? "#6B705C" : "#E8DDD3"}`,
                background: on ? "#F4EDE6" : "#fff",
                boxShadow: c.isToday ? "inset 0 0 0 1px #DDBEA9" : undefined,
              }}
            >
              <span className="font-mono text-sm">{c.num}</span>
              <span className="flex gap-[3px]">
                {Array.from({ length: 5 }, (_, i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: i < filled ? (full ? "#6B705C" : "#B7B7A4") : "#E8DDD3" }}
                  />
                ))}
              </span>
              <span className="text-[10px] text-muted-3">{c.total === 0 ? "rest" : `${c.done} of ${c.total}`}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
