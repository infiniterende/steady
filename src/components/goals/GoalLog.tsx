"use client";

import { useState, useTransition } from "react";
import { logGoalEntry, removeGoalEntry } from "@/app/app/actions";
import { fmtNum } from "@/lib/goals";
import { formatDay } from "@/lib/dates";
import { ErrorText, btnPrimary, inputBase } from "@/components/app/ui";

type Entry = { id: string; date: string; value: number; note: string | null };

export function GoalLog({
  goalId,
  kind,
  unit,
  today,
  todayValue,
  entries,
}: {
  goalId: string;
  kind: "COUNT" | "MEASURE";
  unit: string;
  today: string;
  todayValue: number | null;
  entries: Entry[];
}) {
  const [date, setDate] = useState(today);
  const [value, setValue] = useState(todayValue === null ? "" : fmtNum(todayValue));
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const commit = () => {
    if (value.trim() === "" || !Number.isFinite(Number(value))) return setError("Enter a number.");
    startTransition(async () => {
      const res = await logGoalEntry({ goalId, date, value, note });
      if (!res.ok) return setError(res.error);
      setError("");
      setNote("");
      setSaved(true);
    });
  };

  const recent = [...entries].reverse().slice(0, 14);

  return (
    <>
      <h2 className="mb-1 text-[19px] font-bold">{kind === "MEASURE" ? "Log today's value" : "Set the running total"}</h2>
      <p className="mb-4 text-[13px] text-muted-2">
        {kind === "MEASURE"
          ? `One entry per day. Logging the same day again replaces it.`
          : `Or use the +step button on the Goals page. One entry per day records where the total stood.`}
      </p>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-[#FAF6F2] p-2.5">
        <input
          type="date"
          value={date}
          max={today}
          onChange={(e) => {
            setDate(e.target.value);
            setError("");
            setSaved(false);
          }}
          aria-label="Date"
          className={inputBase}
        />
        <div className="flex items-center gap-2">
          <input
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError("");
              setSaved(false);
            }}
            onKeyDown={(e) => e.key === "Enter" && commit()}
            inputMode="decimal"
            placeholder="0"
            aria-label={`Value in ${unit}`}
            className={`${inputBase} w-[110px] font-mono`}
          />
          <span className="text-[13px] text-muted">{unit}</span>
        </div>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && commit()}
          placeholder="Note (optional)"
          aria-label="Note"
          className={`${inputBase} flex-[1_1_160px]`}
        />
        <button type="button" onClick={commit} disabled={pending} className={btnPrimary}>
          {pending ? "Saving…" : "Save"}
        </button>
        {saved && !error && <span className="text-xs text-muted">Saved.</span>}
        {error && <ErrorText>{error}</ErrorText>}
      </div>

      <h3 className="mb-1 mt-6 text-xs font-semibold uppercase tracking-[0.1em] text-muted-2">Recent entries</h3>
      <div className="flex flex-col">
        {recent.map((e) => (
          <div key={e.id} className="flex items-center gap-3.5 border-b border-line py-3">
            <span className="w-[76px] shrink-0 font-mono text-xs text-muted">{formatDay(e.date, { month: "short", day: "numeric" })}</span>
            <span className="font-mono text-sm">
              {fmtNum(e.value)} {unit}
            </span>
            <span className="min-w-0 flex-1 truncate text-xs text-muted-2">{e.note}</span>
            <button
              type="button"
              title="Delete entry"
              disabled={pending}
              onClick={() => startTransition(() => removeGoalEntry(e.id).then(() => undefined))}
              className="h-[26px] w-[26px] cursor-pointer rounded-lg border border-line bg-white text-[13px] text-muted-3 hover:border-soft hover:text-[#A8452E]"
            >
              ×
            </button>
          </div>
        ))}
        {recent.length === 0 && <div className="py-3 text-[13px] text-muted">Nothing logged yet.</div>}
      </div>
    </>
  );
}
