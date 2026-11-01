import Link from "next/link";
import { Sidebar, MobileNav } from "@/components/app/Sidebar";
import { TimezoneSync } from "@/components/app/TimezoneSync";
import { ReminderNotifier } from "@/components/app/ReminderNotifier";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { PlannerNotifier } from "@/components/planner/PlannerNotifier";
import { requireProfile, getToday, getHistory, computeStreaks, getCalendarItems, getPlannerReminders } from "@/lib/data";
import { initialsOf } from "@/lib/domain";

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const me = await requireProfile();
  const today = await getToday();
  const [history, todayItems, plannerReminders] = await Promise.all([
    getHistory(me.id, today, 120),
    getCalendarItems(me.id, today, today),
    getPlannerReminders(me.id, today),
  ]);
  const streak = computeStreaks(history, today);
  const due = todayItems
    .filter((i) => (i.kind === "REMINDER" || i.kind === "HABIT_REMINDER" || i.kind === "AUTO_REMINDER") && i.minuteOfDay !== null)
    .map((i) => ({ id: i.id, minuteOfDay: i.minuteOfDay!, title: i.kind === "AUTO_REMINDER" ? `${i.title} ${i.note}` : i.title, note: i.kind === "AUTO_REMINDER" ? "Heads-up" : i.kind === "HABIT_REMINDER" ? "Habit reminder" : i.note ?? "Reminder", kind: i.kind }));

  return (
    <div className="app-theme flex min-h-screen flex-col">
      <TimezoneSync />
      <PlannerNotifier reminders={plannerReminders} />
      <ReminderNotifier reminders={due} quietHours={me.quietHours} />
      <header className="flex items-center justify-between gap-6 border-b border-line bg-white px-5 py-3.5 md:px-7">
        <Link href="/app" className="flex items-center gap-3 text-inherit hover:text-inherit">
          <div className="grid h-[30px] w-[30px] place-items-center rounded-[9px] bg-olive text-sm font-bold tracking-[-0.02em] text-white">
            st
          </div>
          <div className="flex flex-col leading-[1.1]">
            <span className="text-[15px] font-bold tracking-[0.02em]">STEADY</span>
            <span className="text-[9px] font-medium tracking-[0.16em] text-muted-3">HABIT SYSTEM</span>
          </div>
        </Link>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 rounded-full bg-surface px-3 py-[7px] text-[13px] text-[oklch(0.45_0.014_80)]">
            <span className="h-[7px] w-[7px] rounded-full bg-[#A5A58D]" />
            {streak.current}-day streak
          </div>
          <Link
            href="/app/profile"
            title="Open profile"
            className="grid h-8 w-8 place-items-center rounded-full border border-soft bg-sage text-xs font-semibold text-ink transition hover:bg-clay hover:text-ink"
          >
            {initialsOf(me.name)}
          </Link>
        </div>
      </header>

      <MobileNav />
      <InstallPrompt />

      <div className="flex min-h-0 flex-1 items-stretch">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-wrap items-start gap-5 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
