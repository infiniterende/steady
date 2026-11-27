import Link from "next/link";
import { Card } from "@/components/app/ui";
import { SchedulePanel } from "@/components/today/SchedulePanel";
import { WeekBoard } from "@/components/schedule/WeekBoard";
import { getBlocksForDay, getCalendarItems, getNowMinute, getToday, requireProfile, toBlockItem } from "@/lib/data";
import { addDays, formatDay, isDayKey, weekdayIndex } from "@/lib/dates";

export const metadata = { title: "Schedule — Steady" };

export default async function SchedulePage({ searchParams }: PageProps<"/app/schedule">) {
  const me = await requireProfile();
  const today = await getToday();
  const params = await searchParams;
  const day = isDayKey(params.d) ? params.d : today;
  const weekStart = addDays(day, -weekdayIndex(day));
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const [blocksByDay, items, nowMinute] = await Promise.all([Promise.all(days.map((d) => getBlocksForDay(me.id, d))), getCalendarItems(me.id, weekStart, addDays(weekStart, 6)), getNowMinute()]);
  const blockItems = blocksByDay.map((list) => list.map(toBlockItem));
  const blocks = blockItems[days.indexOf(day)];
  const itemsByDay = days.map((d) => items.filter((i) => i.day === d));
  const weekLabel = formatDay(weekStart, { month: "short", day: "numeric" });
  const navBtn =
    "grid h-[34px] w-[34px] place-items-center rounded-[10px] border border-line bg-white text-sm text-[oklch(0.45_0.014_80)] hover:bg-surface hover:text-[oklch(0.45_0.014_80)]";

  return (
    <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-5">
      <Card className="p-6">
        <div className="mb-[18px] flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="mb-1 text-[26px] font-bold tracking-[-0.02em]">Schedule</h1>
            <p className="text-[13px] text-muted-2">
              Week of {weekLabel} — pick a day to edit its blocks below
              {!days.includes(today) && (
                <>
                  {" · "}
                  <Link href="/app/schedule" className="font-semibold">
                    This week
                  </Link>
                </>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href={`/app/schedule?d=${addDays(weekStart, -7)}`} className={navBtn} aria-label="Previous week">
              ‹
            </Link>
            <Link href={`/app/schedule?d=${addDays(weekStart, 7)}`} className={navBtn} aria-label="Next week">
              ›
            </Link>
          </div>
        </div>
        <WeekBoard days={days} blocksByDay={blockItems} itemsByDay={itemsByDay} today={today} selected={day} nowMinute={nowMinute} />
      </Card>

      <Card className="px-6 pb-2 pt-[22px]">
        <SchedulePanel
          key={day}
          day={day}
          blocks={blocks}
          compact
          title={formatDay(day, { weekday: "long", month: "short", day: "numeric" }) + (day === today ? " · today" : "")}
        />
      </Card>
    </div>
  );
}
