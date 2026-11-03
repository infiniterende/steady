"use client";

import { useState, useTransition } from "react";
import {
  addWorkBucket,
  addWorkMilestone,
  addWorkTask,
  planWorkTask,
  removeWorkBucket,
  removeWorkMilestone,
  removeWorkTask,
  setWorkStatus,
  updateWorkTask,
} from "@/app/app/actions";
import { ErrorText, btnPrimary, btnSecondary, inputBase } from "@/components/app/ui";
import { TINTS, TINT_KEYS, resolveTint } from "@/lib/planner";
import { POINT_OPTIONS, STATUS_LABEL, WORK_STATUSES, type WorkStatusKey } from "@/lib/work";
import { formatDay } from "@/lib/dates";

type Task = { id: string; title: string; status: WorkStatusKey; day: string | null; points: number | null; note: string | null; bucketId: string | null; milestoneId: string | null };
type Bucket = { id: string; name: string; tint: string };
type Milestone = { id: string; title: string; due: string | null; total: number; done: number };

const card = "rounded-[18px] border border-line bg-white";
const tintOf = (b?: Bucket) => TINTS[resolveTint(b?.tint) ?? "sage"];
const iconBtn = "grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg border-0 bg-transparent text-[15px] text-muted-3 hover:bg-surface hover:text-[#40453A] disabled:opacity-40";

export function WorkBoard({ day, today, tasks, buckets, milestones }: { day: string; today: string; tasks: Task[]; buckets: Bucket[]; milestones: Milestone[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [bucketFilter, setBucketFilter] = useState<string | null>(null);
  const [milestoneFilter, setMilestoneFilter] = useState<string | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      const res = await fn();
      setError(res.ok ? "" : (res.error ?? "Something went wrong."));
    });

  const matches = (t: Task) => (!bucketFilter || t.bucketId === bucketFilter) && (!milestoneFilter || t.milestoneId === milestoneFilter);
  const plannedAll = tasks.filter((t) => t.day === day);
  const planned = plannedAll.filter(matches);
  const backlog = tasks.filter((t) => t.day === null && matches(t));
  const carry = tasks.filter((t) => t.day !== null && t.day < day && matches(t));

  const pts = (list: Task[]) => list.reduce((n, t) => n + (t.points ?? 0), 0);
  const donePts = pts(plannedAll.filter((t) => t.status === "DONE"));
  const doneCount = plannedAll.filter((t) => t.status === "DONE").length;

  const bucketById = new Map(buckets.map((b) => [b.id, b]));
  const milestoneById = new Map(milestones.map((m) => [m.id, m]));
  const actions = { run, pending, day, buckets, milestones, bucketById, milestoneById };

  return (
    <div className="flex flex-wrap items-start gap-5">
      <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-5">
        <AddTask {...actions} />

        {error && <ErrorText>{error}</ErrorText>}

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-muted">Showing</span>
          <Chip on={!bucketFilter && !milestoneFilter} onClick={() => { setBucketFilter(null); setMilestoneFilter(null); }}>
            Everything
          </Chip>
          {buckets.map((b) => (
            <Chip key={b.id} on={bucketFilter === b.id} onClick={() => setBucketFilter(bucketFilter === b.id ? null : b.id)} dot={tintOf(b).accent}>
              {b.name}
            </Chip>
          ))}
          {milestoneFilter && (
            <Chip on onClick={() => setMilestoneFilter(null)}>
              ⚑ {milestoneById.get(milestoneFilter)?.title} ×
            </Chip>
          )}
          <span className="ml-auto text-muted-2">
            {plannedAll.length ? `${doneCount} of ${plannedAll.length} done` : "Nothing planned"}
            {pts(plannedAll) ? ` · ${donePts}/${pts(plannedAll)} pts` : ""}
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {WORK_STATUSES.map((s) => {
            const col = planned.filter((t) => t.status === s);
            return (
              <section key={s} className="flex min-h-[120px] flex-col gap-2 rounded-[16px] bg-[#F4EDE6]/60 p-2.5">
                <h2 className="flex items-center justify-between px-1.5 pt-1 text-[12px] font-bold uppercase tracking-[0.08em] text-muted">
                  {STATUS_LABEL[s]}
                  <span className="font-mono text-[11px] font-medium text-muted-2">{col.length}</span>
                </h2>
                {col.map((t) => (
                  <TaskCard key={t.id} task={t} {...actions} />
                ))}
                {!col.length && <p className="px-1.5 py-3 text-xs text-muted-3">{s === "TODO" ? "Plan something from the backlog, or add a task above." : s === "DOING" ? "Nothing in progress." : "Nothing finished yet."}</p>}
              </section>
            );
          })}
        </div>

        {carry.length > 0 && (
          <section className={`${card} p-4`}>
            <h2 className="mb-2 text-sm font-semibold">Unfinished from earlier days</h2>
            <div className="flex flex-col gap-2">
              {carry.map((t) => (
                <TaskCard key={t.id} task={t} {...actions} carry />
              ))}
            </div>
          </section>
        )}

        <section className={`${card} p-4`}>
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">Backlog</h2>
            <span className="text-xs text-muted-2">{backlog.length} {backlog.length === 1 ? "task" : "tasks"} not planned yet</span>
          </div>
          <div className="flex flex-col gap-2">
            {backlog.map((t) => (
              <TaskCard key={t.id} task={t} {...actions} backlog />
            ))}
            {!backlog.length && <p className="text-xs text-muted-3">Park work here when it isn&apos;t for today. Add a task above and choose &ldquo;Backlog&rdquo;.</p>}
          </div>
        </section>
      </div>

      <aside className="flex min-w-0 flex-[1_1_280px] flex-col gap-5 md:max-w-[340px]">
        <Milestones {...actions} activeId={milestoneFilter} onPick={(id) => setMilestoneFilter(milestoneFilter === id ? null : id)} today={today} />
        <Buckets {...actions} />
      </aside>
    </div>
  );
}

