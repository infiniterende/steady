"use client";

import { useState, useTransition } from "react";
import type { Domain } from "@prisma/client";
import { addHabit, archiveHabit, logHabit, setHabitSizes, togglePauseHabit } from "@/app/app/actions";
import { DOMAIN_COLOR, DOMAIN_LABEL, DOMAINS } from "@/lib/domain";
import { Bar, ErrorText, btnPrimary, btnSecondary, inputBase } from "@/components/app/ui";

export type HabitRow = {
  id: string;
  name: string;
  domain: Domain;
  cadence: string;
  time: string;
  minutes: number;
  progress: number;
  paused: boolean;
  streak: number;
  best: number;
  minLabel: string;
  stdLabel: string;
  stretchLabel: string;
  minMinutes: number;
  stretchMinutes: number | null;
};

export function HabitsList({ habits }: { habits: HabitRow[] }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [domain, setDomain] = useState<Domain>("FOCUS");
  const [time, setTime] = useState("7:00 AM");
  const [minutes, setMinutes] = useState("20");
  const [cadence, setCadence] = useState("Daily");
  const [labels, setLabels] = useState({ min: "", std: "", stretch: "" });
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const active = habits.filter((h) => !h.paused).length;

  const commit = () =>
    startTransition(async () => {
      const res = await addHabit({ name, domain, time, minutes: parseInt(minutes, 10), cadence, minLabel: labels.min, stdLabel: labels.std, stretchLabel: labels.stretch });
      if (!res.ok) return setError(res.error);
      setAdding(false);
      setName("");
      setLabels({ min: "", std: "", stretch: "" });
      setError("");
    });

  return (
    <>
      <div className="mb-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="mb-1 text-[26px] font-bold tracking-[-0.02em]">Habits</h1>
          <p className="text-[13px] text-muted-2">{active} active · log progress or pause anything you&apos;re resting</p>
        </div>
        <button type="button" onClick={() => setAdding(true)} className={btnPrimary}>
          New habit
        </button>
      </div>

      {adding && (
        <div className="my-4 flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-soft bg-surface p-3">
          <input value={name} onChange={(e) => { setName(e.target.value); setError(""); }} placeholder="Habit name" aria-label="Habit name" className={`${inputBase} flex-[1_1_180px]`} />
          <select value={domain} onChange={(e) => setDomain(e.target.value as Domain)} aria-label="Domain" className={inputBase}>
            {DOMAINS.map((d) => (
              <option key={d} value={d}>{DOMAIN_LABEL[d]}</option>
            ))}
          </select>
          <input value={time} onChange={(e) => { setTime(e.target.value); setError(""); }} placeholder="7:00 AM" aria-label="Time" className={`${inputBase} w-[100px]`} />
          <input value={minutes} onChange={(e) => { setMinutes(e.target.value); setError(""); }} inputMode="numeric" placeholder="min" aria-label="Minutes" className={`${inputBase} w-[70px]`} />
          <select value={cadence} onChange={(e) => setCadence(e.target.value)} aria-label="Cadence" className={inputBase}>
            <option>Daily</option>
            <option>Weekdays</option>
          </select>
          <div className="flex flex-[1_1_100%] flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted-2">Sizes</span>
            <input value={labels.min} onChange={(e) => setLabels({ ...labels, min: e.target.value })} placeholder="Minimum: Read 1 page" aria-label="Minimum version" className={`${inputBase} flex-[1_1_150px]`} />
            <input value={labels.std} onChange={(e) => setLabels({ ...labels, std: e.target.value })} placeholder="Standard: Read 10 pages" aria-label="Standard version" className={`${inputBase} flex-[1_1_150px]`} />
            <input value={labels.stretch} onChange={(e) => setLabels({ ...labels, stretch: e.target.value })} placeholder="Stretch: Read 20 pages" aria-label="Stretch version" className={`${inputBase} flex-[1_1_150px]`} />
          </div>
          <button type="button" onClick={commit} disabled={pending} className={btnPrimary}>Save</button>
          <button type="button" onClick={() => { setAdding(false); setError(""); }} className={btnSecondary}>Cancel</button>
          {error && <ErrorText>{error}</ErrorText>}
        </div>
      )}

      <div className="flex flex-col">
        {habits.map((h) => (
          <div
            key={h.id}
            className="flex flex-wrap items-center gap-3.5 border-b border-line py-4"
            style={{ opacity: h.paused ? 0.55 : 1 }}
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: DOMAIN_COLOR[h.domain] }} />
            <span className="min-w-0 flex-[1_1_180px]">
              <span className="block text-[15px] font-semibold">{h.name}</span>
              <span className="block text-xs text-muted-2">
                {DOMAIN_LABEL[h.domain]} · {h.cadence} · {h.time} · {h.minutes} min
              </span>
            </span>
            <span className="min-w-[120px] flex-[1_1_140px]">
              <span className="mb-[5px] flex justify-between text-[11px] text-muted-2">
                <span>{h.streak}d streak · best {h.best}d</span>
                <span className="font-mono">{h.progress}%</span>
              </span>
              <Bar pct={h.progress} color={h.paused ? "#F4EDE6" : DOMAIN_COLOR[h.domain]} />
            </span>
            <span className="flex gap-2">
              <button type="button" disabled={pending} onClick={() => startTransition(() => logHabit(h.id).then(() => undefined))} className="cursor-pointer rounded-[9px] border-0 bg-olive px-[13px] py-[7px] text-xs font-semibold text-white hover:bg-olive-dark disabled:opacity-60">
                Log
              </button>
              <button type="button" onClick={() => setEditing(editing === h.id ? null : h.id)} aria-expanded={editing === h.id} className={btnSecondary}>
                Sizes
              </button>
              <button type="button" disabled={pending} onClick={() => startTransition(() => togglePauseHabit(h.id).then(() => undefined))} className={btnSecondary}>
                {h.paused ? "Resume" : "Pause"}
              </button>
              <button type="button" title="Archive habit" disabled={pending} onClick={() => startTransition(() => archiveHabit(h.id).then(() => undefined))} className="h-[30px] w-[30px] cursor-pointer rounded-[9px] border border-line bg-white text-[13px] text-muted-3 hover:border-soft hover:text-[#A8452E]">
                ×
              </button>
            </span>
            {editing === h.id && <SizesEditor habit={h} onDone={() => setEditing(null)} />}
          </div>
        ))}
        {habits.length === 0 && (
          <div className="mt-4 rounded-[14px] border border-dashed border-soft p-6 text-center text-[13px] text-muted">
            No habits yet. Create one and it will appear on your daily schedule.
          </div>
        )}
      </div>
    </>
  );
}

