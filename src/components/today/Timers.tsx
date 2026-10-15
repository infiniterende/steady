"use client";

import { useEffect, useState } from "react";
import { addPoints } from "@/app/app/actions";
import { POINTS } from "@/lib/domain";

type Timer = { id: string; name: string; total: number; left: number; running: boolean; color: string; status: string };

const fmt = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;

export function Timers({ initial, day }: { initial: { id: string; name: string; minutes: number }[]; day: string }) {
  const [timers, setTimers] = useState<Timer[]>(() =>
    initial.slice(0, 2).map((b, i) => ({
      id: b.id,
      name: b.name,
      total: b.minutes * 60,
      left: b.minutes * 60,
      running: false,
      color: i === 0 ? "#CB997E" : "#B7B7A4",
      status: `${b.minutes} min block`,
    })),
  );

  useEffect(() => {
    const iv = setInterval(() => {
      setTimers((ts) => ts.map((t) => (t.running && t.left > 0 ? { ...t, left: t.left - 1 } : t)));
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  const toggle = (id: string) => {
    const t = timers.find((x) => x.id === id);
    if (!t || t.left === 0) return;
    if (!t.running) void addPoints(POINTS.timerStart, `Started ${t.name}`, day);
    setTimers((ts) => ts.map((x) => (x.id === id ? { ...x, running: !x.running } : x)));
  };

  const reset = (id: string) =>
    setTimers((ts) => ts.map((x) => (x.id === id ? { ...x, left: x.total, running: false } : x)));

  const addSession = () =>
    setTimers((ts) => [
      ...ts,
      { id: `s${Date.now()}`, name: "Focus block", total: 1500, left: 1500, running: false, color: "#DDBEA9", status: "Untimed" },
    ]);

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-muted">Active sessions</h2>
        <button
          type="button"
          onClick={addSession}
          className="cursor-pointer rounded-[9px] border border-dashed border-soft bg-white px-3 py-[7px] text-xs font-semibold text-[oklch(0.45_0.014_80)] hover:border-sage hover:text-olive"
        >
          + Session
        </button>
      </div>

      {timers.length === 0 ? (
        <div className="rounded-[14px] border border-dashed border-soft p-6 text-center text-[13px] text-muted">
          No sessions yet. Add one to start a countdown.
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3.5">
          {timers.map((t) => {
            const pct = Math.round(((t.total - t.left) / t.total) * 100);
            const status = t.left === 0 ? "Complete" : t.running ? "Time is running" : pct > 0 ? `Paused · ${pct}% done` : t.status;
            return (
              <div key={t.id} className="flex items-center gap-4 rounded-[14px] border border-line bg-surface p-4">
                <div
                  className="relative h-[78px] w-[78px] shrink-0 rounded-full"
                  style={{ background: `conic-gradient(${t.color} ${pct}%, #F4EDE6 ${pct}% 100%)` }}
                >
                  <div className="absolute inset-2 grid place-items-center rounded-full bg-white text-center">
                    <div>
                      <div className="font-mono text-[17px] font-medium tracking-[-0.02em]">{fmt(t.left)}</div>
                      <div className="text-[9px] tracking-[0.06em] text-muted-3">LEFT</div>
                    </div>
                  </div>
                </div>
                <div className="flex min-w-0 flex-col gap-2">
                  <div className="truncate text-[15px] font-semibold">{t.name}</div>
                  <div className="text-xs text-muted-2">{status}</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggle(t.id)}
                      className="cursor-pointer rounded-lg border-0 px-3.5 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                      style={{ background: t.running ? "oklch(0.44 0.014 80)" : "#6B705C" }}
                    >
                      {t.left === 0 ? "Done" : t.running ? "Pause" : "Start"}
                    </button>
                    <button
                      type="button"
                      onClick={() => reset(t.id)}
                      className="cursor-pointer rounded-lg border border-soft bg-white px-2.5 py-1.5 text-xs text-muted hover:bg-surface"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