type Shared = {
  run: (fn: () => Promise<{ ok: boolean; error?: string }>) => void;
  pending: boolean;
  day: string;
  buckets: Bucket[];
  milestones: Milestone[];
  bucketById: Map<string, Bucket>;
  milestoneById: Map<string, Milestone>;
};

function Chip({ on, onClick, dot, children }: { on: boolean; onClick: () => void; dot?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold"
      style={{ borderColor: on ? "#6B705C" : "#DDBEA9", background: on ? "#6B705C" : "#fff", color: on ? "#fff" : "#40453A" }}
    >
      {dot && <span className="h-2 w-2 rounded-full" style={{ background: on ? "#fff" : dot }} />}
      {children}
    </button>
  );
}

function PointPicker({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Size in points">
      {POINT_OPTIONS.map((p) => (
        <button
          key={p}
          type="button"
          aria-pressed={value === p}
          onClick={() => onChange(value === p ? null : p)}
          className="h-8 min-w-8 cursor-pointer rounded-full border px-2 font-mono text-xs font-semibold"
          style={{ borderColor: value === p ? "#6B705C" : "#DDBEA9", background: value === p ? "#6B705C" : "#fff", color: value === p ? "#fff" : "#40453A" }}
        >
          {p}
        </button>
      ))}
    </div>
  );
}

function AddTask({ run, pending, day, buckets, milestones }: Shared) {
  const [title, setTitle] = useState("");
  const [points, setPoints] = useState<number | null>(null);
  const [bucketId, setBucketId] = useState("");
  const [milestoneId, setMilestoneId] = useState("");
  const submit = (target: string | null) => {
    if (!title.trim()) return;
    run(async () => {
      const res = await addWorkTask({ title, day: target, points, bucketId: bucketId || null, milestoneId: milestoneId || null });
      if (res.ok) setTitle("");
      return res;
    });
  };
  return (
    <section className={`${card} flex flex-col gap-3 p-4`}>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit(day)}
        placeholder="What needs doing?"
        aria-label="New task"
        maxLength={140}
        className={inputBase}
      />
      <div className="flex flex-wrap items-center gap-2">
        <select value={bucketId} onChange={(e) => setBucketId(e.target.value)} aria-label="Bucket" className={inputBase}>
          <option value="">No bucket</option>
          {buckets.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <select value={milestoneId} onChange={(e) => setMilestoneId(e.target.value)} aria-label="Milestone" className={inputBase}>
          <option value="">No milestone</option>
          {milestones.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title}
            </option>
          ))}
        </select>
        <PointPicker value={points} onChange={setPoints} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={pending || !title.trim()} onClick={() => submit(day)} className={btnPrimary}>
          Add to {formatDay(day, { weekday: "short", month: "short", day: "numeric" })}
        </button>
        <button type="button" disabled={pending || !title.trim()} onClick={() => submit(null)} className={btnSecondary}>
          Add to backlog
        </button>
      </div>
    </section>
  );
}

