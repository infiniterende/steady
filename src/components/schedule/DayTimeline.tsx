"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { addBlock, removeBlock, toggleBlock } from "@/app/app/actions";
import type { CalendarItem } from "@/lib/data";
import { formatMinute } from "@/lib/dates";
import { CAT, DOMAIN_LABEL } from "@/lib/domain";
import { CatIcon, ErrorText, btnPrimary, btnSecondary, inputBase } from "@/components/app/ui";
import { KIND_STYLE } from "@/components/calendar/CalendarBoard";
import type { BlockItem } from "@/components/today/SchedulePanel";
import { BellIcon } from "@/components/planner/BellIcon";

const SLOT = 15; // minutes
const PHONE = "(max-width: 640px)";
const subscribePhone = (cb: () => void) => {
  const mq = window.matchMedia(PHONE);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const DURATIONS = [15, 30, 45, 60, 90, 120];

type Placed = { id: string; start: number; end: number; lane: number; lanes: number; kind: "block" | CalendarItem["kind"]; block?: BlockItem; item?: CalendarItem };

export function DayTimeline({ day, blocks, items, isToday, nowMinute }: { day: string; blocks: BlockItem[]; items: CalendarItem[]; isToday: boolean; nowMinute: number }) {
  const phone = useSyncExternalStore(subscribePhone, () => window.matchMedia(PHONE).matches, () => false);
  const SLOT_H = phone ? 32 : 16; // px per 15 minutes; taller on phones so slots are tappable
  const [fullDay, setFullDay] = useState(false);
  const [draft, setDraft] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [minutes, setMinutes] = useState(30);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  const startMin = fullDay ? 0 : 5 * 60;
  const endMin = fullDay ? 24 * 60 : 23 * 60;
  const slots = (endMin - startMin) / SLOT;
  const y = (m: number) => ((Math.max(startMin, Math.min(endMin, m)) - startMin) / SLOT) * SLOT_H;

  const timed = items.filter((i) => i.minuteOfDay !== null);
  const allDay = items.filter((i) => i.minuteOfDay === null);

  // Lay overlapping entries out side by side.
  const placed = useMemo<Placed[]>(() => {
    const raw: Placed[] = [
      ...blocks.map((b) => ({ id: `b:${b.id}`, start: b.minuteOfDay, end: b.minuteOfDay + Math.max(SLOT, b.minutes), lane: 0, lanes: 1, kind: "block" as const, block: b })),
      ...timed.map((i) => ({ id: `i:${i.id}`, start: i.minuteOfDay!, end: i.minuteOfDay! + SLOT, lane: 0, lanes: 1, kind: i.kind, item: i })),
    ].sort((a, b) => a.start - b.start || b.end - a.end);
    let group: Placed[] = [];
    let groupEnd = -1;
    const flush = () => {
      const laneEnds: number[] = [];
      for (const p of group) {
        let lane = laneEnds.findIndex((e) => e <= p.start);
        if (lane === -1) { lane = laneEnds.length; laneEnds.push(0); }
        laneEnds[lane] = p.end;
        p.lane = lane;
      }
      for (const p of group) p.lanes = laneEnds.length;
      group = [];
    };
    for (const p of raw) {
      if (group.length && p.start >= groupEnd) flush();
      group.push(p);
      groupEnd = Math.max(groupEnd, p.end);
    }
    flush();
    return raw;
  }, [blocks, timed]);

  // Scroll to "now" (today) or the first entry.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const target = isToday ? nowMinute : placed[0]?.start ?? 8 * 60;
    el.scrollTop = Math.max(0, y(target) - 120);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, fullDay, phone]);

  const occupied = (m: number) => placed.some((p) => p.kind === "block" && m >= p.start && m < p.end);

  const commit = () => {
    if (draft === null) return;
    if (!title.trim()) return setError("Give the block a name.");
    startTransition(async () => {
      const res = await addBlock({ day, title, time: formatMinute(draft), minutes });
      if (!res.ok) return setError(res.error);
      setDraft(null);
      setTitle("");
      setError("");
    });
  };

  const run = (fn: () => Promise<unknown>) => startTransition(() => fn().then(() => undefined));

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[19px] font-bold">Timeblocks</h2>
          <p className="text-[13px] text-muted-2">15-minute slots · tap an empty slot to add a block</p>
        </div>
        <button type="button" onClick={() => setFullDay((v) => !v)} className={btnSecondary}>
          {fullDay ? "5 AM – 11 PM" : "Show full day"}
        </button>
      </div>

      {allDay.length > 0 && (
        <div className="mb-2 flex flex-wrap items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2">
          <span className="mr-1 font-mono text-[11px] text-muted">All day</span>
          {allDay.map((i) => (
            <span key={i.id} className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: KIND_STYLE[i.kind].bg, color: KIND_STYLE[i.kind].color, textDecoration: i.done ? "line-through" : undefined }}>
              {i.title}
            </span>
          ))}
        </div>
      )}

      <div ref={scrollRef} className="relative max-h-[640px] overflow-y-auto rounded-[14px] border border-line bg-white">
        <div className="relative flex" style={{ height: slots * SLOT_H }}>
          {/* hour gutter */}
          <div className="relative w-[52px] shrink-0 sm:w-[64px] border-r border-line">
            {Array.from({ length: slots / 4 + 1 }, (_, h) => (
              <span key={h} className="absolute right-2 -translate-y-1/2 font-mono text-[11px] text-muted-3" style={{ top: h * 4 * SLOT_H }}>
                {h * 4 * SLOT_H >= slots * SLOT_H ? "" : formatMinute(startMin + h * 60).replace(":00", "")}
              </span>
            ))}
          </div>

          {/* slot grid */}
          <div className="relative flex-1">
            {Array.from({ length: slots }, (_, i) => {
              const m = startMin + i * SLOT;
              const hour = i % 4 === 0;
              const busy = occupied(m);
              return (
                <button
                  key={m}
                  type="button"
                  aria-label={`Add block at ${formatMinute(m)}`}
                  disabled={busy || pending}
                  onClick={() => { setDraft(m); setTitle(""); setError(""); }}
                  className="absolute left-0 right-0 cursor-pointer border-0 bg-transparent p-0 text-left hover:bg-surface/70 disabled:cursor-default disabled:hover:bg-transparent"
                  style={{ top: i * SLOT_H, height: SLOT_H, borderTop: `1px solid ${hour ? "#E8DDD3" : "#F4EDE6"}` }}
                />
              );
            })}

            {/* now line */}
            {isToday && nowMinute >= startMin && nowMinute <= endMin && (
              <div className="pointer-events-none absolute left-0 right-0 z-20 flex items-center" style={{ top: y(nowMinute) }}>
                <span className="-ml-1 h-2.5 w-2.5 rounded-full bg-clay" />
                <span className="h-px flex-1 bg-clay" />
                <span className="mr-1 rounded-full bg-clay px-1.5 font-mono text-[10px] text-white">{formatMinute(nowMinute)}</span>
              </div>
            )}

            {/* entries */}
            {placed.map((p) => {
              const top = y(p.start);
              const height = Math.max(SLOT_H - 2, y(p.end) - top - 2);
              const width = `calc(${100 / p.lanes}% - 6px)`;
              const left = `calc(${(100 / p.lanes) * p.lane}% + 3px)`;
              if (p.kind === "block" && p.block) {
                const b = p.block;
                const c = CAT[b.domain];
                const tall = height >= SLOT_H * 2;
                return (
                  <div key={p.id} className="absolute z-10 flex gap-2 overflow-hidden rounded-[10px] border px-2 py-1" style={{ top: top + 1, height, width, left, background: c.bg, borderColor: b.done ? "#B7B7A4" : "transparent", opacity: b.done ? 0.65 : 1 }}>
                    <button
                      type="button"
                      aria-pressed={b.done}
                      title={b.done ? "Mark not done" : "Mark done"}
                      disabled={pending}
                      onClick={() => run(() => toggleBlock(b.id))}
                      className="mt-0.5 grid h-[18px] w-[18px] shrink-0 cursor-pointer place-items-center rounded-full text-[10px] text-white"
                      style={{ border: `2px solid ${b.done ? "#6B705C" : "#DDBEA9"}`, background: b.done ? "#6B705C" : "#fff" }}
                    >
                      {b.done ? "✓" : ""}
                    </button>
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="flex items-center gap-1.5 truncate text-[12px] font-semibold" style={{ textDecoration: b.done ? "line-through" : undefined }}>
                        <CatIcon domain={b.domain} size={13} />
                        {b.title}
                      </span>
                      {tall && (
                        <span className="block truncate text-[11px]" style={{ color: c.stroke }}>
                          {formatMinute(p.start)} – {formatMinute(p.start + b.minutes)} · {DOMAIN_LABEL[b.domain]}
                        </span>
                      )}
                    </span>
                    <button type="button" title="Remove block" disabled={pending} onClick={() => run(() => removeBlock(b.id))} className="h-5 w-5 shrink-0 cursor-pointer rounded-md border-0 bg-transparent text-[13px] text-muted-3 hover:text-[#A8452E]">×</button>
                  </div>
                );
              }
              const i = p.item!;
              const k = KIND_STYLE[i.kind];
              if (i.kind === "AUTO_REMINDER") {
                return (
                  <div key={p.id} className="pointer-events-none absolute z-10 flex items-center gap-1 overflow-hidden rounded-[6px] px-1.5 text-[10px] font-semibold" style={{ top: top + 2, height: height - 2, width, left, background: k.bg, color: k.color, borderLeft: `2px solid ${k.color}` }} title={`Heads-up · ${i.title} ${i.note}`}>
                    <BellIcon size={12} />
                    <span className="truncate">{i.title} · {i.note}</span>
                  </div>
                );
              }
              return (
                <div key={p.id} className="absolute z-10 flex items-center gap-1.5 overflow-hidden rounded-[8px] px-2 text-[11px] font-semibold" style={{ top: top + 1, height, width, left, background: k.bg, color: k.color, textDecoration: i.done ? "line-through" : undefined }} title={`${k.label} · ${i.title}`}>
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: k.color }} />
                  <span className="truncate">{i.title}</span>
                </div>
              );
            })}

            {/* draft form */}
            {draft !== null && (
              <div className="absolute left-2 right-2 z-30 flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-soft bg-white p-2.5 shadow-[0_10px_30px_rgba(64,69,58,0.14)]" style={{ top: y(draft) + 2 }}>
                <span className="font-mono text-xs text-muted">{formatMinute(draft)}</span>
                <input autoFocus value={title} onChange={(e) => { setTitle(e.target.value); setError(""); }} onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setDraft(null); }} placeholder="What will you do?" aria-label="Block name" className={`${inputBase} flex-[1_1_160px] py-1.5`} />
                <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} aria-label="Length" className={`${inputBase} py-1.5`}>
                  {DURATIONS.map((d) => <option key={d} value={d}>{d} min</option>)}
                </select>
                <button type="button" onClick={commit} disabled={pending} className={`${btnPrimary} py-1.5`}>Add</button>
                <button type="button" onClick={() => setDraft(null)} className={`${btnSecondary} py-1.5`}>Cancel</button>
                {error && <ErrorText>{error}</ErrorText>}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
