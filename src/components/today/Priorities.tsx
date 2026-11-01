"use client";

import { useState, useTransition } from "react";
import { addPriority, finishTask, helpMeStart, setFirstStep, setTop, toggleTask } from "@/app/app/actions";
import { ErrorText, btnPrimary, btnSecondary, inputBase } from "@/components/app/ui";
import { startFocus } from "@/components/today/focusEvents";

export type PriorityTask = { id: string; title: string; done: boolean; top: boolean; firstStep: string | null };

const SLOTS = 3;

export function Priorities({ day, tasks }: { day: string; tasks: PriorityTask[] }) {
  const tops = tasks.filter((t) => t.top);
  const candidates = tasks.filter((t) => !t.top && !t.done);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const free = SLOTS - tops.length;
  const doneCount = tops.filter((t) => t.done).length;

  const add = () =>
    startTransition(async () => {
      const res = await addPriority({ day, title: draft });
      if (!res.ok) return setError(res.error);
      setDraft("");
      setError("");
    });

  const promote = (id: string) =>
    startTransition(async () => {
      const res = await setTop(id, true);
      if (!res.ok) setError(res.error);
      else setError("");
    });

  return (
    <>
      <div className="mb-[14px] flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="text-[19px] font-bold tracking-[-0.01em]">Your three for today</h2>
          <p className="mt-0.5 text-[13px] text-muted">
            {tops.length === 0
              ? "Pick up to three things that would make today feel like a good one."
              : doneCount === tops.length
                ? "All of today's priorities are done."
                : `${doneCount} of ${tops.length} done. Everything else is a bonus.`}
          </p>
        </div>
        <span className="font-mono text-xs text-muted-3">{tops.length}/3</span>
      </div>

      <div className="flex flex-col gap-2.5">
        {tops.map((t, i) => (
          <PriorityRow key={t.id} n={i + 1} task={t} />
        ))}
        {Array.from({ length: free }).map((_, i) => (
          <div
            key={`slot-${i}`}
            className="flex items-center gap-3 rounded-[14px] border border-dashed border-soft px-3 py-3 text-[13px] text-muted-3"
          >
            <span className="grid h-[26px] w-[26px] place-items-center rounded-full border border-dashed border-soft font-mono text-xs">
              {tops.length + i + 1}
            </span>
            Open slot
          </div>
        ))}
      </div>

      {free > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && draft.trim() && add()}
            placeholder="Add a priority"
            aria-label="New priority"
            className={`${inputBase} flex-[1_1_200px]`}
          />
          <button type="button" onClick={add} disabled={pending || !draft.trim()} className={btnPrimary}>
            Add
          </button>
          {candidates.length > 0 && (
            <select
              aria-label="Promote an existing goal"
              value=""
              onChange={(e) => e.target.value && promote(e.target.value)}
              className={inputBase}
            >
              <option value="">or pick from today&apos;s goals…</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
      {error && (
        <div className="mt-2">
          <ErrorText>{error}</ErrorText>
        </div>
      )}
    </>
  );
}

function PriorityRow({ n, task }: { n: number; task: PriorityTask }) {
  const [step, setStep] = useState(task.firstStep ?? "");
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<"claude" | "rules" | null>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const help = () => {
    setOpen(true);
    setError("");
    if (step) return;
    startTransition(async () => {
      const res = await helpMeStart(task.id);
      if (!res.ok) return setError(res.error);
      setStep(res.step);
      setSource(res.source);
    });
  };

  const another = () =>
    startTransition(async () => {
      const res = await helpMeStart(task.id);
      if (!res.ok) return setError(res.error);
      setStep(res.step);
      setSource(res.source);
    });

  return (
    <div className="rounded-[14px] border border-line p-3" style={{ background: task.done ? "#FAF6F2" : "#fff", opacity: task.done ? 0.75 : 1 }}>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          aria-pressed={task.done}
          title={task.done ? "Mark not done" : "Mark done"}
          disabled={pending}
          onClick={() => startTransition(() => toggleTask(task.id).then(() => undefined))}
          className="grid h-[30px] w-[30px] shrink-0 cursor-pointer place-items-center rounded-full p-0 text-[13px] text-white"
          style={{ border: `2px solid ${task.done ? "#6B705C" : "#DDBEA9"}`, background: task.done ? "#6B705C" : "#fff" }}
        >
          {task.done ? "✓" : <span className="font-mono text-xs text-muted-3">{n}</span>}
        </button>
        <span
          className="min-w-0 flex-[1_1_160px] truncate text-[15px] font-semibold"
          style={task.done ? { textDecoration: "line-through", color: "oklch(0.5 0.014 80)" } : undefined}
        >
          {task.title}
        </span>
        {!task.done && (
          <span className="flex flex-wrap gap-1.5">
            <button type="button" onClick={help} className={btnSecondary}>
              Help me start
            </button>
            <button type="button" onClick={() => startFocus({ title: task.title, minutes: 25, taskId: task.id })} className={btnSecondary}>
              Focus 25
            </button>
          </span>
        )}
        <button
          type="button"
          title="Take off today's three"
          disabled={pending}
          onClick={() => startTransition(() => setTop(task.id, false).then(() => undefined))}
          className="h-[26px] w-[26px] shrink-0 cursor-pointer rounded-lg border-0 bg-transparent text-[15px] text-muted-3 hover:bg-surface hover:text-danger"
        >
          ×
        </button>
      </div>

      {open && !task.done && (
        <div className="mt-3 rounded-xl bg-surface p-3.5">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-3">Start here</div>
          {pending && !step ? (
            <div className="text-sm text-muted">Finding a small first step…</div>
          ) : editing ? (
            <div className="flex flex-wrap gap-2">
              <input value={step} onChange={(e) => setStep(e.target.value)} aria-label="First step" className={`${inputBase} flex-[1_1_240px]`} />
              <button
                type="button"
                className={btnPrimary}
                onClick={() =>
                  startTransition(async () => {
                    await setFirstStep(task.id, step);
                    setEditing(false);
                  })
                }
              >
                Save
              </button>
            </div>
          ) : (
            <p className="text-[15px] font-medium leading-snug">{step}</p>
          )}
          {error && <div className="mt-2 text-xs text-danger">{error}</div>}
          {step && !editing && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className={btnPrimary}
                onClick={() => startFocus({ title: task.title, minutes: 5, taskId: task.id, note: step })}
              >
                Start 5-minute timer
              </button>
              <button type="button" className={btnSecondary} disabled={pending} onClick={another}>
                Try another
              </button>
              <button type="button" className={btnSecondary} onClick={() => setEditing(true)}>
                Edit
              </button>
              <button type="button" className={btnSecondary} disabled={pending} onClick={() => startTransition(() => finishTask(task.id).then(() => undefined))}>
                Already done
              </button>
              <span className="ml-auto text-[11px] text-muted-3">{source === "claude" ? "Suggested by Claude" : "Suggested from simple rules"}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
