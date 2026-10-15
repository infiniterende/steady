"use client";

import { useState } from "react";
import type { Domain } from "@prisma/client";
import { DOMAIN_COLOR, DOMAIN_LABEL } from "@/lib/domain";
import { Bar } from "@/components/app/ui";

export type TrackedHabit = { id: string; name: string; domain: Domain; progress: number; paused: boolean };

export function HabitsTracked({ habits }: { habits: TrackedHabit[] }) {
  const [tab, setTab] = useState<"All" | "This cycle">("All");
  const [open, setOpen] = useState<Record<string, boolean>>({ GROWTH: true });

  const visible = tab === "All" ? habits : habits.filter((h) => !h.paused);
  const groups = [...new Set(visible.map((h) => h.domain))];

  return (
    <>
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-[17px] font-bold">Habits tracked</h2>
        <span className="text-xs text-muted">{habits.filter((h) => !h.paused).length} active</span>
      </div>
      <div className="mb-1 mt-3 flex gap-4 border-b border-line">
        {(["All", "This cycle"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className="cursor-pointer border-0 bg-transparent pb-2.5 text-[13px] font-semibold"
            style={{
              color: tab === t ? "#40453A" : "oklch(0.5 0.014 80)",
              borderBottom: `2px solid ${tab === t ? "#B7B7A4" : "transparent"}`,
            }}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="flex flex-col">
        {groups.map((g) => {
          const isOpen = !!open[g];
          return (
            <div key={g} className="border-b border-surface py-3">
              <button
                type="button"
                onClick={() => setOpen((o) => ({ ...o, [g]: !o[g] }))}
                className="flex w-full cursor-pointer items-center justify-between gap-2.5 border-0 bg-transparent p-0 text-left text-inherit"
              >
                <span className="flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: DOMAIN_COLOR[g] }} />
                  <span className="text-sm font-semibold">{DOMAIN_LABEL[g]}</span>
                </span>
                <span className="text-[11px] text-muted">{isOpen ? "Hide" : "Show"}</span>
              </button>
              {isOpen && (
                <div className="mt-3 flex flex-col gap-3">
                  {visible
                    .filter((h) => h.domain === g)
                    .map((h) => (
                      <div key={h.id} style={{ opacity: h.paused ? 0.55 : 1 }}>
                        <div className="mb-1.5 flex items-center justify-between gap-2 text-[13px]">
                          <span className="text-[oklch(0.4_0.014_80)]">{h.name}</span>
                          <span className="font-mono text-muted">{h.progress}%</span>
                        </div>
                        <Bar pct={h.progress} color={DOMAIN_COLOR[g]} height={6} track="#E8DDD3" />
                      </div>
                    ))}
                </div>
              )}
            </div>
          );
        })}
        {groups.length === 0 && <div className="py-4 text-[13px] text-muted">No habits yet.</div>}
      </div>
    </>
  );
}
