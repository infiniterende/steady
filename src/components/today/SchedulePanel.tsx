"use client";

import { useOptimistic, useState, useTransition } from "react";
import type { Domain } from "@prisma/client";
import { addBlock, removeBlock, toggleBlock } from "@/app/app/actions";
import { DOMAIN_LABEL } from "@/lib/domain";
import { CatTile, ErrorText, inputBase, btnPrimary, btnSecondary } from "@/components/app/ui";

export type BlockItem = {
  id: string;
  time: string;
  minuteOfDay: number;
  domain: Domain;
  minutes: number;
  title: string;
  note: string | null;
  done: boolean;
};

export function SchedulePanel({ blocks, day, title = "Schedule", compact = false }: { blocks: BlockItem[]; day: string; title?: string; compact?: boolean }) {
  const [asc, setAsc] = useState(true);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [time, setTime] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [list, mutate] = useOptimistic(
    blocks,
    (state: BlockItem[], action: { type: "toggle" | "remove"; id: string }) =>
      action.type === "toggle"
        ? state.map((b) => (b.id === action.id ? { ...b, done: !b.done } : b))
        : state.filter((b) => b.id !== action.id),
  );

  const sorted = [...list].sort((a, b) => (asc ? a.minuteOfDay - b.minuteOfDay : b.minuteOfDay - a.minuteOfDay));

  const commit = () => {
    if (!name.trim()) return setError("Give the block a name.");
    if (!/\d/.test(time)) return setError("Add a time, like 7:00 AM.");
    startTransition(async () => {
      const res = await addBlock({ day, title: name, time });
      if (!res.ok) return setError(res.error);
      setAdding(false);
      setName("");
      setTime("");
      setError("");
    });
  };

  return (
    <>
      <div className="mb-[18px] flex items-center justify-between gap-4">
        <h2 className="text-[19px] font-bold tracking-[-0.01em]">{title}</h2>
        <div className="flex items-center gap-2">
          {!compact && (
            <button type="button" onClick={() => setAsc((v) => !v)} className={btnSecondary}>
              {asc ? "Earliest first" : "Latest first"}
            </button>
          )}
          <button type="button" onClick={() => setAdding(true)} className={btnPrimary}>
            Add block
          </button>
        </div>
      </div>

      {adding && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-soft bg-surface p-3">
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            placeholder="What habit?"
            aria-label="Block name"
            className={`${inputBase} flex-[1_1_180px]`}
          />
          <input
            value={time}
            onChange={(e) => {
              setTime(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && commit()}
            placeholder="7:00 AM"
            aria-label="Block time"
            className={`${inputBase} w-[110px]`}
          />
          <button type="button" onClick={commit} disabled={pending} className={btnPrimary}>
            Save
          </button>
          <button
            type="button"
            onClick={() => {
              setAdding(false);
              setName("");
              setTime("");
              setError("");
            }}
            className={btnSecondary}
          >
            Cancel
          </button>
          {error && <ErrorText>{error}</ErrorText>}
        </div>
      )}

      {sorted.length === 0 && (
        <div className="mb-4 rounded-[14px] border border-dashed border-soft p-6 text-center text-[13px] text-muted">
          No blocks on this day. Add one, or create habits to fill your days automatically.
        </div>
      )}

      {compact ? (
        <div className="flex flex-col">
          {sorted.map((b) => (
            <div key={b.id} className="flex items-center gap-3.5 border-b border-line py-3.5">
              <span className="w-[62px] shrink-0 font-mono text-xs text-muted-3">{b.time}</span>
              <button
                type="button"
                aria-pressed={b.done}
                title={b.done ? "Mark not done" : "Mark done"}
                onClick={() =>
                  startTransition(async () => {
                    mutate({ type: "toggle", id: b.id });
                    await toggleBlock(b.id);
                  })
                }
                className="grid h-[26px] w-[26px] shrink-0 cursor-pointer place-items-center rounded-full text-[13px] leading-none text-white hover:border-sage"
                style={{ border: `2px solid ${b.done ? "#6B705C" : "#DDBEA9"}`, background: b.done ? "#6B705C" : "#fff" }}
              >
                {b.done ? "✓" : ""}
              </button>
              <span className="min-w-0 flex-1">
                <span
                  className="block text-[15px] font-semibold"
                  style={b.done ? { textDecoration: "line-through", color: "oklch(0.5 0.014 80)" } : undefined}
                >
                  {b.title}
                </span>
                <span className="block text-xs text-muted-2">
                  {DOMAIN_LABEL[b.domain]} · {b.minutes} min
                </span>
              </span>
              <span
                className="rounded-full px-[9px] py-1 text-[11px] font-semibold text-[#4A4F3E]"
                style={{ background: b.done ? "#E8DDD3" : "#F4EDE6" }}
              >
                {b.done ? "Done" : "Due"}
              </span>
              <button
                type="button"
                title="Remove"
                onClick={() =>
                  startTransition(async () => {
                    mutate({ type: "remove", id: b.id });
                    await removeBlock(b.id);
                  })
                }
                className="h-[26px] w-[26px] cursor-pointer rounded-lg border border-line bg-white text-[13px] text-muted-3 hover:border-[oklch(0.85_0.06_25)] hover:text-[oklch(0.55_0.17_25)]"
              >
                ×
              </button>
            </div>
          ))}
          <div className="h-3.5" />
        </div>
      ) : (
      <div className="flex flex-col">
        {sorted.map((b) => (
          <div key={b.id} className="flex items-stretch gap-4 py-1">
            <div className="w-[62px] shrink-0 pt-3.5 font-mono text-xs text-muted">{b.time}</div>
            <div className="flex shrink-0 flex-col items-center">
              <button
                type="button"
                aria-pressed={b.done}
                title={b.done ? "Mark not done" : "Mark done"}
                onClick={() =>
                  startTransition(async () => {
                    mutate({ type: "toggle", id: b.id });
                    await toggleBlock(b.id);
                  })
                }
                className="grid h-[26px] w-[26px] cursor-pointer place-items-center rounded-full text-[13px] leading-none text-white hover:border-sage"
                style={{ border: `2px solid ${b.done ? "#6B705C" : "#DDBEA9"}`, background: b.done ? "#6B705C" : "#fff" }}
              >
                {b.done ? "✓" : ""}
              </button>
              <div className="w-0.5 flex-1 rounded-sm bg-line" />
            </div>
            <div className="min-w-0 flex-1 border-b border-line px-3.5 pb-4 pt-3">
              <div className="mb-1.5 flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-muted-3">
                <span>{DOMAIN_LABEL[b.domain]}</span>
                <span className="h-[3px] w-[3px] rounded-full bg-soft" />
                <span>{b.minutes} min</span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <CatTile domain={b.domain} dim={b.done} />
                  <div className="min-w-0">
                    <div
                      className="text-[15px] font-semibold"
                      style={b.done ? { textDecoration: "line-through", color: "oklch(0.5 0.014 80)" } : undefined}
                    >
                      {b.title}
                    </div>
                    {b.note && <div className="mt-0.5 text-[13px] text-muted-2">{b.note}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="rounded-full px-[9px] py-1 text-[11px] font-semibold text-[#4A4F3E]"
                    style={{ background: b.done ? "#E8DDD3" : "#F4EDE6" }}
                  >
                    {b.done ? "Done" : "Due"}
                  </span>
                  <button
                    type="button"
                    title="Remove"
                    onClick={() =>
                      startTransition(async () => {
                        mutate({ type: "remove", id: b.id });
                        await removeBlock(b.id);
                      })
                    }
                    className="h-[26px] w-[26px] cursor-pointer rounded-lg border border-line bg-white text-[13px] text-muted-3 hover:border-[oklch(0.85_0.06_25)] hover:text-[oklch(0.55_0.17_25)]"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      )}
    </>
  );
}
