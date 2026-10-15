import { Card } from "@/components/app/ui";
import { HabitsList } from "@/components/habits/HabitsList";
import { getHabits, getHabitStreaks, getToday, requireProfile } from "@/lib/data";

export const metadata = { title: "Habits — Steady" };

export default async function HabitsPage() {
  const me = await requireProfile();
  const today = await getToday();
  const [habits, streaks] = await Promise.all([getHabits(me.id), getHabitStreaks(me.id, today)]);

  return (
    <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-5">
      <Card className="p-6">
        <HabitsList
          habits={habits.map((h) => ({
            id: h.id,
            name: h.name,
            domain: h.domain,
            cadence: h.cadence,
            time: h.time,
            minutes: h.minutes,
            progress: h.progress,
            paused: h.paused,
            streak: streaks.get(h.id)?.current ?? 0,
            best: streaks.get(h.id)?.best ?? 0,
          }))}
        />
      </Card>
    </div>
  );
}
