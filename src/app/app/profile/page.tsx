import Link from "next/link";
import { Card } from "@/components/app/ui";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { computeStreaks, getGoalSummaries, getHabits, getHistory, getPointsForDay, getToday, requireProfile } from "@/lib/data";
import { initialsOf, POINTS } from "@/lib/domain";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Profile — Steady" };

const DEFAULT_ABOUT =
  "Building a quieter morning routine and a reading habit that survives busy weeks. I work best with short blocks and a group that notices when I go missing.";

export default async function ProfilePage() {
  const me = await requireProfile();
  const today = await getToday();
  const [points, history, habits, goals, lifetimeBlocks, lifetimeTasks, extra] = await Promise.all([
    getPointsForDay(me.id, today),
    getHistory(me.id, today, 120),
    getHabits(me.id),
    getGoalSummaries(me.id, today),
    prisma.block.count({ where: { userId: me.id, done: true, hidden: false } }),
    prisma.task.count({ where: { userId: me.id, done: true } }),
    prisma.pointEvent.aggregate({ where: { userId: me.id }, _sum: { amount: true } }),
  ]);
  const streaks = computeStreaks(history, today);
  const lifetime = lifetimeBlocks * POINTS.block + lifetimeTasks * POINTS.task + (extra._sum.amount ?? 0);
  const goalsMet = goals.filter((g) => g.pct >= 100).length;
  const joined = me.createdAt.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const stats = [
    { label: "Points today", value: String(points) },
    { label: "Lifetime points", value: lifetime.toLocaleString("en-US") },
    { label: "Current streak", value: `${streaks.current}d` },
    { label: "Best streak", value: `${streaks.best}d` },
  ];

  return (
    <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-5">
      <Card className="p-6">
        <Link
          href="/app"
          className="mb-[18px] inline-block rounded-[9px] border border-soft bg-white px-3 py-[7px] text-xs font-semibold text-[oklch(0.45_0.014_80)] hover:bg-surface hover:text-[oklch(0.45_0.014_80)]"
        >
          ← Back to today
        </Link>
        <div className="flex flex-wrap items-center gap-[18px]">
          <div className="grid h-[74px] w-[74px] shrink-0 place-items-center rounded-full bg-sage text-2xl font-bold text-ink">
            {initialsOf(me.name)}
          </div>
          <div className="min-w-0">
            <h1 className="mb-[5px] text-[26px] font-bold tracking-[-0.02em]">{me.name}</h1>
            <p className="text-[13px] text-muted-2">
              Joined {joined} · {habits.length} habits · {goalsMet} goals met
            </p>
          </div>
          <form action="/auth/signout" method="post" className="ml-auto">
            <button type="submit" className="cursor-pointer rounded-[9px] border border-soft bg-white px-3 py-[7px] text-xs font-semibold text-[oklch(0.45_0.014_80)] hover:bg-surface">
              Log out
            </button>
          </form>
        </div>
        <div className="mt-[22px] grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-line bg-surface px-4 py-3.5">
              <div className="font-mono text-[22px]">{s.value}</div>
              <div className="text-xs text-muted-2">{s.label}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-2.5 text-[19px] font-bold">About</h2>
        <p className="pretty mb-5 max-w-[62ch] text-sm leading-relaxed text-[oklch(0.4_0.014_80)]">{me.about ?? DEFAULT_ABOUT}</p>
        <ProfileForm name={me.name} about={me.about ?? ""} pointsGoal={me.pointsGoal} />
      </Card>
    </div>
  );
}
