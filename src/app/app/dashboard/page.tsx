import Link from "next/link";
import { Bar, Card } from "@/components/app/ui";
import { Rail } from "@/components/app/Rail";
import { WeekBars } from "@/components/dashboard/WeekBars";
import { computeStreaks, getBlocksForDay, getGoalSummaries, getHabits, getHistory, getPointsForDay, getToday, requireProfile } from "@/lib/data";
import { fmtNum } from "@/lib/goals";
import { DAY_NAMES, formatDay, weekdayIndex } from "@/lib/dates";
import { DOMAIN_COLOR, DOMAIN_LABEL } from "@/lib/domain";

export const metadata = { title: "Dashboard — Steady" };

const GOAL_PALETTE = ["#B7B7A4", "#CB997E", "#DDBEA9", "#B7B7A4"];

export default async function DashboardPage() {
  const me = await requireProfile();
  const today = await getToday();

  const [blocksToday, history120, points, habits, goals] = await Promise.all([
    getBlocksForDay(me.id, today),
    getHistory(me.id, today, 120),
    getPointsForDay(me.id, today),
    getHabits(me.id),
    getGoalSummaries(me.id, today),
  ]);

  const week = history120.slice(-7);
  const weekTotal = week.reduce((a, d) => a + d.done, 0);
  const weekPlanned = week.reduce((a, d) => a + d.total, 0);
  const weekAvg = weekPlanned ? Math.round((weekTotal / weekPlanned) * 100) : 0;
  const streaks = computeStreaks(history120, today);
  const doneToday = blocksToday.filter((b) => b.done).length;

  const days = week.map((d) => ({ label: DAY_NAMES[weekdayIndex(d.day)], day: d.day, done: d.done, total: d.total, isToday: d.day === today }));

  const domains = [...new Set(habits.map((h) => h.domain))].map((d) => {
    const hs = habits.filter((h) => h.domain === d);
    const avg = Math.round(hs.reduce((a, h) => a + h.progress, 0) / (hs.length || 1));
    return { domain: d, avg, count: hs.length };
  });

  const allGoals = [
    { id: "daily", href: null, name: "Daily points", current: points, target: me.pointsGoal, unit: "pts", note: "Resets at midnight", pct: Math.min(100, Math.round((points / me.pointsGoal) * 100)) },
    ...goals.map((g) => ({ id: g.id, href: `/app/goals/${g.id}`, name: g.name, current: g.value, target: g.target, unit: g.unit, note: g.nextMilestone ? `Next: ${g.nextMilestone}` : g.note, pct: g.pct })),
  ];

  return (
    <>
      <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-5">
        <Card className="p-6">
          <h1 className="mb-1 text-[26px] font-bold tracking-[-0.02em]">Dashboard</h1>
          <p className="mb-5 text-[13px] text-muted-2">Last 7 days, ending {formatDay(today)} · today</p>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3">
            <Kpi value={`${weekTotal} blocks`} label="Completed this week" />
            <Kpi value={`${weekAvg}%`} label="Weekly follow-through" />
            <Kpi value={String(points)} label="Points today" />
            <Kpi value={`${streaks.best}d`} label="Best streak" />
          </div>
        </Card>

        <Card className="p-6">
          <WeekBars days={days} />
        </Card>

        <Card className="p-6">
          <h2 className="mb-[18px] text-[19px] font-bold">By domain</h2>
          <div className="flex flex-col gap-4">
            {domains.map((r) => (
              <div key={r.domain}>
                <div className="mb-[7px] flex items-baseline justify-between gap-2.5">
                  <span className="text-sm font-semibold">{DOMAIN_LABEL[r.domain]}</span>
                  <span className="text-xs text-muted-2">
                    {r.count} {r.count === 1 ? "habit" : "habits"} · {r.avg}%
                  </span>
                </div>
                <Bar pct={r.avg} color={DOMAIN_COLOR[r.domain]} height={10} />
              </div>
            ))}
            {domains.length === 0 && (
              <p className="text-[13px] text-muted">
                No habits yet.{" "}
                <Link href="/app/habits" className="font-semibold">
                  Add your first habit
                </Link>
                .
              </p>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-[18px] flex items-baseline justify-between gap-3">
            <h2 className="text-[19px] font-bold">Goals</h2>
            <Link href="/app/goals" className="text-xs text-muted-2 hover:text-olive">
              Top 4 of {allGoals.length}
            </Link>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-3">
            {allGoals.slice(0, 4).map((g, i) => {
              const pct = g.pct;
              return (
                <div key={g.id} className="flex flex-col gap-2.5 rounded-[14px] border border-line bg-surface p-4">
                  <div className="flex items-start justify-between gap-2.5">
                    {g.href ? (
                      <Link href={g.href} className="pretty text-sm font-semibold text-inherit hover:text-olive">
                        {g.name}
                      </Link>
                    ) : (
                      <span className="pretty text-sm font-semibold">{g.name}</span>
                    )}
                    <span
                      className="rounded-full px-[9px] py-1 text-[11px] font-semibold"
                      style={{ background: pct >= 100 ? "#E8DDD3" : "#fff", color: pct >= 100 ? "#4A4F3E" : "oklch(0.45 0.014 80)" }}
                    >
                      {pct}%
                    </span>
                  </div>
                  <div className="font-mono text-lg">
                    {fmtNum(g.current)} / {fmtNum(g.target)} {g.unit}
                  </div>
                  <Bar pct={pct} color={GOAL_PALETTE[i % 4]} track="#fff" />
                  <div className="text-xs text-muted-2">{g.note}</div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Rail userId={me.id} name={me.name} today={today} points={points} doneToday={`${doneToday} of ${blocksToday.length} today`} />
    </>
  );
}

function Kpi({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3.5">
      <div className="font-mono text-[22px]">{value}</div>
      <div className="text-xs text-muted-2">{label}</div>
    </div>
  );
}