function TaskCard({ task: t, run, pending, day, buckets, milestones, bucketById, milestoneById, backlog, carry }: Shared & { task: Task; backlog?: boolean; carry?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(t.title);
  const [points, setPoints] = useState<number | null>(t.points);
  const [bucketId, setBucketId] = useState(t.bucketId ?? "");
  const [milestoneId, setMilestoneId] = useState(t.milestoneId ?? "");
  const bucket = t.bucketId ? bucketById.get(t.bucketId) : undefined;
  const milestone = t.milestoneId ? milestoneById.get(t.milestoneId) : undefined;
  const tint = tintOf(bucket);
  const idx = WORK_STATUSES.indexOf(t.status);

  if (editing) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-soft bg-white p-3">
        <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} aria-label="Task name" className={inputBase} />
        <div className="flex flex-wrap gap-2">
          <select value={bucketId} onChange={(e) => setBucketId(e.target.value)} aria-label="Bucket" className={inputBase}>
            <option value="">No bucket</option>
            {buckets.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <select value={milestoneId} onChange={(e) => setMilestoneId(e.target.value)} aria-label="Milestone" className={inputBase}>
            <option value="">No milestone</option>
            {milestones.map((m) => (
              <option key={m.id} value={m.id}>{m.title}</option>
            ))}
          </select>
        </div>
        <PointPicker value={points} onChange={setPoints} />
        <div className="flex gap-2">
          <button
            type="button"
            disabled={pending}
            className={btnPrimary}
            onClick={() =>
              run(async () => {
                const res = await updateWorkTask(t.id, { title, points, bucketId: bucketId || null, milestoneId: milestoneId || null, note: t.note ?? "" });
                if (res.ok) setEditing(false);
                return res;
              })
            }
          >
            Save
          </button>
          <button type="button" className={btnSecondary} onClick={() => setEditing(false)}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-line bg-white p-3" style={{ borderLeft: `4px solid ${tint.accent}`, opacity: t.status === "DONE" ? 0.7 : 1 }}>
      <div className="flex items-start gap-2">
        <span className="min-w-0 flex-1 text-[13px] font-semibold leading-snug" style={{ textDecoration: t.status === "DONE" ? "line-through" : undefined }}>
          {t.title}
        </span>
        {t.points !== null && <span className="rounded-full bg-surface px-2 py-0.5 font-mono text-[11px] text-muted">{t.points}</span>}
      </div>
      {(bucket || milestone || carry) && (
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          {bucket && (
            <span className="rounded-full px-2 py-0.5 font-semibold" style={{ background: tint.bg, color: tint.accent }}>
              {bucket.name}
            </span>
          )}
          {milestone && <span className="text-muted-2">⚑ {milestone.title}</span>}
          {carry && t.day && <span className="text-muted-2">from {formatDay(t.day, { month: "short", day: "numeric" })}</span>}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-0.5">
        {backlog || carry ? (
          <button type="button" disabled={pending} onClick={() => run(() => planWorkTask(t.id, day))} className={btnSecondary}>
            {backlog ? "Plan for this day" : "Move to this day"}
          </button>
        ) : (
          <>
            <button type="button" aria-label="Move back" title="Move back" disabled={pending || idx === 0} onClick={() => run(() => setWorkStatus(t.id, WORK_STATUSES[idx - 1]))} className={iconBtn}>
              ‹
            </button>
            <button type="button" aria-label="Move forward" title="Move forward" disabled={pending || idx === WORK_STATUSES.length - 1} onClick={() => run(() => setWorkStatus(t.id, WORK_STATUSES[idx + 1]))} className={iconBtn}>
              ›
            </button>
            <button type="button" title="Send back to the backlog" disabled={pending} onClick={() => run(() => planWorkTask(t.id, null))} className="ml-1 h-8 cursor-pointer rounded-lg border-0 bg-transparent px-2 text-[11px] font-semibold text-muted-3 hover:bg-surface hover:text-[#40453A] disabled:opacity-40">
              Backlog
            </button>
          </>
        )}
        <span className="ml-auto" />
        <button type="button" aria-label="Edit task" title="Edit" onClick={() => setEditing(true)} className={iconBtn}>
          ✎
        </button>
        <button type="button" aria-label="Delete task" title="Delete" disabled={pending} onClick={() => run(() => removeWorkTask(t.id))} className={`${iconBtn} hover:text-[#A8452E]`}>
          ×
        </button>
      </div>
    </div>
  );
}

function Milestones({ run, pending, milestones, activeId, onPick, today }: Shared & { activeId: string | null; onPick: (id: string) => void; today: string }) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  return (
    <section className={`${card} p-4`}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Milestones</h2>
        <button type="button" className={btnSecondary} onClick={() => setAdding((v) => !v)}>
          {adding ? "Close" : "+ Milestone"}
        </button>
      </div>
      {adding && (
        <div className="mb-3 flex flex-col gap-2 rounded-xl border border-soft p-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Launch beta" aria-label="Milestone name" maxLength={80} className={inputBase} />
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} aria-label="Due date" className={inputBase} />
          <button
            type="button"
            disabled={pending || !title.trim()}
            className={btnPrimary}
            onClick={() =>
              run(async () => {
                const res = await addWorkMilestone({ title, due });
                if (res.ok) {
                  setTitle("");
                  setDue("");
                  setAdding(false);
                }
                return res;
              })
            }
          >
            Add milestone
          </button>
        </div>
      )}
      <div className="flex flex-col gap-3">
        {milestones.map((m) => {
          const pct = m.total ? Math.round((m.done / m.total) * 100) : 0;
          const late = m.due !== null && m.due < today && m.done < m.total;
          return (
            <div key={m.id} className="flex items-start gap-1">
              <button type="button" onClick={() => onPick(m.id)} aria-pressed={activeId === m.id} className="min-w-0 flex-1 cursor-pointer rounded-lg border-0 bg-transparent p-1 text-left" style={{ background: activeId === m.id ? "#F4EDE6" : "transparent" }}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[13px] font-semibold">⚑ {m.title}</span>
                  <span className="shrink-0 font-mono text-[11px] text-muted-2">
                    {m.done}/{m.total}
                  </span>
                </div>
                <div className="my-1.5 h-1.5 overflow-hidden rounded-full bg-[#F4EDE6]">
                  <div className="h-full rounded-full bg-olive" style={{ width: `${pct}%` }} />
                </div>
                <div className="text-[11px]" style={{ color: late ? "#A8452E" : "#8A8473" }}>
                  {m.due ? `${late ? "Overdue · " : "Due "}${formatDay(m.due, { month: "short", day: "numeric" })}` : "No due date"}
                </div>
              </button>
              <button type="button" aria-label={`Delete milestone ${m.title}`} title="Delete milestone (tasks stay)" disabled={pending} onClick={() => run(() => removeWorkMilestone(m.id))} className={`${iconBtn} hover:text-[#A8452E]`}>
                ×
              </button>
            </div>
          );
        })}
        {!milestones.length && !adding && <p className="text-xs text-muted-3">Milestones are bigger goals. Tag tasks with one to see progress.</p>}
      </div>
    </section>
  );
}

