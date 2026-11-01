"use client";

import { useEffect, useRef, useState } from "react";
import type { PlannerKind } from "@prisma/client";
import { setPlannerDone } from "@/app/app/actions";
import { KIND_META, dueDate, fireAt } from "@/lib/planner";
import { installAudioUnlock, playChime, soundEnabled, systemNotify } from "@/components/planner/alerts";
import { BellIcon } from "@/components/planner/BellIcon";

export type PlannerReminder = { id: string; title: string; kind: PlannerKind; day: string; minuteOfDay: number | null; remindMin: number };

type Alert = { key: string; id: string; title: string; kind: PlannerKind; when: string };

const FIRED_KEY = "steady.planner.fired";
const SNOOZE_KEY = "steady.planner.snooze";
const GRACE_MS = 60 * 60 * 1000; // still worth announcing for an hour after the due time
const DAY_MS = 86_400_000;

function readMap(key: string): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "{}") as Record<string, number>;
  } catch {
    return {};
  }
}
function writeMap(key: string, map: Record<string, number>) {
  try {
    const cutoff = Date.now() - 4 * DAY_MS;
    const pruned = Object.fromEntries(Object.entries(map).filter(([, v]) => v > cutoff));
    localStorage.setItem(key, JSON.stringify(pruned));
  } catch {}
}

function whenLabel(r: PlannerReminder, now: number) {
  const due = dueDate(r.day, r.minuteOfDay).getTime();
  if (r.minuteOfDay === null) {
    const today = new Date(now);
    const d = new Date(due);
    const diff = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / DAY_MS);
    return diff === 0 ? "Due today" : diff === 1 ? "Due tomorrow" : diff < 0 ? "Was due earlier" : `Due in ${diff} days`;
  }
  const mins = Math.round((due - now) / 60000);
  const clock = new Date(due).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (mins > 90) return `Due at ${clock}`;
  if (mins > 0) return `Due in ${mins} min (${clock})`;
  if (mins === 0) return `Due now (${clock})`;
  return `Was due ${-mins} min ago (${clock})`;
}

/** Announces planner reminders with a popup, a chime and (when allowed) a system notification. */
export function PlannerNotifier({ reminders }: { reminders: PlannerReminder[] }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [blocked, setBlocked] = useState(false);
  const list = useRef(reminders);
  useEffect(() => {
    list.current = reminders;
  }, [reminders]);

  useEffect(() => installAudioUnlock(), []);

  useEffect(() => {
    const check = () => {
      const now = Date.now();
      const fired = readMap(FIRED_KEY);
      const snoozed = readMap(SNOOZE_KEY);
      const fresh: Alert[] = [];
      for (const r of list.current) {
        const key = `${r.id}@${r.day}T${r.minuteOfDay ?? "x"}/${r.remindMin}`;
        const start = fireAt(r.day, r.minuteOfDay, r.remindMin).getTime();
        const end = dueDate(r.day, r.minuteOfDay).getTime() + GRACE_MS;
        if (snoozed[key]) {
          if (now < snoozed[key]) continue;
          delete snoozed[key];
        } else if (fired[key] || now < start || now > end) continue;
        fired[key] = now;
        fresh.push({ key, id: r.id, title: r.title, kind: r.kind, when: whenLabel(r, now) });
      }
      if (!fresh.length) return;
      writeMap(FIRED_KEY, fired);
      writeMap(SNOOZE_KEY, snoozed);
      setAlerts((a) => [...a.filter((x) => !fresh.some((f) => f.key === x.key)), ...fresh]);
      if (soundEnabled()) setBlocked(!playChime());
      for (const f of fresh) systemNotify(f.title, `${KIND_META[f.kind].label} · ${f.when}`, f.key);
    };
    const first = setTimeout(check, 0);
    const iv = setInterval(check, 15000);
    return () => {
      clearTimeout(first);
      clearInterval(iv);
    };
  }, []);

  const dismiss = (key: string) => setAlerts((a) => a.filter((x) => x.key !== key));
  const snooze = (a: Alert, minutes: number) => {
    const snoozed = readMap(SNOOZE_KEY);
    snoozed[a.key] = Date.now() + minutes * 60000;
    writeMap(SNOOZE_KEY, snoozed);
    dismiss(a.key);
  };

  if (!alerts.length) return null;
  return (
    <div className="fixed right-5 top-[max(1.25rem,env(safe-area-inset-top))] z-[100] flex w-[360px] max-w-[calc(100vw-40px)] flex-col gap-3" role="alert" aria-live="assertive">
      {blocked && (
        <div className="rounded-xl bg-[#40453A] px-3.5 py-2 text-xs text-white">
          Your browser muted the chime. Click anywhere on the page once to allow sound for future reminders.
        </div>
      )}
      {alerts.map((a) => {
        const meta = KIND_META[a.kind];
        return (
          <div key={a.key} className="rounded-2xl border border-soft bg-white p-4 shadow-[0_20px_50px_rgba(64,69,58,0.28)]">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface text-[#B45309]"><BellIcon size={20} /></span>
              <div className="min-w-0 flex-1">
                <span className="mb-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ background: meta.bg, color: meta.color }}>
                  {meta.label}
                </span>
                <div className="text-[15px] font-semibold leading-snug">{a.title}</div>
                <div className="mt-0.5 text-xs text-muted-2">{a.when}</div>
              </div>
              <button type="button" aria-label="Dismiss reminder" onClick={() => dismiss(a.key)} className="cursor-pointer border-0 bg-transparent text-lg leading-none text-muted-3 hover:text-ink">
                ×
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="cursor-pointer rounded-[9px] border-0 bg-olive px-3.5 py-2 text-xs font-semibold text-white hover:bg-olive-dark"
                onClick={() => {
                  void setPlannerDone(a.id, true);
                  dismiss(a.key);
                }}
              >
                Mark done
              </button>
              <button type="button" className="cursor-pointer rounded-[9px] border border-soft bg-white px-3 py-2 text-xs font-semibold text-[oklch(0.45_0.014_80)] hover:bg-surface" onClick={() => snooze(a, 10)}>
                Snooze 10 min
              </button>
              <button type="button" className="cursor-pointer rounded-[9px] border border-soft bg-white px-3 py-2 text-xs font-semibold text-[oklch(0.45_0.014_80)] hover:bg-surface" onClick={() => dismiss(a.key)}>
                Dismiss
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
