"use client";

import { useOptimistic, useState, useTransition } from "react";
import { addReminder, removeReminder, toggleReminder } from "@/app/app/actions";
import { ErrorText, btnPrimary, btnSecondary, inputBase } from "@/components/app/ui";

export type ReminderRow = { id: string; habit: string; time: string; channel: string; repeat: string; on: boolean };

const pill = (on: boolean) => ({
  border: `1px solid ${on ? "#6B705C" : "#E8DDD3"}`,
  background: on ? "#6B705C" : "#fff",
  color: on ? "#fff" : "oklch(0.45 0.014 80)",
});

export function Reminders({ reminders, habits }: { reminders: ReminderRow[]; habits: { id: string; name: string }[] }) {
  const [adding, setAdding] = useState(false);
  const [habitId, setHabitId] = useState(habits[0]?.id ?? "");
  const [time, setTime] = useState("");
  const [repeat, setRepeat] = useState("Every day");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [list, mutate] = useOptimistic(
    reminders,
    (state: ReminderRow[], a: { type: "toggle" | "remove"; id: string }) =>
      a.type === "toggle" ? state.map((r) => (r.id === a.id ? { ...r, on: !r.on } : r)) : state.filter((r) => r.id !== a.id),
  );

  const active = list.filter((r) => r.on);
  const next = active[0]?.time ?? "none set";

  const commit = () => {
    if (!habitId) return setError("Pick a habit.");
    if (!/\d/.test(time)) return setError("Add a time, like 7:30 AM.");
    startTransition(async () => {
      const res = await addReminder({ habitId, time, repeat });
      if (!res.ok) return setError(res.error);
      setAdding(false);
      setTime("");
      setError("");
    });
  };

  return (
    <>
      <div className="mb-1.5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="mb-1 text-[19px] font-bold">Reminders</h2>
          <p className="text-[13px] text-muted-2">
            {active.length} of {list.length} active · next at {next}
          </p>
        </div>
        <button type="button" onClick={() => setAdding(true)} className={btnPrimary} disabled={habits.length === 0}>
          New reminder
        </button>
      </div>

      {adding && (
        <div className="mb-1 mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-soft bg-surface p-3">
          <select value={habitId} onChange={(e) => { setHabitId(e.target.value); setError(""); }} aria-label="Habit" className={`${inputBase} flex-[1_1_180px]`}>
            {habits.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
          <input value={time} onChange={(e) => { setTime(e.target.value); setError(""); }} onKeyDown={(e) => e.key === "Enter" && commit()} placeholder="7:30 AM" aria-label="Time" className={`${inputBase} w-[120px]`} />
          <select value={repeat} onChange={(e) => setRepeat(e.target.value)} aria-label="Repeat" className={inputBase}>
            <option>Every day</option>
            <option>Weekdays</option>
          </select>
          <button type="button" onClick={commit} disabled={pending} className={btnPrimary}>Save</button>
          <button type="button" onClick={() => { setAdding(false); setTime(""); setError(""); }} className={btnSecondary}>Cancel</button>
          {error && <ErrorText>{error}</ErrorText>}
        </div>
      )}

      <div className="flex flex-col">
        {list.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-3.5 border-b border-line py-[15px]" style={{ opacity: r.on ? 1 : 0.55 }}>
            <span className="w-[76px] shrink-0 font-mono text-[13px]">{r.time}</span>
            <span className="min-w-0 flex-[1_1_160px]">
              <span className="block text-sm font-semibold">{r.habit}</span>
              <span className="block text-xs text-muted-2">
                {r.channel} · {r.repeat}
              </span>
            </span>
            <button
              type="button"
              aria-pressed={r.on}
              onClick={() => startTransition(async () => { mutate({ type: "toggle", id: r.id }); await toggleReminder(r.id); })}
              className="cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-semibold hover:opacity-90"
              style={pill(r.on)}
            >
              {r.on ? "On" : "Off"}
            </button>
            <button
              type="button"
              title="Delete reminder"
              onClick={() => startTransition(async () => { mutate({ type: "remove", id: r.id }); await removeReminder(r.id); })}
              className="h-7 w-7 cursor-pointer rounded-[9px] border border-line bg-white text-[13px] text-muted-3 hover:border-soft hover:text-[#A8452E]"
            >
              ×
            </button>
          </div>
        ))}
        {list.length === 0 && (
          <div className="mt-4 rounded-[14px] border border-dashed border-soft p-6 text-center text-[13px] text-muted">
            No reminders yet. Add one for any habit.
          </div>
        )}
      </div>
    </>
  );
}