function Buckets({ run, pending, buckets }: Shared) {
  const [name, setName] = useState("");
  const [tint, setTint] = useState<string>(TINT_KEYS[0]);
  return (
    <section className={`${card} p-4`}>
      <h2 className="mb-3 text-sm font-semibold">Buckets</h2>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {buckets.map((b) => (
          <span key={b.id} className="inline-flex items-center gap-1 rounded-full py-0.5 pl-3 pr-1 text-xs font-semibold" style={{ background: tintOf(b).bg, color: tintOf(b).accent }}>
            {b.name}
            <button type="button" aria-label={`Delete bucket ${b.name}`} title="Delete bucket (tasks stay)" disabled={pending} onClick={() => run(() => removeWorkBucket(b.id))} className="grid h-6 w-6 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-[13px] hover:bg-white/60" style={{ color: tintOf(b).accent }}>
              ×
            </button>
          </span>
        ))}
        {!buckets.length && <p className="text-xs text-muted-3">Buckets sort your work into streams, such as Design, Build or Admin.</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && name.trim() && run(async () => { const r = await addWorkBucket({ name, tint }); if (r.ok) setName(""); return r; })} placeholder="New bucket" aria-label="Bucket name" maxLength={30} className={`${inputBase} flex-1`} />
        <div className="flex gap-1" role="group" aria-label="Bucket colour">
          {TINT_KEYS.map((k) => (
            <button key={k} type="button" aria-label={k} aria-pressed={tint === k} onClick={() => setTint(k)} className="h-7 w-7 cursor-pointer rounded-full border-2" style={{ background: TINTS[k].bg, borderColor: tint === k ? TINTS[k].accent : "transparent" }} />
          ))}
        </div>
        <button type="button" disabled={pending || !name.trim()} className={btnPrimary} onClick={() => run(async () => { const r = await addWorkBucket({ name, tint }); if (r.ok) setName(""); return r; })}>
          Add
        </button>
      </div>
    </section>
  );
}
