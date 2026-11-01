"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { addCalendarItem, removeCalendarEvent, removeTask, toggleCalendarEvent, toggleTask } from "@/app/app/actions";
import type { CalendarItem } from "@/lib/data";
import { DAY_NAMES, formatDay } from "@/lib/dates";
import { ErrorText, btnPrimary, btnSecondary, inputBase } from "@/components/app/ui";
import { BellIcon } from "@/components/planner/BellIcon";

export type CalendarCell = { day: string; num: number; done: number; total: number; isToday: boolean };

export const KIND_STYLE = {
  EVENT: { label: "Event", color: "#8FB3D9", bg: "#E4EEF8" },
  TASK: { label: "Task", color: "#CB997E", bg: "#F6E8DE" },
  REMINDER: { label: "Reminder", color: "#6B705C", bg: "#EEEFE6" },
  HABIT_REMINDER: { label: "Habit reminder", color: "#A5A58D", bg: "#F4EDE6" },
  AUTO_REMINDER: { label: "Heads-up", color: "#8A8F7A", bg: "#EEEFE6" },
} as const;

type Kind = "EVENT" | "TASK" | "REMINDER";

export function CalendarBoard({
  monthLabel,
  cells,
  lead,
  prevHref,
  nextHref,
  initialSelected,
  items,
  today,
}: {
  monthLabel: string;
  cells: CalendarCell[];
  lead: number;
  prevHref: string;
  nextHref: string;
  initialSelected: string;
  items: CalendarItem[];
  today: string;
}) {
  const [selected, setSelected] = useState(initialSelected);
  const [adding, setAdding] = useState(false);
  const [kind, setKind] = useState<Kind>("EVENT");
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const sel = cells.find((c) => c.day === selected) ?? cells[0];
  const dayItems = items.filter((i) => i.day === selected);
  const byDay = new Map<string, CalendarItem[]>();
  for (const i of items) byDay.set(i.day, [...(byDay.get(i.day) ?? []), i]);

  const navBtn =
    "grid h-[34px] w-[34px] place-items-center rounded-[10px] border border-line bg-white text-sm text-[oklch(0.45_0.014_80)] hover:bg-surface hover:text-[oklch(0.45_0.014_80)]";

  const reset = () => {
    setAdding(false);
    setTitle("");
    setTime("");
    setNote("");
    setError("");
  };

  const commit = () => {
    if (!title.trim()) return setError("Give it a name.");
    if (kind === "REMINDER" && !/\d/.test(time)) return setError("A reminder needs a time, like 7:30 AM.");
    startTransition(async () => {
      const res = await addCalendarItem({ day: selected, kind, title, time, note });
      if (!res.ok) return setError(res.error);
      reset();
    });
  };

  const run = (fn: () => Promise<unknown>) => startTransition(() => fn().then(() => undefined));

  return (
    <>
      <div className="mb-[18px] flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="mb-1 text-[26px] font-bold tracking-[-0.02em]">{monthLabel}</h1>
          <p className="text-[13px] text-muted-2">
            {formatDay(sel.day, { weekday: "long", month: "long", day: "numeric" })} selected ·{" "}
            {sel.total === 0 ? "no blocks" : `${sel.done} of ${sel.total} blocks done`}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={prevHref} className={navBtn} aria-label="Previous month">‹</Link>
          <Link href={nextHref} className={navBtn} aria-label="Next month">›</Link>
        </div>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-2">
        {DAY_NAMES.map((d) => (
          <div key={d} className="pl-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-3">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: lead }, (_, i) => <div key={`b${i}`} className="min-h-[86px]" />)}
        {cells.map((c) => {
          const on = c.day === selected;
          const filled = c.total ? Math.round((c.done / c.total) * 5) : 0;
          const full = c.total > 0 && c.done === c.total;
          const pips = (byDay.get(c.day) ?? []).filter((i) => i.kind !== "HABIT_REMINDER" && i.kind !== "AUTO_REMINDER");
          return (
            <button
              key={c.day}
              type="button"
              onClick={() => { setSelected(c.day); setError(""); }}
              aria-pressed={on}
              className="flex min-h-[64px] min-w-0 cursor-pointer flex-col items-center gap-[6px] rounded-xl px-1 py-[9px] text-left text-inherit hover:bg-surface sm:min-h-[86px] sm:items-start sm:px-2.5"
              style={{
                border: `1px solid ${on ? "#6B705C" : "#E8DDD3"}`,
                background: on ? "#F4EDE6" : "#fff",
                boxShadow: c.isToday ? "inset 0 0 0 1px #DDBEA9" : undefined,
              }}
            >
              <span className="font-mono text-sm">{c.num}</span>
              <span className="h-1.5 w-1.5 rounded-full sm:hidden" style={{ background: c.total === 0 ? "#E8DDD3" : full ? "#6B705C" : filled > 0 ? "#B7B7A4" : "#E8DDD3" }} />
              <span className="hidden gap-[3px] sm:flex">
                {Array.from({ length: 5 }, (_, i) => (
                  <span key={i} className="h-1.5 w-1.5 rounded-full" style={{ background: i < filled ? (full ? "#6B705C" : "#B7B7A4") : "#E8DDD3" }} />
                ))}
              </span>
              <span className="flex min-h-[14px] items-center gap-1">
                {pips.slice(0, 4).map((i, n) => (
                  <span key={i.id} title={i.title} className={`h-[7px] w-[7px] rounded-[2px] ${n >= 2 ? "hidden sm:block" : ""}`} style={{ background: KIND_STYLE[i.kind].color, opacity: i.done ? 0.45 : 1 }} />
                ))}
                {pips.length > 4 && <span className="hidden text-[10px] text-muted-3 sm:inline">+{pips.length - 4}</span>}
                {pips.length === 0 && <span className="hidden text-[10px] text-muted-3 sm:inline">{c.total === 0 ? "rest" : `${c.done} of ${c.total}`}</span>}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected day */}
      <div className="mt-5 rounded-[14px] border border-line bg-[#FAF6F2] p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[17px] font-bold">
              {selected === today ? "Today" : formatDay(selected, { weekday: "long", month: "short", day: "numeric" })}
            </h2>
            <p className="text-xs text-muted-2">
              {dayItems.length ? `${dayItems.length} ${dayItems.length === 1 ? "item" : "items"}` : "Nothing scheduled"} ·{" "}
              <Link href={`/app?d=${selected}`} className="font-semibold">Open day</Link> ·{" "}
              <Link href={`/app/schedule?d=${selected}`} className="font-semibold">Timeblocks</Link>
            </p>
          </div>
          <button type="button" onClick={() => setAdding(true)} className={btnPrimary}>+ Add</button>
        </div>

        {adding && (
          <div className="mb-3 flex flex-col gap-2 rounded-xl border border-dashed border-soft bg-white p-3">
            <div className="flex self-start rounded-[11px] bg-surface p-1">
              {(["EVENT", "TASK", "REMINDER"] as Kind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => { setKind(k); setError(""); }}
                  className="cursor-pointer rounded-lg border-0 px-3.5 py-[7px] text-[13px] font-semibold"
                  style={{ color: kind === k ? "#40453A" : "oklch(0.5 0.014 80)", background: kind === k ? "#fff" : "transparent", boxShadow: kind === k ? "0 1px 3px rgba(64,69,58,0.12)" : "none" }}
                >
                  {KIND_STYLE[k].label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input value={title} onChange={(e) => { setTitle(e.target.value); setError(""); }} onKeyDown={(e) => e.key === "Enter" && commit()} placeholder={kind === "EVENT" ? "Dentist appointment" : kind === "TASK" ? "Send the report" : "Take vitamins"} aria-label="Title" className={`${inputBase} flex-[1_1_200px]`} />
              <input value={time} onChange={(e) => { setTime(e.target.value); setError(""); }} onKeyDown={(e) => e.key === "Enter" && commit()} placeholder={kind === "REMINDER" ? "7:30 AM" : "Time (optional)"} aria-label="Time" className={`${inputBase} w-[140px]`} />
              {kind !== "TASK" && (
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" aria-label="Note" className={`${inputBase} flex-[1_1_160px]`} />
              )}
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={commit} disabled={pending} className={btnPrimary}>Save</button>
              <button type="button" onClick={reset} className={btnSecondary}>Cancel</button>
              <span className="text-xs text-muted">
                {kind === "TASK" ? "Tasks also appear in Today's goals." : kind === "REMINDER" ? "Shows in this week's reminders." : ""}
              </span>
              {error && <ErrorText>{error}</ErrorText>}
            </div>
          </div>
        )}

        <div className="flex flex-col">
          {dayItems.map((i) => <ItemRow key={i.id} item={i} pending={pending} run={run} />)}
          {dayItems.length === 0 && !adding && (
            <div className="rounded-[12px] border border-dashed border-soft p-5 text-center text-[13px] text-muted">
              No events, tasks or reminders on this day. Add one above.
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export function ItemRow({ item, pending, run, showDay }: { item: CalendarItem; pending: boolean; run: (fn: () => Promise<unknown>) => void; showDay?: boolean }) {
  const k = KIND_STYLE[item.kind];
  const completable = item.done !== null;
  const derived = item.kind === "HABIT_REMINDER" || item.kind === "AUTO_REMINDER";
  return (
    <div className="flex items-center gap-3 border-b border-line py-2.5 last:border-b-0" style={{ opacity: item.done ? 0.55 : 1 }}>
      <span className="w-[68px] shrink-0 font-mono text-xs text-muted">{item.time ?? "All day"}</span>
      {completable ? (
        <button
          type="button"
          aria-pressed={!!item.done}
          title={item.done ? "Mark not done" : "Mark done"}
          disabled={pending}
          onClick={() => run(() => (item.kind === "TASK" ? toggleTask(item.id) : toggleCalendarEvent(item.id)))}
          className="grid h-[22px] w-[22px] shrink-0 cursor-pointer place-items-center rounded-full text-[11px] text-white"
          style={{ border: `2px solid ${item.done ? "#6B705C" : "#DDBEA9"}`, background: item.done ? "#6B705C" : "#fff" }}
        >
          {item.done ? "✓" : ""}
        </button>
      ) : (
        <span className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full text-[11px]" style={{ background: k.bg, color: k.color }}>
          {item.kind === "AUTO_REMINDER" ? <BellIcon size={13} /> : "◷"}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold" style={item.done ? { textDecoration: "line-through" } : undefined}>{item.title}</span>
        <span className="block truncate text-xs text-muted-2">
          {showDay ? `${item.day === undefined ? "" : formatDay(item.day, { weekday: "short", month: "short", day: "numeric" })} · ` : ""}
          {k.label}{item.repeat ? ` · ${item.repeat}` : ""}{item.note ? ` · ${item.note}` : ""}
        </span>
      </span>
      <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: k.bg, color: k.color }}>{k.label}</span>
      {!derived && (
        <button
          type="button"
          title="Delete"
          disabled={pending}
          onClick={() => run(() => (item.kind === "TASK" ? removeTask(item.id) : removeCalendarEvent(item.id)))}
          className="h-[26px] w-[26px] shrink-0 cursor-pointer rounded-lg border border-line bg-white text-[13px] text-muted-3 hover:border-soft hover:text-[#A8452E]"
        >
          ×
        </button>
      )}
    </div>
  );
}
