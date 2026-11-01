import Link from "next/link";
import { PlannerBoard } from "@/components/planner/PlannerBoard";
import { getPlannerDays, getPlannerOverdue, getPlannerRange, getToday, requireProfile } from "@/lib/data";
import { addDays, dateToKey, formatDay, isDayKey, weekdayIndex } from "@/lib/dates";

export const metadata = { title: "Planner — Steady" };

export default async function PlannerPage({ searchParams }: PageProps<"/app/planner">) {
  const me = await requireProfile();
  const today = await getToday();
  const params = await searchParams;
  const anchor = isDayKey(params.d) ? params.d : today;
  const weekStart = addDays(anchor, -weekdayIndex(anchor));
  const weekEnd = addDays(weekStart, 6);
  const isThisWeek = today >= weekStart && today <= weekEnd;

  const [rows, overdue, dayInfo] = await Promise.all([
    getPlannerRange(me.id, weekStart, weekEnd),
    isThisWeek || weekStart > today ? getPlannerOverdue(me.id, today) : Promise.resolve([]),
    getPlannerDays(me.id, weekStart, weekEnd),
  ]);
  const toItem = (r: (typeof rows)[number]) => ({
    id: r.id,
    day: dateToKey(r.date),
    kind: r.kind,
    title: r.title,
    time: r.time,
    minuteOfDay: r.minuteOfDay,
    note: r.note,
    place: r.place,
    priority: r.priority,
    done: r.done,
    remindMin: r.remindMin,
  });

  const label = `${formatDay(weekStart, { month: "long", day: "numeric" })} – ${formatDay(weekEnd, { month: "long", day: "numeric" })}`;
  const arrow = "grid h-9 w-9 place-items-center rounded-full text-lg text-[#6B645C] hover:bg-[#EFEBE4] hover:text-[#40453A]";

  return (
    <div className="-m-4 min-w-0 flex-[1_1_520px] bg-[#F7F1EB] md:-m-6">
      <PlannerBoard
        key={weekStart}
        weekStart={weekStart}
        today={today}
        items={rows.map(toItem)}
        overdue={overdue.map(toItem)}
        dayInfo={dayInfo}
        header={
          <>
            <Link href={`/app/planner?d=${addDays(weekStart, -7)}`} className={arrow} aria-label="Previous week">
              ‹
            </Link>
            <Link href={`/app/planner?d=${addDays(weekStart, 7)}`} className={arrow} aria-label="Next week">
              ›
            </Link>
            <h1 className="text-[14px] font-bold uppercase tracking-[0.02em] text-[#6B645C]">Week of {label}</h1>
            {!isThisWeek && (
              <Link href="/app/planner" className="text-xs font-semibold text-[#B45309] hover:text-[#B45309]">
                This week
              </Link>
            )}
          </>
        }
      />
    </div>
  );
}
