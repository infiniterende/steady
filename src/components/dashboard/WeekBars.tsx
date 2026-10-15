"use client";

import { useState } from "react";

export type WeekDay = { label: string; day: string; done: number; total: number; isToday: boolean };

export function WeekBars({ days }: { days: WeekDay[] }) {
  const [sel, setSel] = useState(() => Math.max(0, days.findIndex((d) => d.isToday)));
  const max = Math.max(1, ...days.map((d) => d.total), ...days.map((d) => d.done));
  const s = days[sel] ?? days[0];

  return (
    <>
      <div className="mb-5 flex items-baseline justify-between gap-3">
        <h2 className="text-[19px] font-bold">Blocks completed</h2>
        <span className="text-xs text-muted-2">
          {s.label} · {s.done} of {s.total} blocks completed
        </span>
      </div>
      <div className="flex h-[140px] items-end gap-2.5">
        {days.map((d, i) => {
          const on = i === sel;
          const h = Math.round((d.done / max) * 92) + 8;
          return (
            <button
              key={d.day}
              type="button"
              onClick={() => setSel(i)}
              className="flex h-full flex-1 cursor-pointer flex-col items-stretch justify-end gap-2 border-0 bg-transparent p-0 hover:opacity-85"
              aria-pressed={on}
              title={`${d.label}: ${d.done} of ${d.total}`}
            >
              <div
                className="rounded-t-lg rounded-b transition-[height,background] duration-300"
                style={{ height: h, background: on ? "#6B705C" : "#CFCFC0" }}
              />
              <span className="text-[11px]" style={{ fontWeight: on ? 700 : 500, color: on ? "oklch(0.44 0.014 80)" : "oklch(0.55 0.014 80)" }}>
                {d.label}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
