"use client";

import { useState, useTransition } from "react";
import { addMilestone, removeMilestone } from "@/app/app/actions";
import { fmtNum } from "@/lib/goals";
import { formatDay } from "@/lib/dates";
import { ErrorText, btnPrimary, btnSecondary, inputBase } from "@/components/app/ui";

type Milestone = { id: string; label: string; value: number; achieved: boolean; achievedOn: string | null; isNext: boolean };

export function Milestones({ goalId, unit, milestones }: { goalId: string; unit: string; milestones: Milestone[] }) {
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const hit = milestones.filter((m) => m.achieved).length;

  const commit = () => {
    if (value.trim() === "" || !Number.isFinite(Number(value))) return setError("Enter the value this milestone is at.");
    startTransition(async () => {
      const res = await addMilestone({ goalId, label, value });
      if (!res.ok) return setError(res.error);
      setAdding(false);
      setLabel("");
      setValue("");
      setError("");
    });
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="mb-1 text-[19px] font-bold">Milestones</h2>
          <p className="text-[13px] text-muted-2">
            {hit} of {milestones.length} reached
          </p>
        </div>
        <button type="button" onClick={() => setAdding(true)} className={btnPrimary}>
          Add milestone
        </button>
      </div>

      {adding && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-soft bg-surface p-3">
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label, e.g. Halfway" aria-label="Milestone label" className={`${inputBase} flex-[1_1_160px]`} />
          <div className="flex items-center gap-2">
            <input value={value} onChange={(e) => { setValue(e.target.value); setError(""); }} onKeyDown={(e) => e.key === "Enter" && commit()} inputMode="decimal" placeholder="at value" aria-label="Milestone value" className={`${inputBase} w-[110px] font-mono`} />
            <span className="text-[13px] text-muted">{unit}</span>
          </div>
          <button type="button" onClick={commit} disabled={pending} className={btnPrimary}>Save</button>
          <button type="button" onClick={() => { setAdding(false); setLabel(""); setValue(""); setError(""); }} className={btnSecondary}>Cancel</button>
          {error && <ErrorText>{error}</ErrorText>}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {milestones.map((m) => (
          <div
            key={m.id}
            className="flex items-center gap-3.5 rounded-[14px] border p-3.5"
            style={{
              borderColor: m.isNext ? "#6B705C" : "#E8DDD3",
              background: m.achieved ? "#F4EDE6" : "#fff",
              opacity: m.achieved || m.isNext ? 1 : 0.8,
            }}
          >
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[13px] font-bold"
              style={{
                background: m.achieved ? "#6B705C" : m.isNext ? "#DDBEA9" : "#F4EDE6",
                color: m.achieved ? "#fff" : "#40453A",
              }}
            >
              {m.achieved ? "✓" : m.isNext ? "→" : "·"}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{m.label}</span>
              <span className="block text-xs text-muted-2">
                {m.achieved && m.achievedOn
                  ? `Reached ${formatDay(m.achievedOn, { month: "short", day: "numeric" })}`
                  : m.achieved
                    ? "Reached"
                    : m.isNext
                      ? "Up next"
                      : "Upcoming"}
              </span>
            </span>
            <span className="font-mono text-[13px]">
              {fmtNum(m.value)} {unit}
            </span>
            <button
              type="button"
              title="Delete milestone"
              disabled={pending}
              onClick={() => startTransition(() => removeMilestone(m.id).then(() => undefined))}
              className="h-7 w-7 cursor-pointer rounded-[9px] border border-line bg-white text-[13px] text-muted-3 hover:border-soft hover:text-[#A8452E]"
            >
              ×
            </button>
          </div>
        ))}
        {milestones.length === 0 && (
          <div className="rounded-[14px] border border-dashed border-soft p-6 text-center text-[13px] text-muted">
            No milestones yet. Add a checkpoint to aim for on the way.
          </div>
        )}
      </div>
    </>
  );
}
