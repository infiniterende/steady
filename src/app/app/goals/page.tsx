import { GoalsList } from "@/components/goals/GoalsList";
import { getGoalSummaries, getPointsForDay, getToday, requireProfile } from "@/lib/data";

export const metadata = { title: "Goals — Steady" };

export default async function GoalsPage() {
  const me = await requireProfile();
  const today = await getToday();
  const [goals, points] = await Promise.all([getGoalSummaries(me.id, today), getPointsForDay(me.id, today)]);

  return (
    <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-5">
      <GoalsList
        today={today}
        goals={[
          {
            id: "daily",
            name: "Daily points",
            kind: "DERIVED",
            value: points,
            target: me.pointsGoal,
            unit: "pts",
            horizon: "Today",
            note: "Resets at midnight",
            pct: Math.min(100, Math.round((points / me.pointsGoal) * 100)),
            step: 0,
            nextMilestone: null,
            milestonesHit: 0,
            milestoneCount: 0,
          },
          ...goals.map((g) => ({
            id: g.id,
            name: g.name,
            kind: g.kind,
            value: g.value,
            target: g.target,
            unit: g.unit,
            horizon: g.horizon,
            note: g.note,
            pct: g.pct,
            step: g.step,
            nextMilestone: g.nextMilestone,
            milestonesHit: g.milestonesHit,
            milestoneCount: g.milestoneCount,
          })),
        ]}
      />
    </div>
  );
}
