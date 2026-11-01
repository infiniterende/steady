"use client";

import { useTransition } from "react";
import type { CalendarItem } from "@/lib/data";
import { formatDay } from "@/lib/dates";
import { ItemRow } from "@/components/calendar/CalendarBoard";

export function UpcomingWeek({ items, today }: { items: CalendarItem[]; today: string }) {
  const [pending, startTransition] = useTransition();
  const run = (fn: () => Promise<unknown>) => startTransition(() => fn().then(() => undefined));
  const reminders = items.filter((i) => i.kind === "REMINDER" || i.kind === "HABIT_REMINDER" || i.kind === "AUTO_REMINDER");
  const events = items.filter((i) => i.kind === "EVENT" || i.kind === "TASK");
  const days = [...new Set(items.map((i) => i.day))];

  return (
    <>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div>
          <h2 className="mb-1 text-[19px] font-bold">This week</h2>
          <p className="text-[13px] text-muted-2">
            {reminders.length} {reminders.length === 1 ? "reminder" : "reminders"} · {events.length} {events.length === 1 ? "event or task" : "events and tasks"} in the next 7 days
          </p>
        </div>
      </div>
      {days.length === 0 ? (
        <div className="rounded-[14px] border border-dashed border-soft p-6 text-center text-[13px] text-muted">Nothing coming up this week.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {days.map((d) => (
            <div key={d}>
              <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-3">
                <span>{d === today ? "Today" : formatDay(d, { weekday: "long", month: "short", day: "numeric" })}</span>
                <span className="h-px flex-1 bg-line" />
              </div>
              {items.filter((i) => i.day === d).map((i) => <ItemRow key={i.id} item={i} pending={pending} run={run} />)}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
