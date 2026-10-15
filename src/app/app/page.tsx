import Link from "next/link";
import { Card, Ring } from "@/components/app/ui";
import { Rail } from "@/components/app/Rail";
import { Timers } from "@/components/today/Timers";
import { TasksPanel } from "@/components/today/TasksPanel";
import { SchedulePanel } from "@/components/today/SchedulePanel";
import { getBlocksForDay, getPointsForDay, getTasksForDay, getToday, requireProfile } from "@/lib/data";
import { addDays, formatDay, isDayKey } from "@/lib/dates";

export const metadata = { title: "Today — Steady" };

export default async function TodayPage({ searchParams }: PageProps<"/app">) {
  const me = await requireProfile();
  const today = await getToday();
  const params = await searchParams;
  const day = isDayKey(params.d) ? params.d : today;

  const [blocks, tasks, points] = await Promise.all([
    getBlocksForDay(me.id, day),
    getTasksForDay(me.id, day),
    getPointsForDay(me.id, day),
  ]);

  const doneCount = blocks.filter((b) => b.done).length;
  const minutes = blocks.filter((b) => b.done).reduce((a, b) => a + b.minutes, 0);
  const goalPct = Math.min(100, Math.round((points / me.pointsGoal) * 100));
  const dateLabel = formatDay(day) + (day === today ? " · today" : "");
  const doneLabel = `${doneCount} of ${blocks.length} done`;
  const navBtn =
    "grid h-6 w-6 place-items-center rounded-[7px] border border-soft bg-white text-xs text-[oklch(0.45_0.014_80)] hover:bg-surface hover:text-[oklch(0.45_0.014_80)]";

  return (
    <>
      <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-5">
        <Card className="overflow-hidden">
          <div className="flex items-start justify-between gap-4 border-b border-line px-6 pb-[18px] pt-[22px]">
            <div>
              <h1 className="mb-1.5 text-[26px] font-bold tracking-[-0.02em]">{day === today ? "Today" : formatDay(day, { weekday: "long" })}</h1>
              <div className="flex items-center gap-2.5 text-[13px] text-muted">
                <span>{dateLabel}</span>
                <Link href={`/app?d=${addDays(day, -1)}`} className={navBtn} aria-label="Previous day">
                  ‹
                </Link>
                <Link href={`/app?d=${addDays(day, 1)}`} className={navBtn} aria-label="Next day">
                  ›
                </Link>
                {day !== today && (
                  <Link href="/app" className="text-xs font-semibold">
                    Back to today
                  </Link>
                )}
              </div>
            </div>
            <div className="rounded-[10px] bg-surface px-3.5 py-2 text-[13px] font-semibold">{doneLabel}</div>
          </div>

          <div className="flex flex-col gap-[18px] px-6 pb-6 pt-5">
            <Timers key={day} day={day} initial={blocks.filter((b) => !b.done).map((b) => ({ id: b.id, name: b.title, minutes: b.minutes }))} />

            <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3 pt-1">
              <Stat bg="#EEEFE6" label="Points today" labelColor="#4F5443" value={points}>
                <svg width="22" height="22" viewBox="0 0 22 22" style={{ fill: "none", stroke: "#585D48", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" }}>
                  <path d="M11 3.5l2.3 4.7 5.2.8-3.8 3.6.9 5.2L11 15.4l-4.6 2.4.9-5.2-3.8-3.6 5.2-.8z" />
                </svg>
              </Stat>
              <Stat bg="#F6E8DE" label="Minutes logged" labelColor="#6E4A34" value={minutes}>
                <svg width="22" height="22" viewBox="0 0 22 22" style={{ fill: "none", stroke: "#8A553A", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" }}>
                  <path d="M11 3.5a7.5 7.5 0 1 0 0 15a7.5 7.5 0 1 0 0-15zM11 7v4l2.8 2" />
                </svg>
              </Stat>
              <div className="flex items-center gap-3.5 rounded-2xl p-4" style={{ background: "#F1E9E1" }}>
                <Ring pct={goalPct} size={44} inset={5} color="#CB997E" track="#E8DDD3" innerBg="#F1E9E1">
                  <svg width="18" height="18" viewBox="0 0 22 22" style={{ fill: "none", stroke: "#6E5644", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" }}>
                    <path d="M4 16l5-5 3 3 6-6M13.5 8H18v4.5" />
                  </svg>
                </Ring>
                <span>
                  <span className="block font-mono text-[22px] font-medium">{goalPct}%</span>
                  <span className="block text-xs" style={{ color: "#5E4A3B" }}>
                    of daily goal
                  </span>
                </span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="px-6 pb-6 pt-[22px]">
          <TasksPanel day={day} tasks={tasks} />
        </Card>

        <Card className="px-6 pb-2 pt-[22px]">
          <SchedulePanel day={day} blocks={blocks} />
        </Card>
      </div>

      <Rail userId={me.id} name={me.name} today={today} points={points} doneToday={doneLabel.replace(" done", " today")} />
    </>
  );
}

function Stat({ bg, label, labelColor, value, children }: { bg: string; label: string; labelColor: string; value: number; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3.5 rounded-2xl p-4" style={{ background: bg }}>
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-white">{children}</span>
      <span>
        <span className="block font-mono text-[22px] font-medium">{value}</span>
        <span className="block text-xs" style={{ color: labelColor }}>
          {label}
        </span>
      </span>
    </div>
  );
}
