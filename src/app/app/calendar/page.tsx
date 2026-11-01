import { Card } from "@/components/app/ui";
import { CalendarBoard, type CalendarCell } from "@/components/calendar/CalendarBoard";
import { UpcomingWeek } from "@/components/calendar/UpcomingWeek";
import { Reminders } from "@/components/calendar/Reminders";
import { NotificationSettings } from "@/components/calendar/NotificationSettings";
import { getCalendarItems, getHabits, getMonthStats, getReminders, getToday, requireProfile } from "@/lib/data";
import { addDays, isDayKey, weekdayIndex } from "@/lib/dates";

export const metadata = { title: "Calendar — Steady" };

function parseMonth(m: unknown, today: string): { year: number; month: number } {
  const match = typeof m === "string" && m.match(/^(\d{4})-(\d{2})$/);
  const [y, mo] = match ? [Number(match[1]), Number(match[2])] : [Number(today.slice(0, 4)), Number(today.slice(5, 7))];
  return mo >= 1 && mo <= 12 ? { year: y, month: mo } : { year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) };
}

const key = (y: number, m: number) => `${y}-${String(m).padStart(2, "0")}`;

export default async function CalendarPage({ searchParams }: PageProps<"/app/calendar">) {
  const me = await requireProfile();
  const today = await getToday();
  const params = await searchParams;
  const picked = isDayKey(params.d) ? params.d : null;
  const { year, month } = parseMonth(params.m ?? picked?.slice(0, 7), today);
  const monthStart = `${key(year, month)}-01`;
  const monthEnd = addDays(`${month === 12 ? key(year + 1, 1) : key(year, month + 1)}-01`, -1);

  const [stats, reminders, habits, monthItems, weekItems] = await Promise.all([
    getMonthStats(me.id, year, month),
    getReminders(me.id),
    getHabits(me.id),
    getCalendarItems(me.id, monthStart, monthEnd),
    getCalendarItems(me.id, today, addDays(today, 6)),
  ]);

  const cells: CalendarCell[] = stats.map((d) => ({ day: d.day, num: Number(d.day.slice(8, 10)), done: d.done, total: d.total, isToday: d.day === today }));
  const lead = weekdayIndex(cells[0].day);
  const monthLabel = new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const prev = month === 1 ? key(year - 1, 12) : key(year, month - 1);
  const next = month === 12 ? key(year + 1, 1) : key(year, month + 1);
  const initialSelected = picked && picked.startsWith(key(year, month)) ? picked : today.startsWith(key(year, month)) ? today : cells[0].day;

  return (
    <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-5">
      <Card className="p-6">
        <CalendarBoard
          key={key(year, month)}
          monthLabel={monthLabel}
          cells={cells}
          lead={lead}
          prevHref={`/app/calendar?m=${prev}`}
          nextHref={`/app/calendar?m=${next}`}
          initialSelected={initialSelected}
          items={monthItems}
          today={today}
        />
      </Card>

      <Card className="p-6">
        <UpcomingWeek items={weekItems} today={today} />
      </Card>

      <Card className="p-6">
        <Reminders
          reminders={reminders.map((r) => ({ id: r.id, habit: r.habit.name, time: r.time, channel: r.channel === "PUSH" ? "Push" : "Email", repeat: r.repeat, on: r.on }))}
          habits={habits.filter((h) => !h.paused).map((h) => ({ id: h.id, name: h.name }))}
        />
      </Card>

      <Card className="p-6">
        <NotificationSettings settings={{ quietHours: me.quietHours, weeklyDigest: me.weeklyDigest, blockReminders: me.blockReminders, reminderLead: me.reminderLead }} />
      </Card>
    </div>
  );
}
