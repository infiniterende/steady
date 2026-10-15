import Link from "next/link";
import { notFound } from "next/navigation";
import { Bar, Card, Ring } from "@/components/app/ui";
import { GoalLog } from "@/components/goals/GoalLog";
import { Milestones } from "@/components/goals/Milestones";
import { ProgressChart } from "@/components/goals/ProgressChart";
import { getGoalDetail, getToday, requireProfile } from "@/lib/data";
import { formatDay } from "@/lib/dates";
import { direction, fmtNum, latestValue, paceNote, pluralUnit, progressPct, remaining } from "@/lib/goals";

export const metadata = { title: "Goal — Steady" };

export default async function GoalPage(props: PageProps<"/app/goals/[id]">) {
  const me = await requireProfile();
  const today = await getToday();
  const { id } = await props.params;
  const goal = await getGoalDetail(me.id, id);
  if (!goal) notFound();

  const pct = progressPct(goal, goal.entries);
  const value = latestValue(goal, goal.entries);
  const left = remaining(goal, goal.entries);
  const moved = goal.kind === "MEASURE" ? Math.abs(value - goal.start) : value;
  const dir = direction(goal);
  const todayEntry = goal.entries.find((e) => e.date === today);
  const lastEntry = goal.entries[goal.entries.length - 1];
  const next = goal.milestones.find((m) => m.isNext);

  const stats = [
    { label: goal.kind === "MEASURE" ? "Latest" : "So far", value: `${fmtNum(value)} ${pluralUnit(value, goal.unit)}` },
    { label: goal.kind === "MEASURE" ? (dir === -1 ? "Lost so far" : "Gained so far") : "Logged days", value: goal.kind === "MEASURE" ? `${fmtNum(moved)} ${goal.unit}` : String(goal.entries.length) },
    { label: "To go", value: `${fmtNum(left)} ${pluralUnit(left, goal.unit)}` },
    { label: "Next milestone", value: next ? next.label : pct >= 100 ? "Done" : "None" },
  ];

  return (
    <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-5">
      <Card className="p-6">
        <Link
          href="/app/goals"
          className="mb-[18px] inline-block rounded-[9px] border border-soft bg-white px-3 py-[7px] text-xs font-semibold text-[oklch(0.45_0.014_80)] hover:bg-surface hover:text-[oklch(0.45_0.014_80)]"
        >
          ← All goals
        </Link>
        <div className="flex flex-wrap items-center gap-[18px]">
          <Ring pct={pct} size={74} inset={8} color="#CB997E" track="#F4EDE6">
            <span className="font-mono text-[15px]">{pct}%</span>
          </Ring>
          <div className="min-w-0 flex-1">
            <h1 className="mb-1 text-[26px] font-bold tracking-[-0.02em]">{goal.name}</h1>
            <p className="text-[13px] text-muted-2">
              {goal.kind === "MEASURE" ? `${fmtNum(goal.start)} → ${fmtNum(goal.target)} ${goal.unit}` : `${fmtNum(goal.target)} ${goal.unit}`}
              {goal.deadline ? ` · by ${formatDay(goal.deadline, { month: "long", day: "numeric" })}` : ` · ${goal.horizon}`}
              {" · "}
              {paceNote(goal, goal.entries, goal.deadline, today)}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <Bar pct={pct} color="#CB997E" height={10} />
        </div>
        <div className="mt-[18px] grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-line bg-surface px-4 py-3.5">
              <div className="truncate font-mono text-[20px]">{s.value}</div>
              <div className="text-xs text-muted-2">{s.label}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="text-[19px] font-bold">Progress</h2>
          <span className="text-xs text-muted-2">
            {lastEntry ? `Last logged ${formatDay(lastEntry.date, { month: "short", day: "numeric" })}` : "No entries yet"}
          </span>
        </div>
        <ProgressChart
          entries={goal.entries}
          start={goal.kind === "MEASURE" ? goal.start : 0}
          target={goal.target}
          unit={goal.unit}
          milestones={goal.milestones.map((m) => ({ value: m.value, achieved: m.achieved }))}
        />
      </Card>

      <Card className="p-6">
        <GoalLog
          goalId={goal.id}
          kind={goal.kind}
          unit={goal.unit}
          today={today}
          todayValue={todayEntry ? todayEntry.value : null}
          entries={goal.entries}
        />
      </Card>

      <Card className="p-6">
        <Milestones goalId={goal.id} unit={goal.unit} milestones={goal.milestones} />
      </Card>
    </div>
  );
}
