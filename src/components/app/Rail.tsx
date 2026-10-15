import { Card } from "@/components/app/ui";
import { HabitsTracked } from "@/components/app/HabitsTracked";
import { Heatmap } from "@/components/app/Heatmap";
import { computeStreaks, completionRate, getHabits, getHistory, heatmap } from "@/lib/data";
import { initialsOf } from "@/lib/domain";
import type { DayKey } from "@/lib/dates";

export const PEERS = [
  { name: "Leslie Livingston", detail: "31-day streak", points: 264 },
  { name: "Micheal Gough", detail: "18-day streak", points: 201 },
  { name: "Bonnie Green", detail: "9-day streak", points: 176 },
];

export async function Rail({ userId, name, today, points, doneToday }: { userId: string; name: string; today: DayKey; points: number; doneToday: string }) {
  const [history, habits] = await Promise.all([getHistory(userId, today, 84), getHabits(userId)]);
  const streaks = computeStreaks(history, today);
  const rate = completionRate(history.slice(-30));
  const peers = [{ name, detail: `You · ${doneToday}`, points, you: true }, ...PEERS].sort((a, b) => b.points - a.points);

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

      <Card className="p-5">
        <div className="mb-3.5 flex items-center justify-between">
          <h2 className="text-[17px] font-bold">Accountability group</h2>
          <span className="text-xs text-muted">Week 7</span>
        </div>
        <div className="flex flex-col gap-1">
          {peers.map((p, i) => (
            <div
              key={p.name}
              className="flex items-center gap-2.5 rounded-[10px] px-2.5 py-[9px]"
              style={{ background: "you" in p && p.you ? "#F4EDE6" : "transparent" }}
            >
              <span className="w-4 font-mono text-xs text-muted">{i + 1}</span>
              <span
                className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full text-[11px] font-semibold"
                style={{
                  color: "you" in p && p.you ? "#40453A" : "oklch(0.45 0.014 80)",
                  background: "you" in p && p.you ? "#DDBEA9" : "#E8DDD3",
                }}
              >
                {initialsOf(p.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{p.name}</span>
                <span className="block text-xs text-muted-2">{p.detail}</span>
              </span>
              <span className="font-mono text-[13px]">{p.points}</span>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="mt-3.5 w-full cursor-pointer rounded-[10px] border border-soft bg-white px-2.5 py-2.5 text-[13px] font-semibold text-[oklch(0.4_0.014_80)] hover:bg-surface"
        >
          Nudge the group
        </button>
      </Card>
    </aside>
  );
}
