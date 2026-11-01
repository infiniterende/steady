"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { addPlannerItem, setPlannerDay, type PlannerInput } from "@/app/app/actions";
import { ErrorText, inputBase } from "@/components/app/ui";
import { formatDay } from "@/lib/dates";
import { KIND_META, PLANNER_KINDS, REMIND_OPTIONS, TINTS, TINT_KEYS, parseQuickAdd, remindLabel } from "@/lib/planner";
import { askNotificationPermission, notificationState, playChime, setSoundEnabled, soundEnabled, systemNotify } from "@/components/planner/alerts";
import { BellIcon } from "@/components/planner/BellIcon";

export const warmBtn =
  "cursor-pointer rounded-[10px] border-0 bg-[#40453A] px-4 py-[9px] text-[12px] font-semibold text-white transition hover:bg-[#2d3128] disabled:opacity-60";
export const warmBtn2 =
  "cursor-pointer rounded-[10px] border border-[#DDBEA9] bg-white px-3.5 py-2 text-[12px] font-semibold text-[#5A544C] transition hover:bg-[#F4EDE6] disabled:opacity-60";

type Result = { ok: true } | { ok: false; error: string };

/** Full editor for one item (used for editing, and for adding a reminder). */
export function ItemForm({
  initial,
  submitLabel,
  onSubmit,
  onDone,
}: {
  initial: PlannerInput;
  submitLabel: string;
  onSubmit: (v: PlannerInput) => Promise<Result>;
  onDone: () => void;
}) {
  const [v, setV] = useState(initial);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const set = <K extends keyof PlannerInput>(k: K, val: PlannerInput[K]) => {
    setV((s) => ({ ...s, [k]: val }));
    setError("");
  };
  const save = () =>
    startTransition(async () => {
      const res = await onSubmit(v);
      if (!res.ok) return setError(res.error);
      onDone();
    });
  const isReminder = v.kind === "REMINDER";

  return (
    <div className="my-2 flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-[#DDBEA9] bg-white/70 p-3">
      <input
        autoFocus
        value={v.title}
        onChange={(e) => set("title", e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && save()}
        placeholder={isReminder ? "What should we remind you?" : "What needs doing?"}
        aria-label="Title"
        className={`${inputBase} flex-[1_1_100%]`}
      />
      <select value={v.kind} onChange={(e) => set("kind", e.target.value)} aria-label="Type" className={inputBase}>
        {PLANNER_KINDS.map((k) => (
          <option key={k} value={k}>
            {KIND_META[k].label}
          </option>
        ))}
      </select>
      <input type="date" value={v.date} onChange={(e) => set("date", e.target.value)} aria-label="Date" className={inputBase} />
      <input value={v.time} onChange={(e) => set("time", e.target.value)} placeholder="Time, e.g. 9:00 PM" aria-label="Time" className={`${inputBase} w-[140px]`} />
      <select
        value={v.remindMin === null ? "" : String(v.remindMin)}
        onChange={(e) => set("remindMin", e.target.value === "" ? null : Number(e.target.value))}
        aria-label="Reminder"
        className={inputBase}
      >
        {REMIND_OPTIONS.map((o) => (
          <option key={String(o.value)} value={o.value === null ? "" : String(o.value)}>
            {o.value === null ? "No reminder" : o.label}
          </option>
        ))}
      </select>
      <select value={v.priority} onChange={(e) => set("priority", e.target.value)} aria-label="Priority" className={inputBase}>
        <option value="HIGH">High priority</option>
        <option value="MEDIUM">Medium priority</option>
        <option value="LOW">Low priority</option>
      </select>
      <input value={v.place} onChange={(e) => set("place", e.target.value)} placeholder="@place (optional)" aria-label="Place" className={`${inputBase} flex-[1_1_140px]`} />
      <input value={v.note} onChange={(e) => set("note", e.target.value)} placeholder="Note (optional)" aria-label="Note" className={`${inputBase} flex-[1_1_100%]`} />
      <button type="button" onClick={save} disabled={pending} className={warmBtn}>
        {submitLabel}
      </button>
      <button type="button" onClick={onDone} className={warmBtn2}>
        Cancel
      </button>
      {v.remindMin !== null && !v.time.trim() && <span className="text-xs text-muted-2">No time set, so this reminds at 9:00 AM.</span>}
      {error && <ErrorText>{error}</ErrorText>}
    </div>
  );
}

/** Label pill, note and tint for one day. */
export function DayEditor({
  day,
  initial,
  onDone,
}: {
  day: string;
  initial: { label: string; note: string; tint: string };
  onDone: () => void;
}) {
  const [label, setLabel] = useState(initial.label);
  const [note, setNote] = useState(initial.note);
  const [tint, setTint] = useState(initial.tint);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const save = (clear = false) =>
    startTransition(async () => {
      const res = await setPlannerDay({ date: day, label: clear ? "" : label, note: clear ? "" : note, tint: clear ? "" : tint });
      if (!res.ok) return setError(res.error);
      onDone();
    });

  return (
    <div className="mb-3 flex flex-col gap-2.5 rounded-xl border border-dashed border-[#DDBEA9] bg-white/70 p-3">
      <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Day label, e.g. Slow morning" aria-label="Day label" maxLength={30} className={inputBase} />
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={"Note for the day.\nFirst line is the headline."}
        aria-label="Day note"
        rows={3}
        maxLength={500}
        autoFocus
        className={`${inputBase} resize-y`}
      />
      <div className="flex items-center gap-2" role="group" aria-label="Day color">
        <span className="text-xs text-muted-2">Color</span>
        <button type="button" aria-pressed={!tint} onClick={() => setTint("")} className="h-6 w-6 cursor-pointer rounded-full border-2 bg-white" style={{ borderColor: !tint ? "#40453A" : "#DDBEA9" }} title="None" />
        {TINT_KEYS.map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={tint === t}
            title={t}
            onClick={() => setTint(t)}
            className="h-6 w-6 cursor-pointer rounded-full border-2"
            style={{ background: TINTS[t].bg, borderColor: tint === t ? TINTS[t].accent : "#DDBEA9" }}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => save()} disabled={pending} className={warmBtn}>
          Save
        </button>
        <button type="button" onClick={onDone} className={warmBtn2}>
          Cancel
        </button>
        <button type="button" onClick={() => save(true)} disabled={pending} className="ml-auto cursor-pointer border-0 bg-transparent text-xs font-semibold text-muted-2 hover:text-danger">
          Clear day
        </button>
      </div>
      {error && <ErrorText>{error}</ErrorText>}
    </div>
  );
}

/** One-line add for a given day. Stays open so several tasks can be typed in a row. */
export function InlineTaskAdd({ day, onDone }: { day: string; onDone: () => void }) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const add = () => {
    const p = parseQuickAdd(text, day);
    if (!p.title) return setError("Write the task first.");
    startTransition(async () => {
      const res = await addPlannerItem({
        title: p.title,
        date: p.date,
        kind: p.kind ?? "TASK",
        time: p.time ?? "",
        note: "",
        place: p.place ?? "",
        priority: p.priority ?? "MEDIUM",
        remindMin: p.remindMin !== undefined ? p.remindMin : p.time ? 10 : null,
      });
      if (!res.ok) return setError(res.error);
      setText("");
      setError("");
    });
  };

  return (
    <div className="my-1.5">
      <div className="flex items-center gap-2">
        <span className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full border border-[#DDBEA9] text-[#B0A99C]" />
        <input
          autoFocus
          value={text}
          disabled={pending}
          onChange={(e) => {
            setText(e.target.value);
            setError("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
            if (e.key === "Escape") onDone();
          }}
          onBlur={() => !text.trim() && onDone()}
          placeholder="Task… try “call mom 3pm remind 10m”"
          aria-label="New task"
          className="min-w-0 flex-1 border-0 border-b border-[#DDBEA9] bg-transparent py-1.5 text-[13.5px] outline-none focus:border-[#B45309]"
        />
      </div>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

/** Quick add across the whole planner: type a day, time, type and reminder. */
export function QuickAdd({ today }: { today: string }) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const parsed = useMemo(() => (text.trim() ? parseQuickAdd(text, today) : null), [text, today]);
  const remind = parsed ? (parsed.remindMin !== undefined ? parsed.remindMin : parsed.time ? 10 : null) : null;

  const add = () => {
    if (!parsed || !parsed.title) return setError("Write what to add first.");
    startTransition(async () => {
      const res = await addPlannerItem({
        title: parsed.title,
        date: parsed.date,
        kind: parsed.kind ?? "TASK",
        time: parsed.time ?? "",
        note: "",
        place: parsed.place ?? "",
        priority: parsed.priority ?? "MEDIUM",
        remindMin: remind,
      });
      if (!res.ok) return setError(res.error);
      setText("");
      setError("");
    });
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setError("");
          }}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder='Quick add, e.g. "Essay due fri 5pm"'
          aria-label="Quick add"
          className="min-w-0 flex-[1_1_280px] rounded-xl border border-[#DDBEA9] bg-white px-4 py-3 text-sm outline-none focus:border-[#B45309]"
        />
        <button type="button" onClick={add} disabled={pending || !parsed} className={warmBtn}>
          Add
        </button>
      </div>
      <p className="mt-1.5 min-h-[18px] text-xs text-[#8A8378]">
        {parsed && parsed.title ? (
          <>
            <b className="font-semibold text-[#40453A]">{parsed.title}</b> · {formatDay(parsed.date)}
            {parsed.time ? ` · ${parsed.time}` : ""} · {KIND_META[parsed.kind ?? "TASK"].label}
            {parsed.place ? ` · @${parsed.place}` : ""}
            {remind !== null ? ` · reminder ${remindLabel(remind).toLowerCase()}` : ""}
          </>
        ) : (
          "Day (today, tomorrow, fri, 11/20), time (5pm), #task #assignment #deadline #appointment #event #reminder, !1 high priority, @place, remind 30m."
        )}
      </p>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

export function AlertSettings() {
  const [perm, setPerm] = useState<ReturnType<typeof notificationState>>("default");
  const [sound, setSound] = useState(true);
  const [note, setNote] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      setPerm(notificationState());
      setSound(soundEnabled());
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const test = () => {
    const played = sound ? playChime() : true;
    systemNotify("Steady test reminder", "This is how your reminders will look.", "steady-test");
    setNote(played ? "Sent a test notification and played the chime." : "Your browser blocked the chime. Click anywhere on the page, then test again.");
  };

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-[#6B645C]">
      <span className="inline-flex items-center gap-1.5 font-semibold text-[#B45309]"><BellIcon size={15} /> Reminders</span>
      <span>
        Notifications:{" "}
        {perm === "granted" ? "on" : perm === "denied" ? "blocked in browser settings" : perm === "unsupported" ? "not supported here" : "off"}
      </span>
      {perm === "default" && (
        <button type="button" className={warmBtn2} onClick={async () => setPerm(await askNotificationPermission())}>
          Turn on
        </button>
      )}
      <label className="flex cursor-pointer items-center gap-1.5">
        <input
          type="checkbox"
          checked={sound}
          onChange={(e) => {
            setSound(e.target.checked);
            setSoundEnabled(e.target.checked);
          }}
        />
        Sound
      </label>
      <button type="button" className={warmBtn2} onClick={test}>
        Test
      </button>
      {note && <span className="text-xs">{note}</span>}
    </div>
  );
}
