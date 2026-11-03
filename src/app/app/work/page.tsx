import Link from "next/link";
import { WorkBoard } from "@/components/work/WorkBoard";
import { getToday, getWorkBoard, requireProfile } from "@/lib/data";
import { addDays, formatDay, isDayKey } from "@/lib/dates";

export const metadata = { title: "Work — Steady" };

export default async function WorkPage({ searchParams }: PageProps<"/app/work">) {
  const me = await requireProfile();
  const today = await getToday();
  const params = await searchParams;
  const day = isDayKey(params.d) ? params.d : today;
  const board = await getWorkBoard(me.id, day);

  const arrow = "grid h-9 w-9 place-items-center rounded-full border border-line bg-white text-lg text-muted hover:bg-surface hover:text-muted";
  return (
    <div className="min-w-0 flex-[1_1_520px]">
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <Link href={`/app/work?d=${addDays(day, -1)}`} className={arrow} aria-label="Previous day">
          ‹
        </Link>
        <Link href={`/app/work?d=${addDays(day, 1)}`} className={arrow} aria-label="Next day">
          ›
        </Link>
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.02em]">Work</h1>
          <p className="text-[13px] text-muted-2">
            {formatDay(day, { weekday: "long", month: "long", day: "numeric" })}
            {day === today ? " · today" : ""}
          </p>
        </div>
        {day !== today && (
          <Link href="/app/work" className="ml-1 text-xs font-semibold">
            Back to today
          </Link>
        )}
      </div>
      <WorkBoard key={day} day={day} today={today} {...board} />
    </div>
  );
}
