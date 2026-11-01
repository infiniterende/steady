"use client";

import { useEffect, useRef, useState } from "react";
import { BellIcon } from "@/components/planner/BellIcon";

export type DueReminder = { id: string; minuteOfDay: number; title: string; note: string | null; kind: string };

/** Fires today's reminders at their minute: an in-app toast, plus a system notification when allowed. */
export function ReminderNotifier({ reminders, quietHours }: { reminders: DueReminder[]; quietHours: boolean }) {
  const [toasts, setToasts] = useState<DueReminder[]>([]);
  const fired = useRef<Set<string>>(new Set());
  const startMinute = useRef<number | null>(null);

  useEffect(() => {
    const nowMinute = () => {
      const d = new Date();
      return d.getHours() * 60 + d.getMinutes();
    };
    if (startMinute.current === null) startMinute.current = nowMinute();

    const tick = () => {
      const now = nowMinute();
      for (const r of reminders) {
        if (fired.current.has(r.id)) continue;
        // Only fire reminders that come due after the page was opened, within a 2-minute window.
        if (r.minuteOfDay < (startMinute.current ?? 0) || r.minuteOfDay > now || now - r.minuteOfDay > 2) continue;
        if (quietHours && (now >= 22 * 60 || now < 6 * 60)) continue;
        fired.current.add(r.id);
        setToasts((t) => [...t, r]);
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          try {
            new Notification(r.title, { body: r.note ?? "Reminder", tag: r.id });
          } catch {
            /* ignore */
          }
        }
        setTimeout(() => setToasts((t) => t.filter((x) => x.id !== r.id)), 15000);
      }
    };
    tick();
    const iv = setInterval(tick, 20000);
    return () => clearInterval(iv);
  }, [reminders, quietHours]);

  if (!toasts.length) return null;
  return (
    <div className="pointer-events-none fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-5 z-[90] flex w-[320px] max-w-[calc(100vw-40px)] flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} role="status" className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-line bg-white p-3.5 shadow-[0_16px_40px_rgba(64,69,58,0.18)]">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface text-[#B45309]"><BellIcon size={18} /></span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{t.title}</span>
            <span className="block text-xs text-muted-2">{t.note ?? "Reminder"}</span>
          </span>
          <button type="button" aria-label="Dismiss" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} className="cursor-pointer border-0 bg-transparent text-base text-muted-3 hover:text-ink">×</button>
        </div>
      ))}
    </div>
  );
}
