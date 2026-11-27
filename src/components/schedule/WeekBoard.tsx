"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toggleBlock, toggleCalendarEvent, toggleTask } from "@/app/app/actions";
import type { CalendarItem } from "@/lib/data";
import { DAY_NAMES, formatMinute } from "@/lib/dates";
import { CAT, CATEGORY_LABEL } from "@/lib/domain";
import { KIND_STYLE } from "@/components/calendar/CalendarBoard";
import type { BlockItem } from "@/components/today/SchedulePanel";

type Card = {
  key: string;
  label: string;
  accent: string;
  bg: string;
  title: string;
  minute: number | null;
  minutes: number | null;
  done: boolean | null; // null = nothing to check off (reminders)
  toggle?: () => Promise<unknown>;
};

const OLIVE = "#6B705C";
const CLAY = "#A8452E";

const duration = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}` : `${m}m`);

function cardsFor(blocks: BlockItem[], items: CalendarItem[]): Card[] {
  const out: Card[] = [
    ...blocks.map((b) => ({
      key: `b:${b.id}`,
      label: CATEGORY_LABEL[b.domain],
      accent: CAT[b.domain].stroke,
      bg: CAT[b.domain].bg,
      title: b.title,
      minute: b.minuteOfDay,
      minutes: b.minutes,
      done: b.done,
      toggle: () => toggleBlock(b.id),
    })),
    ...items
      .filter((i) => i.kind === "EVENT" || i.kind === "TASK" || i.kind === "REMINDER")
      .map((i) => ({
        key: `i:${i.id}`,
        label: KIND_STYLE[i.kind].label,
        accent: KIND_STYLE[i.kind].color,
        bg: KIND_STYLE[i.kind].bg,
        title: i.title,
        minute: i.minuteOfDay,
        minutes: null,
        done: i.done,
        toggle: i.kind === "TASK" ? () => toggleTask(i.id) : i.kind === "EVENT" ? () => toggleCalendarEvent(i.id) : undefined,
      })),
  ];
  // Timed entries in order, untimed ones last.
  return out.sort((a, b) => (a.minute ?? 24 * 60) - (b.minute ?? 24 * 60));
}

export function WeekBoard({
  days,
  blocksByDay,
  itemsByDay,
  today,
  selected,
  nowMinute,
}: {
  days: string[];
  blocksByDay: BlockItem[][];
  itemsByDay: CalendarItem[][];
  today: string;
  selected: string;
  nowMinute: number;
}) {
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const [pending, startTransition] = useTransition();

  const toggle = (c: Card) => {
    if (!c.toggle) return;
    setFlipped((f) => ({ ...f, [c.key]: !f[c.key] }));
    startTransition(async () => {
      await c.toggle!();
      setFlipped((f) => {
        const rest = { ...f };
        delete rest[c.key];
        return rest;
      });
    });
  };

  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]">
      <div className="grid snap-x grid-cols-[repeat(7,minmax(140px,1fr))] gap-2.5">
        {days.map((d, i) => {
          const cards = cardsFor(blocksByDay[i], itemsByDay[i]);
          const total = blocksByDay[i].reduce((n, b) => n + b.minutes, 0);
          const isToday = d === today;
          const isSelected = d === selected;
          const doneOf = (c: Card) => (c.done === null ? null : flipped[c.key] ? !c.done : c.done);
          // "Next" marks the first open, timed entry still ahead today.
          const nextKey = isToday ? cards.find((c) => doneOf(c) === false && c.minute !== null && c.minute >= nowMinute)?.key : undefined;
          return (
            <section
              key={d}
              className="flex min-h-[360px] snap-start flex-col gap-2.5 rounded-[18px] border bg-white p-2.5"
              style={{ borderColor: isSelected ? "#B7B7A4" : "#EDE5DC" }}
            >
              <Link
                href={`/app/schedule?d=${d}`}
                aria-current={isSelected ? "date" : undefined}
                className="block rounded-[12px] px-3 py-2.5 text-inherit hover:text-inherit"
                style={{ background: isToday ? "#F9E4DC" : "#F4EDE6", color: isToday ? "#A5523B" : "#40453A" }}
              >
                <span className="flex items-baseline justify-between">
                  <span className="text-[15px] font-semibold">{DAY_NAMES[i]}</span>
                  <span className="text-[14px]">{Number(d.slice(8, 10))}</span>
                </span>
                <span className="mt-0.5 block text-[12px]" style={{ color: isToday ? "#A5523B" : "#8A8473" }}>
                  {total ? duration(total) : "Nothing planned"}
                </span>
              </Link>

              {cards.map((c) => {
                const done = doneOf(c);
                return (
                  <div key={c.key} className="flex flex-col gap-1.5 rounded-[12px] px-3 py-2.5" style={{ background: c.bg }}>
                    <div className="flex items-center gap-2">
                      <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: c.accent }} />
                      <span className="min-w-0 flex-1 truncate text-[11px] font-bold uppercase tracking-[0.06em]" style={{ color: c.accent }}>
                        {c.label}
                      </span>
                      {done !== null && (
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={done}
                          aria-label={`${done ? "Mark not done" : "Mark done"}: ${c.title}`}
                          disabled={pending || !c.toggle}
                          onClick={() => toggle(c)}
                          className="grid h-[22px] w-[22px] shrink-0 cursor-pointer place-items-center rounded-[6px] border text-white disabled:cursor-default"
                          style={{ background: done ? OLIVE : "#fff", borderColor: done ? OLIVE : "#D9CFC4" }}
                        >
                          {done && (
                            <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden style={{ fill: "none", stroke: "currentColor", strokeWidth: 3, strokeLinecap: "round", strokeLinejoin: "round" }}>
                              <path d="M5 12.5l4.5 4.5L19 7.5" />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                    <div className="text-[13px] font-semibold leading-snug text-[#40453A]" style={{ textDecoration: done ? "line-through" : undefined, opacity: done ? 0.7 : 1 }}>
                      {c.title}
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[12px] text-[#6B645C]">
                      <span className="whitespace-nowrap">
                        {c.minute !== null ? formatMinute(c.minute) : "Any time"}
                        {c.minutes ? ` · ${duration(c.minutes)}` : ""}
                      </span>
                      {done ? (
                        <span className="font-semibold" style={{ color: OLIVE }}>
                          Done
                        </span>
                      ) : c.key === nextKey ? (
                        <span className="font-semibold" style={{ color: CLAY }}>
                          Next
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}

              {!cards.length && <p className="px-1.5 text-xs text-muted-3">A free day.</p>}
            </section>
          );
        })}
      </div>
    </div>
  );
}
