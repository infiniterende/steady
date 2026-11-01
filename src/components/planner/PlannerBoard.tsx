"use client";

import { useEffect, useMemo, useOptimistic, useState, useTransition } from "react";
import type { PlannerKind, Priority } from "@prisma/client";
import { removePlannerItem, setPlannerDone, updatePlannerItem, addPlannerItem, type PlannerInput } from "@/app/app/actions";
import { addDays, formatDay } from "@/lib/dates";
import { KIND_META, TINTS, partOfDay, remindLabel, resolveTint } from "@/lib/planner";
import { AlertSettings, DayEditor, InlineTaskAdd, ItemForm, QuickAdd } from "@/components/planner/PlannerParts";
import { BellIcon } from "@/components/planner/BellIcon";

export type PlannerRow = {
  id: string;
  day: string;
  kind: PlannerKind;
  title: string;
  time: string | null;
  minuteOfDay: number | null;
  note: string | null;
  place: string | null;
  priority: Priority;
  done: boolean;
  remindMin: number | null;
};

export type DayInfo = { day: string; label: string | null; note: string | null; tint: string | null };

const VIEW_KEY = "steady.planner.view";
const AMBER = "#B45309";

type Ctx = {
  toggle: (i: PlannerRow) => void;
  today: string;
};

export function PlannerBoard({
  weekStart,
  today,
  items,
  overdue,
  dayInfo,
  header,
}: {
  weekStart: string;
  today: string;
  items: PlannerRow[];
  overdue: PlannerRow[];
  dayInfo: DayInfo[];
  header: React.ReactNode;
}) {
  const [list, mutate] = useOptimistic(
    { items, overdue },
    (s, a: { id: string; done: boolean }) => ({
      items: s.items.map((i) => (i.id === a.id ? { ...i, done: a.done } : i)),
      overdue: s.overdue.map((i) => (i.id === a.id ? { ...i, done: a.done } : i)),
    }),
  );
  const [, startTransition] = useTransition();
  const [view, setView] = useState<"boxed" | "list">("boxed");

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        if (localStorage.getItem(VIEW_KEY) === "list") setView("list");
      } catch {}
    }, 0);
    return () => clearTimeout(t);
  }, []);
  const pick = (v: "boxed" | "list") => {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {}
  };

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const byDay = useMemo(() => {
    const m = new Map<string, PlannerRow[]>();
    for (const i of list.items) m.set(i.day, [...(m.get(i.day) ?? []), i]);
    return m;
  }, [list.items]);
  const infoByDay = useMemo(() => new Map(dayInfo.map((d) => [d.day, d])), [dayInfo]);

  const ctx: Ctx = {
    today,
    toggle: (i) =>
      startTransition(async () => {
        mutate({ id: i.id, done: !i.done });
        await setPlannerDone(i.id, !i.done);
      }),
  };

  const seg = (on: boolean) => ({
    background: on ? "#fff" : "transparent",
    color: on ? "#40453A" : "#8A8378",
    boxShadow: on ? "0 1px 3px rgba(64,69,58,0.14)" : "none",
  });

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-[#E8DDD3] px-5 py-4 md:px-7">
        {header}
        <div className="ml-auto flex rounded-full bg-[#F4EDE6] p-1" role="group" aria-label="Layout">
          {(["boxed", "list"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => pick(v)}
              className="cursor-pointer rounded-full border-0 px-4 py-2 text-xs font-bold uppercase tracking-[0.08em]"
              style={seg(view === v)}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4 px-5 py-5 md:px-7">
        <div className="flex flex-col gap-3 rounded-2xl border border-[#E8DDD3] bg-[#FFFFFF] p-4">
          <QuickAdd today={today} />
          <AlertSettings />
        </div>

        {list.overdue.length > 0 && (
          <section className="rounded-2xl border border-[#EBCFC6] bg-[#FDF3F0] p-5">
            <h2 className="mb-2 text-[13px] font-bold uppercase tracking-[0.04em]" style={{ color: "#A8452E" }}>
              Overdue · {list.overdue.filter((i) => !i.done).length}
            </h2>
            <div className="flex flex-col gap-1">
              {list.overdue.map((i) => (
                <ItemRow key={i.id} item={i} showDate {...ctx} />
              ))}
            </div>
          </section>
        )}

        <div className={view === "boxed" ? "grid grid-cols-1 gap-4 xl:grid-cols-2" : "mx-auto flex w-full max-w-[760px] flex-col gap-4"}>
          {days.map((d) => (
            <DayCard key={d} day={d} items={byDay.get(d) ?? []} info={infoByDay.get(d) ?? null} {...ctx} />
          ))}
        </div>
      </div>
    </>
  );
}

function DayCard({ day, items, info, today, toggle }: { day: string; items: PlannerRow[]; info: DayInfo | null; today: string; toggle: Ctx["toggle"] }) {
  const [mode, setMode] = useState<"none" | "task" | "reminder" | "day">("none");
  const tint = resolveTint(info?.tint);
  const accent = tint ? TINTS[tint].accent : "#6B645C";
  const isToday = day === today;
  const [dayNum, weekday] = [Number(day.slice(8)), formatDay(day, { weekday: "long" })];

  const plain = items.filter((i) => i.minuteOfDay === null && i.kind !== "REMINDER");
  const timed = items.filter((i) => i.minuteOfDay !== null || i.kind === "REMINDER");
  const groups = (["Morning", "Afternoon", "Evening"] as const)
    .map((g) => ({ g, rows: timed.filter((i) => (i.minuteOfDay === null ? "Morning" : partOfDay(i.minuteOfDay)) === g) }))
    .filter((x) => x.rows.length);

  const noteLines = (info?.note ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
  const centered = !!tint;
  const open = items.filter((i) => !i.done).length;

  const link = "flex cursor-pointer items-center gap-2 border-0 bg-transparent px-0 py-1.5 text-left text-[13.5px]";

  return (
    <section
      className="rounded-[20px] border p-5"
      style={{
        background: tint ? TINTS[tint].bg : "#FFFFFF",
        borderColor: isToday ? "#8A553A" : "#E8DDD3",
        boxShadow: isToday ? "0 0 0 1px #8A553A" : "none",
        minHeight: 260,
      }}
      aria-label={`${weekday} ${dayNum}`}
    >
      <header className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="text-[15px] font-bold uppercase tracking-[0.02em]" style={{ color: isToday ? "#8A553A" : "#6B645C" }}>
          {dayNum} {weekday}
        </h2>
        {info?.label && <span className="rounded-full bg-[#EEEFE6] px-3 py-1 text-[13px] text-[#585D48]">{info.label}</span>}
        {isToday && <span className="rounded-full bg-[#8A553A] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-white">Today</span>}
        <span className="ml-auto hidden text-xs text-[#9A9387] sm:inline">{items.length ? `${open} open` : ""}</span>
        <button
          type="button"
          aria-label={`Edit ${weekday} label, note and color`}
          aria-expanded={mode === "day"}
          onClick={() => setMode(mode === "day" ? "none" : "day")}
          className="ml-auto h-8 w-8 cursor-pointer rounded-full border-0 bg-transparent text-xl leading-none tracking-[-0.1em] text-[#A29B8E] hover:bg-black/5 sm:ml-0"
        >
          •••
        </button>
      </header>

      {mode === "day" && (
        <DayEditor day={day} initial={{ label: info?.label ?? "", note: info?.note ?? "", tint: tint ?? "" }} onDone={() => setMode("none")} />
      )}

      {noteLines.length > 0 && mode !== "day" && (
        <button
          type="button"
          onClick={() => setMode("day")}
          className="mb-3 block w-full cursor-pointer border-0 bg-transparent p-0"
          style={{ textAlign: centered ? "center" : "left" }}
          title="Edit note"
        >
          <span className="block text-[20px] italic leading-tight" style={{ color: tint ? accent : "#7A7368", fontWeight: 300 }}>
            {noteLines[0]}
          </span>
          {noteLines.slice(1).map((l, i) => (
            <span key={i} className="mt-1 block text-[13.5px] text-[#6B645C]">
              {l}
            </span>
          ))}
        </button>
      )}

      <div className="flex flex-col gap-0.5">
        {plain.map((i) => (
          <ItemRow key={i.id} item={i} today={today} toggle={toggle} />
        ))}

        {groups.map(({ g, rows }) => (
          <div key={g} className="mt-2">
            <div className="mb-1 text-[12px] uppercase tracking-[0.1em] text-[#8A8378]">{g}</div>
            <div className="flex flex-col gap-2">
              {rows.map((i) => (
                <ItemRow key={i.id} item={i} today={today} toggle={toggle} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-col">
        {mode === "task" ? (
          <InlineTaskAdd day={day} onDone={() => setMode("none")} />
        ) : (
          <button type="button" onClick={() => setMode("task")} className={link} style={{ color: "#8A8378" }}>
            <span className="w-[22px] text-center text-xl leading-none">+</span> Add task…
          </button>
        )}
        <button type="button" onClick={() => setMode("day")} className={`${link} text-[13px]`} style={{ color: "#8A8378" }}>
          <span className="w-[22px] text-center">+</span> {noteLines.length ? "Edit note…" : "Add note…"}
        </button>
        {mode === "reminder" ? (
          <ItemForm
            initial={{ title: "", date: day, kind: "REMINDER", time: "", note: "", place: "", priority: "MEDIUM", remindMin: 0 }}
            submitLabel="Add reminder"
            onDone={() => setMode("none")}
            onSubmit={(v) => addPlannerItem(v)}
          />
        ) : (
          <button type="button" onClick={() => setMode("reminder")} className={link} style={{ color: AMBER }}>
            <BellIcon size={20} /> Add reminder
          </button>
        )}
      </div>
    </section>
  );
}

function ItemRow({ item: i, showDate, toggle, today }: { item: PlannerRow; showDate?: boolean; toggle: Ctx["toggle"]; today: string }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const meta = KIND_META[i.kind];

  if (editing)
    return (
      <ItemForm
        initial={{ title: i.title, date: i.day, kind: i.kind, time: i.time ?? "", note: i.note ?? "", place: i.place ?? "", priority: i.priority, remindMin: i.remindMin }}
        submitLabel="Save"
        onDone={() => setEditing(false)}
        onSubmit={(v: PlannerInput) => updatePlannerItem(i.id, v)}
      />
    );

  const actions = (
    <span className="flex shrink-0 gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
      <button type="button" title="Edit" aria-label={`Edit ${i.title}`} onClick={() => setEditing(true)} className="h-7 w-7 cursor-pointer rounded-lg border-0 bg-transparent text-[12px] text-[#9A9387] hover:bg-black/5 hover:text-[#40453A]">
        ✎
      </button>
      <button
        type="button"
        title="Delete"
        aria-label={`Delete ${i.title}`}
        disabled={pending}
        onClick={() => startTransition(() => removePlannerItem(i.id).then(() => undefined))}
        className="h-7 w-7 cursor-pointer rounded-lg border-0 bg-transparent text-[13.5px] text-[#9A9387] hover:bg-black/5 hover:text-danger"
      >
        ×
      </button>
    </span>
  );

  if (i.kind === "REMINDER")
    return (
      <div
        className="group flex items-start gap-3 rounded-r-lg border-l-4 px-4 py-3"
        style={{ background: "#FFF6D9", borderColor: "#F5C518", opacity: i.done ? 0.55 : 1 }}
      >
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-bold" style={{ color: "#8A3B00", textDecoration: i.done ? "line-through" : undefined }}>
            Reminder
          </div>
          <div className="text-[14px] leading-snug" style={{ color: AMBER }}>
            {i.title}
          </div>
          {(i.time || showDate) && (
            <div className="mt-1 text-[14px]" style={{ color: "#C2760C" }}>
              {showDate && <span style={{ color: i.day < today ? "#A8452E" : undefined }}>{formatDay(i.day)} </span>}
              {i.time?.toLowerCase()}
              {i.remindMin !== null && i.remindMin > 0 && <span className="inline-flex items-center gap-1 text-sm"> · <BellIcon size={13} /> {remindLabel(i.remindMin).toLowerCase()}</span>}
            </div>
          )}
          {i.place && <div className="text-[14px]" style={{ color: "#C2760C" }}>@{i.place}</div>}
          {i.note && <div className="mt-0.5 text-sm" style={{ color: AMBER }}>{i.note}</div>}
        </div>
        {actions}
        <button
          type="button"
          aria-pressed={i.done}
          title={i.done ? "Mark not done" : "Mark done"}
          onClick={() => toggle(i)}
          className="grid h-[24px] w-[24px] shrink-0 cursor-pointer place-items-center rounded-full p-0 text-[11px] leading-none text-white"
          style={{ border: `2px solid ${i.done ? "#B45309" : "#E0A32E"}`, background: i.done ? "#B45309" : "transparent" }}
        >
          {i.done ? "✓" : ""}
        </button>
      </div>
    );

  const sub: React.ReactNode[] = [
    showDate ? formatDay(i.day) : null,
    i.time,
    i.kind !== "TASK" ? meta.label : null,
    i.remindMin !== null ? (
      <span key="bell" className="inline-flex items-center gap-1">
        <BellIcon size={12} /> {i.remindMin === 0 ? "at time" : remindLabel(i.remindMin).replace(" before", "")}
      </span>
    ) : null,
    i.place ? `@${i.place}` : null,
  ].filter(Boolean);

  return (
    <div className="group flex items-start gap-3 py-1.5" style={{ opacity: i.done ? 0.5 : 1 }}>
      <button
        type="button"
        aria-pressed={i.done}
        title={i.done ? "Mark not done" : "Mark done"}
        onClick={() => toggle(i)}
        className="mt-0.5 grid h-[24px] w-[24px] shrink-0 cursor-pointer place-items-center rounded-full bg-transparent p-0 text-[11px] leading-none text-white"
        style={{ border: `1.5px solid ${i.done ? "#6B705C" : i.priority === "HIGH" ? "#C0563E" : "#DDBEA9"}`, background: i.done ? "#6B705C" : "transparent" }}
      >
        {i.done ? "✓" : ""}
      </button>
      <div className="min-w-0 flex-1">
        <div className="text-[14px] leading-snug text-[#40453A]" style={i.done ? { textDecoration: "line-through" } : undefined}>
          {i.title}
        </div>
        {sub.length > 0 && (
          <div className="text-[12px]" style={{ color: showDate && i.day < today ? "#A8452E" : "#8A8378" }}>
            {sub.map((x, n) => (
              <span key={n}>
                {n > 0 && " · "}
                {x}
              </span>
            ))}
          </div>
        )}
        {i.note && <div className="text-[12px] text-[#8A8378]">{i.note}</div>}
      </div>
      {actions}
    </div>
  );
}
