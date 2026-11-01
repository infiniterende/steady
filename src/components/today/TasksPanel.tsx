"use client";

import { useOptimistic, useState, useTransition } from "react";
import type { Domain, Priority } from "@prisma/client";
import { addTask, removeTask, setTop, toggleTask } from "@/app/app/actions";
import { CAT, CATEGORY_LABEL, DOMAINS, PRIORITY_STYLE } from "@/lib/domain";
import { CatIcon, CatTile, ErrorText, Ring, btnPrimary } from "@/components/app/ui";

export type TaskItem = { id: string; title: string; category: Domain; due: string; priority: Priority; done: boolean; top?: boolean };

type Filter = "All" | "Open" | "Done";
const PRIO_ORDER: Priority[] = ["HIGH", "MEDIUM", "LOW"];

export function TasksPanel({ tasks, day }: { tasks: TaskItem[]; day: string }) {
  const [filter, setFilter] = useState<Filter>("All");
  const [draft, setDraft] = useState("");
  const [cat, setCat] = useState<Domain>("FOCUS");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [list, mutate] = useOptimistic(
    tasks,
    (state: TaskItem[], action: { type: "toggle" | "remove" | "top"; id: string }) =>
      action.type === "toggle"
        ? state.map((t) => (t.id === action.id ? { ...t, done: !t.done } : t))
        : action.type === "top"
          ? state.map((t) => (t.id === action.id ? { ...t, top: !t.top } : t))
          : state.filter((t) => t.id !== action.id),
  );

  const done = list.filter((t) => t.done).length;
  const pct = list.length ? Math.round((done / list.length) * 100) : 0;
  const openHigh = list.filter((t) => !t.done && t.priority === "HIGH").length;
  const shown = list
    .filter((t) => (filter === "All" ? true : filter === "Done" ? t.done : !t.done))
    .sort((a, b) => Number(a.done) - Number(b.done) || PRIO_ORDER.indexOf(a.priority) - PRIO_ORDER.indexOf(b.priority));

  const submit = () => {
    const title = draft.trim();
    if (!title) return setError("Write the goal first.");
    if (title.length > 60) return setError("Keep it under 60 characters.");
    startTransition(async () => {
      const res = await addTask({ day, title, category: cat });
      if (!res.ok) return setError(res.error);
      setDraft("");
      setError("");
      if (filter === "Done") setFilter("All");
    });
  };

  return (
    <>
      <div className="mb-[18px] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <Ring pct={pct} size={52} inset={6}>
            <span className="font-mono text-[13px]">
              {done}/{list.length}
            </span>
          </Ring>
          <div>
            <h2 className="text-[19px] font-bold tracking-[-0.01em]">Today&apos;s goals</h2>
            <div className="mt-0.5 text-[13px] text-muted">
              {done} of {list.length} done · {openHigh ? `${openHigh} high priority open` : "all high priority done"}
            </div>
          </div>
        </div>
        <div className="flex rounded-[11px] bg-surface p-1">
          {(["All", "Open", "Done"] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className="cursor-pointer rounded-lg border-0 px-3.5 py-[7px] text-[13px] font-semibold"
              style={{
                color: filter === f ? "#40453A" : "oklch(0.5 0.014 80)",
                background: filter === f ? "#fff" : "transparent",
                boxShadow: filter === f ? "0 1px 3px rgba(64,69,58,0.12)" : "none",
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-[14px] border border-line bg-[#FAF6F2] p-2.5">
        <input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setError("");
          }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Add a goal for today"
          aria-label="New goal"
          className="min-w-0 flex-[1_1_200px] rounded-[10px] border border-line bg-white px-3 py-2.5 text-sm text-inherit outline-none focus:border-olive"
        />
        <div className="flex gap-1.5">
          {DOMAINS.map((d) => (
            <button
              key={d}
              type="button"
              title={CATEGORY_LABEL[d]}
              aria-pressed={cat === d}
              onClick={() => setCat(d)}
              className="grid h-[38px] w-[38px] cursor-pointer place-items-center rounded-[10px] p-0"
              style={{ background: CAT[d].bg, border: `2px solid ${cat === d ? CAT[d].stroke : "transparent"}` }}
            >
              <CatIcon domain={d} size={18} />
            </button>
          ))}
        </div>
        <button type="button" onClick={submit} disabled={pending} className={btnPrimary}>
          Add
        </button>
        {error && <ErrorText>{error}</ErrorText>}
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-2.5">
        {shown.map((t) => {
          const p = PRIORITY_STYLE[t.priority];
          return (
            <div
              key={t.id}
              className="flex items-center gap-3 rounded-[14px] border border-line p-3 transition-opacity"
              style={{ background: t.done ? "#FAF6F2" : "#fff", opacity: t.done ? 0.7 : 1 }}
            >
              <CatTile domain={t.category} size={42} />
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span
                  className="truncate text-sm font-semibold"
                  style={t.done ? { textDecoration: "line-through", color: "oklch(0.55 0.014 80)" } : undefined}
                >
                  {t.title}
                </span>
                <span className="flex items-center gap-2 text-xs text-muted">
                  <span className="whitespace-nowrap">
                    {CATEGORY_LABEL[t.category]} · {t.due}
                  </span>
                  <span
                    className="whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold"
                    style={{ background: p.bg, color: p.color }}
                  >
                    {p.label}
                  </span>
                </span>
              </span>
              <button
                type="button"
                title={t.top ? "Take off today's three" : "Make one of today's three"}
                aria-pressed={!!t.top}
                onClick={() =>
                  startTransition(async () => {
                    mutate({ type: "top", id: t.id });
                    const res = await setTop(t.id, !t.top);
                    if (!res.ok) setError(res.error);
                  })
                }
                className="h-[26px] w-[26px] shrink-0 cursor-pointer rounded-lg border-0 bg-transparent text-[17px] leading-none hover:bg-surface"
                style={{ color: t.top ? "#CB997E" : "#C9BDB0" }}
              >
                {t.top ? "★" : "☆"}
              </button>
              <button
                type="button"
                title="Mark done"
                aria-pressed={t.done}
                onClick={() =>
                  startTransition(async () => {
                    mutate({ type: "toggle", id: t.id });
                    await toggleTask(t.id);
                  })
                }
                className="grid h-[30px] w-[30px] shrink-0 cursor-pointer place-items-center rounded-full p-0"
                style={{ border: `2px solid ${t.done ? "#6B705C" : "#DDBEA9"}`, background: t.done ? "#6B705C" : "#fff" }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 22 22"
                  style={{ fill: "none", stroke: "#fff", strokeWidth: 2.4, strokeLinecap: "round", strokeLinejoin: "round", opacity: t.done ? 1 : 0 }}
                >
                  <path d="M5.5 11.5l3.5 3.5 7.5-8" />
                </svg>
              </button>
              <button
                type="button"
                title="Remove"
                onClick={() =>
                  startTransition(async () => {
                    mutate({ type: "remove", id: t.id });
                    await removeTask(t.id);
                  })
                }
                className="h-[26px] w-[26px] shrink-0 cursor-pointer rounded-lg border-0 bg-transparent text-[15px] text-muted-3 hover:bg-surface hover:text-danger"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
      {shown.length === 0 && (
        <div className="rounded-[14px] border border-dashed border-soft p-6 text-center text-[13px] text-muted">
          {filter === "Done" ? "Nothing checked off yet." : "All clear for today."}
        </div>
      )}
    </>
  );
}
