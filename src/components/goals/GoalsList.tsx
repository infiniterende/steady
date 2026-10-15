"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { addGoal, addPoints, removeGoal, stepGoal } from "@/app/app/actions";
import { POINTS } from "@/lib/domain";
import { fmtNum, pluralUnit } from "@/lib/goals";
import { Bar, Card, ErrorText, btnPrimary, btnSecondary, inputBase } from "@/components/app/ui";

export type GoalRow = {
  id: string;
  name: string;
  kind: "COUNT" | "MEASURE" | "DERIVED";
  value: number;
  target: number;
  unit: string;
  horizon: string;
  note: string;
  pct: number;
  step: number;
  nextMilestone: string | null;
  milestonesHit: number;
  milestoneCount: number;
};

const PALETTE = ["#B7B7A4", "#CB997E", "#DDBEA9", "#B7B7A4"];

export function GoalsList({ goals, today }: { goals: GoalRow[]; today: string }) {
  const [adding, setAdding] = useState(false);
  const [kind, setKind] = useState<"COUNT" | "MEASURE">("COUNT");
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [start, setStart] = useState("");
  const [target, setTarget] = useState("");
  const [step, setStep] = useState("1");
  const [deadline, setDeadline] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const met = goals.filter((g) => g.pct >= 100).length;

  const reset = () => {
    setAdding(false);
    setName("");
    setUnit("");
    setStart("");
    setTarget("");
    setStep("1");
    setDeadline("");
    setError("");
  };

  const commit = () => {
    if (!name.trim()) return setError("Name the goal.");
    if (target.trim() === "" || !Number.isFinite(Number(target))) return setError("Target must be a number.");
    if (kind === "MEASURE" && (start.trim() === "" || !Number.isFinite(Number(start)))) return setError("Add your starting value.");
    startTransition(async () => {
      const res = await addGoal({ name, kind, unit, start, target, step, deadline });
      if (!res.ok) return setError(res.error);
      reset();
    });
  };

  const run = (fn: () => Promise<unknown>) => startTransition(() => fn().then(() => undefined));

  return (
    <>
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="mb-1 text-[26px] font-bold tracking-[-0.02em]">Goals</h1>
            <p className="text-[13px] text-muted-2">
              {goals.length} goals · {met} met
            </p>
          </div>
          <button type="button" onClick={() => setAdding(true)} className={btnPrimary}>
            New goal
          </button>
        </div>

        {adding && (
          <div className="mt-[18px] flex flex-col gap-3 rounded-xl border border-dashed border-soft bg-surface p-3.5">
            <div className="flex rounded-[11px] bg-white p-1 self-start">
              {(
                [
                  ["COUNT", "Count up to a target"],
                  ["MEASURE", "Track a measurement"],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    setKind(k);
                    setError("");
                  }}
                  className="cursor-pointer rounded-lg border-0 px-3.5 py-[7px] text-[13px] font-semibold"
                  style={{
                    color: kind === k ? "#40453A" : "oklch(0.5 0.014 80)",
                    background: kind === k ? "#F4EDE6" : "transparent",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-2">
              {kind === "COUNT"
                ? "Add to the total as you go: books read, sessions, minutes."
                : "Log a value each day and watch it move toward a target: weight, resting heart rate, savings."}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <input value={name} onChange={(e) => { setName(e.target.value); setError(""); }} placeholder={kind === "COUNT" ? "Read 20 books this year" : "Lose 30 pounds"} aria-label="Goal name" className={`${inputBase} flex-[1_1_220px]`} />
              <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder={kind === "COUNT" ? "unit, e.g. books" : "unit, e.g. lbs"} aria-label="Unit" className={`${inputBase} w-[140px]`} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {kind === "MEASURE" && (
                <input value={start} onChange={(e) => { setStart(e.target.value); setError(""); }} inputMode="decimal" placeholder="Starting at, e.g. 200" aria-label="Starting value" className={`${inputBase} w-[170px]`} />
              )}
              <input value={target} onChange={(e) => { setTarget(e.target.value); setError(""); }} inputMode="decimal" placeholder={kind === "COUNT" ? "Target, e.g. 20" : "Target, e.g. 170"} aria-label="Target" className={`${inputBase} w-[150px]`} />
              {kind === "COUNT" && (
                <input value={step} onChange={(e) => setStep(e.target.value)} inputMode="decimal" placeholder="Step" aria-label="Step per log" title="How much one log adds" className={`${inputBase} w-[80px]`} />
              )}
              <label className="flex items-center gap-2 text-xs text-muted-2">
                Deadline
                <input type="date" value={deadline} max="2099-12-31" onChange={(e) => setDeadline(e.target.value)} aria-label="Deadline" className={inputBase} />
              </label>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={commit} disabled={pending} className={btnPrimary}>Save</button>
              <button type="button" onClick={reset} className={btnSecondary}>Cancel</button>
              {error && <ErrorText>{error}</ErrorText>}
            </div>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-3.5">
          {goals.map((g, i) => {
            const derived = g.kind === "DERIVED";
            const r = Math.max(0, g.kind === "MEASURE" ? Math.abs(g.target - g.value) : g.target - g.value);
            return (
              <div key={g.id} className="flex flex-col gap-3 rounded-[14px] border border-line bg-surface p-[18px]">
                <div className="flex items-start justify-between gap-2.5">
                  {derived ? (
                    <span className="pretty text-[15px] font-semibold">{g.name}</span>
                  ) : (
                    <Link href={`/app/goals/${g.id}`} className="pretty text-[15px] font-semibold text-inherit hover:text-olive">
                      {g.name}
                    </Link>
                  )}
                  <span
                    className="rounded-full px-[9px] py-1 text-[11px] font-semibold"
                    style={{ background: g.pct >= 100 ? "#E8DDD3" : "#fff", color: g.pct >= 100 ? "#4A4F3E" : "oklch(0.45 0.014 80)" }}
                  >
                    {g.pct}%
                  </span>
                </div>
                <div className="flex items-baseline gap-2.5">
                  <span className="font-mono text-xl">
                    {fmtNum(g.value)} / {fmtNum(g.target)} {g.unit}
                  </span>
                  <span className="text-xs text-muted-2">
                    {fmtNum(r)} {pluralUnit(r, g.unit)} left
                  </span>
                </div>
                <Bar pct={g.pct} color={PALETTE[i % 4]} track="#fff" />
                <div className="flex items-center justify-between gap-2.5 text-xs text-muted-2">
                  <span>{g.horizon}</span>
                  <span className="truncate">{g.note}</span>
                </div>
                {!derived && g.milestoneCount > 0 && (
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate text-muted-2">{g.nextMilestone ? `Next: ${g.nextMilestone}` : "All milestones hit"}</span>
                    <span className="shrink-0 rounded-full bg-white px-2 py-0.5 font-mono text-[11px] text-muted">
                      {g.milestonesHit}/{g.milestoneCount}
                    </span>
                  </div>
                )}
                <div className="mt-0.5 flex gap-2">
                  {derived ? (
                    <>
                      <button type="button" disabled={pending} onClick={() => run(() => addPoints(POINTS.session, "Logged a session", today))} className="cursor-pointer rounded-[9px] border-0 bg-olive px-[13px] py-[7px] text-xs font-semibold text-white hover:bg-olive-dark disabled:opacity-60">
                        Log a session
                      </button>
                      <button type="button" disabled={pending} onClick={() => run(() => addPoints(-POINTS.session, "Undo session", today))} className={btnSecondary}>
                        Undo
                      </button>
                    </>
                  ) : g.kind === "COUNT" ? (
                    <>
                      <button type="button" disabled={pending} onClick={() => run(() => stepGoal(g.id, 1))} className="cursor-pointer rounded-[9px] border-0 bg-olive px-[13px] py-[7px] text-xs font-semibold text-white hover:bg-olive-dark disabled:opacity-60">
                        +{fmtNum(g.step)} {g.unit}
                      </button>
                      <button type="button" disabled={pending} onClick={() => run(() => stepGoal(g.id, -1))} className={btnSecondary}>
                        Undo
                      </button>
                    </>
                  ) : (
                    <Link href={`/app/goals/${g.id}`} className="rounded-[9px] bg-olive px-[13px] py-[7px] text-xs font-semibold text-white hover:bg-olive-dark hover:text-white">
                      Log today
                    </Link>
                  )}
                  {!derived && (
                    <button type="button" title="Delete goal" disabled={pending} onClick={() => run(() => removeGoal(g.id))} className="ml-auto h-7 w-7 cursor-pointer rounded-[9px] border border-line bg-white text-[13px] text-muted-3 hover:border-soft hover:text-[#A8452E]">
                      ×
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </>
  );
}
