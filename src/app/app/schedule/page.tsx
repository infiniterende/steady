import Link from "next/link";
import { Card } from "@/components/app/ui";
import { SchedulePanel } from "@/components/today/SchedulePanel";
import { DayTimeline } from "@/components/schedule/DayTimeline";
import { getBlocksForDay, getCalendarItems, getNowMinute, getToday, requireProfile, toBlockItem } from "@/lib/data";
import { addDays, DAY_NAMES, formatDay, isDayKey, weekdayIndex } from "@/lib/dates";

export const metadata = { title: "Schedule — Steady" };

export default async function SchedulePage({ searchParams }: PageProps<"/app/schedule">) {
  const me = await requireProfile();
  const today = await getToday();
  const params = await searchParams;
  const day = isDayKey(params.d) ? params.d : today;
  const weekStart = addDays(day, -weekdayIndex(day));
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const [blocksByDay, items, nowMinute] = await Promise.all([Promise.all(days.map((d) => getBlocksForDay(me.id, d))), getCalendarItems(me.id, day, day), getNowMinute()]);
  const blocks = blocksByDay[days.indexOf(day)].map(toBlockItem);
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
              Week of {weekLabel} — pick a day to see its blocks
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
        <div className="grid grid-cols-7 gap-2">
          {days.map((d, i) => {
            const on = d === day;
            const n = blocksByDay[i].length;
            const done = blocksByDay[i].filter((b) => b.done).length;
            return (
              <Link
                key={d}
                href={`/app/schedule?d=${d}`}
                aria-current={on ? "date" : undefined}
                className="min-w-0 rounded-xl px-1 py-3 text-center text-inherit hover:bg-surface hover:text-inherit sm:px-2.5 sm:text-left"
                style={{
                  border: `1px solid ${on ? "#6B705C" : "#E8DDD3"}`,
                  background: on ? "#F4EDE6" : "#fff",
                  boxShadow: d === today ? "inset 0 0 0 1px #DDBEA9" : undefined,
                }}
              >
                <span className="block text-xs font-semibold">{DAY_NAMES[i]}</span>
                <span className="my-0.5 mb-[3px] block font-mono text-[17px]">{Number(d.slice(8, 10))}</span>
                <span className="block text-[11px] text-muted-2">
                  <span className="sm:hidden">{n === 0 ? "–" : `${done}/${n}`}</span>
                  <span className="hidden sm:inline">{n === 0 ? "no blocks" : done ? `${done} of ${n} done` : `${n} ${n === 1 ? "block" : "blocks"}`}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </Card>

      <Card className="p-6">
        <DayTimeline key={day} day={day} blocks={blocks} items={items} isToday={day === today} nowMinute={nowMinute} />
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
