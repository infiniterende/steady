import { Card } from "@/components/app/ui";
import { HabitsTracked } from "@/components/app/HabitsTracked";
import { Heatmap } from "@/components/app/Heatmap";
import { computeStreaks, completionRate, getHabits, getHistory, heatmap } from "@/lib/data";
import type { DayKey } from "@/lib/dates";

export async function Rail({ userId, today }: { userId: string; today: DayKey }) {
  const [history, habits] = await Promise.all([getHistory(userId, today, 84), getHabits(userId)]);
  const streaks = computeStreaks(history, today);
  const rate = completionRate(history.slice(-30));

  return (
    <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-5 md:min-w-[260px] md:max-w-[360px]">
      <Card className="p-5">
        <h2 className="mb-3.5 text-[17px] font-bold">Consistency</h2>
        <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(110px,1fr))] gap-2.5">
          <div className="rounded-xl border border-line px-3.5 py-3">
            <div className="font-mono text-xl">{streaks.best}d</div>
            <div className="text-[11px] text-muted-2">Best streak</div>
          </div>
          <div className="rounded-xl border border-line px-3.5 py-3">
            <div className="font-mono text-xl">{rate}%</div>
            <div className="text-[11px] text-muted-2">30-day rate</div>
          </div>
        </div>
        <Heatmap weeks={heatmap(history)} gap={4} />
        <div className="mt-2 flex justify-between text-[10px] text-muted-3">
          <span>12 weeks ago</span>
          <span>Today</span>
        </div>
      </Card>

      <Card className="p-5">
        <HabitsTracked habits={habits.map((h) => ({ id: h.id, name: h.name, domain: h.domain, progress: h.progress, paused: h.paused }))} />
      </Card>
    </aside>
  );
}