function SizesEditor({ habit, onDone }: { habit: HabitRow; onDone: () => void }) {
  const [min, setMin] = useState(habit.minLabel);
  const [std, setStd] = useState(habit.stdLabel);
  const [stretch, setStretch] = useState(habit.stretchLabel);
  const [minMin, setMinMin] = useState(String(habit.minMinutes));
  const [stretchMin, setStretchMin] = useState(habit.stretchMinutes ? String(habit.stretchMinutes) : "");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      const res = await setHabitSizes(habit.id, {
        minLabel: min,
        stdLabel: std,
        stretchLabel: stretch,
        minMinutes: parseInt(minMin, 10),
        stretchMinutes: stretchMin ? parseInt(stretchMin, 10) : null,
      });
      if (!res.ok) return setError(res.error);
      onDone();
    });

  const row = "flex flex-wrap items-center gap-2";
  return (
    <div className="flex flex-[1_1_100%] flex-col gap-2 rounded-xl bg-surface p-3.5">
      <p className="text-xs text-muted-2">Three ways to count this habit. On a hard day, the minimum still keeps the chain alive.</p>
      <div className={row}>
        <span className="w-[72px] text-xs font-semibold">Minimum</span>
        <input value={min} onChange={(e) => setMin(e.target.value)} placeholder="e.g. Read 1 page" aria-label="Minimum version" className={`${inputBase} flex-[1_1_200px]`} />
        <input value={minMin} onChange={(e) => setMinMin(e.target.value)} inputMode="numeric" aria-label="Minimum minutes" className={`${inputBase} w-[64px]`} />
        <span className="text-xs text-muted-2">min</span>
      </div>
      <div className={row}>
        <span className="w-[72px] text-xs font-semibold">Standard</span>
        <input value={std} onChange={(e) => setStd(e.target.value)} placeholder="e.g. Read 10 pages" aria-label="Standard version" className={`${inputBase} flex-[1_1_200px]`} />
        <span className="w-[64px] text-center font-mono text-xs text-muted-2">{habit.minutes}</span>
        <span className="text-xs text-muted-2">min</span>
      </div>
      <div className={row}>
        <span className="w-[72px] text-xs font-semibold">Stretch</span>
        <input value={stretch} onChange={(e) => setStretch(e.target.value)} placeholder="e.g. Read 20 pages" aria-label="Stretch version" className={`${inputBase} flex-[1_1_200px]`} />
        <input value={stretchMin} onChange={(e) => setStretchMin(e.target.value)} inputMode="numeric" placeholder="auto" aria-label="Stretch minutes" className={`${inputBase} w-[64px]`} />
        <span className="text-xs text-muted-2">min</span>
      </div>
      <div className={row}>
        <button type="button" onClick={save} disabled={pending} className={btnPrimary}>Save sizes</button>
        <button type="button" onClick={onDone} className={btnSecondary}>Cancel</button>
        {error && <ErrorText>{error}</ErrorText>}
      </div>
    </div>
  );
}
