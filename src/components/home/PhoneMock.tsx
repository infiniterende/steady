"use client";

import { useState } from "react";

const PASTEL = ["#F9D8CF", "#D3E9DF", "#D6E3F3", "#F8EBC4"];
const TASKS = [
  { name: "Morning mobility", meta: "6:30 AM · 20 min" },
  { name: "Reading", meta: "8:00 AM · 45 min" },
  { name: "Walk outside", meta: "12:30 PM · 30 min" },
  { name: "Language practice", meta: "6:00 PM · 25 min" },
];
const MINI_BARS = [60, 35, 80, 50, 95, 40, 70];

export function PhoneMock() {
  const [done, setDone] = useState<Record<number, boolean>>({ 0: true, 1: true });
  const doneCount = Object.values(done).filter(Boolean).length;
  const streak = 17 + (doneCount === 4 ? 1 : 0);

  return (
    <div className="relative mt-16 flex w-full items-end justify-center gap-5">
      <div className="hidden w-[200px] shrink-0 -rotate-4 rounded-[20px] bg-white/85 p-4 text-left shadow-[0_16px_40px_rgba(120,90,70,0.1)] sm:block sm:mb-[70px]">
        <div className="text-[11px] uppercase tracking-[0.08em] text-[#7A726A]">Focus minutes</div>
        <div className="mt-1 mb-2.5 font-mono text-[28px]">415</div>
        <div className="flex h-11 items-end gap-[5px]">
          {MINI_BARS.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded"
              style={{ height: `${h}%`, background: i === 4 ? "#F4C9B8" : "#D3E9DF" }}
            />
          ))}
        </div>
      </div>

      <div className="min-w-[280px] flex-[0_1_340px] rounded-t-[36px] border-8 border-b-0 border-[#3A3530] bg-white px-[18px] pt-4 pb-7 text-left shadow-[0_30px_70px_rgba(120,90,70,0.18)]">
        <div className="mb-[18px] flex items-center justify-between text-[11px] text-[#7A726A]">
          <span>Mon, 07:32</span>
          <span className="h-[18px] w-16 rounded-full bg-[#3A3530]" />
          <span>86%</span>
        </div>
        <div className="mb-4 flex items-center justify-between gap-2.5">
          <span className="text-2xl font-bold tracking-[-0.02em]">Today</span>
          <span className="rounded-full bg-butter px-2.5 py-[5px] text-[11px] font-semibold text-[#5E4C1E]">
            {streak} day streak
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {TASKS.map((t, i) => {
            const d = !!done[i];
            return (
              <button
                key={t.name}
                type="button"
                onClick={() => setDone((s) => ({ ...s, [i]: !s[i] }))}
                className="flex w-full cursor-pointer items-center gap-3 rounded-[14px] border-0 px-3 py-[11px] text-left text-inherit"
                style={{ background: PASTEL[i] + (d ? "88" : "") }}
              >
                <span
                  className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full text-xs text-white"
                  style={{
                    border: `2px solid ${d ? "#3A3530" : "rgba(58,53,48,0.25)"}`,
                    background: d ? "#3A3530" : "rgba(255,255,255,0.7)",
                  }}
                >
                  {d ? "✓" : ""}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className="block text-sm font-semibold"
                    style={d ? { textDecoration: "line-through", color: "#8A827A" } : undefined}
                  >
                    {t.name}
                  </span>
                  <span className="block text-[11px] text-[#7A726A]">{t.meta}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="hidden w-[190px] shrink-0 rotate-4 rounded-[20px] bg-white/85 p-4 text-left shadow-[0_16px_40px_rgba(120,90,70,0.1)] sm:block sm:mb-[120px]">
        <div className="text-[11px] uppercase tracking-[0.08em] text-[#7A726A]">Goal</div>
        <div className="mt-1 mb-2.5 text-sm font-semibold">Read 20 books</div>
        <div className="h-2 overflow-hidden rounded-full bg-[#F3EAE3]">
          <div className="h-full w-[65%] rounded-full bg-[#F4C9B8]" />
        </div>
        <div className="mt-2 font-mono text-xs text-[#6A625A]">13 / 20</div>
      </div>
    </div>
  );
}
