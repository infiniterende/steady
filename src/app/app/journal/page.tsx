import { JournalComposer } from "@/components/journal/JournalComposer";
import { JournalTimeline } from "@/components/journal/JournalTimeline";
import { JournalStats } from "@/components/journal/JournalStats";
import { Completion } from "@/components/journal/Completion";
import { getJournalEntries, getJournalEntry, getToday, requireProfile } from "@/lib/data";
import { addDays, formatDay, isDayKey } from "@/lib/dates";
import { journalStreak, promptFor } from "@/lib/journal";

export const metadata = { title: "Journal — Steady" };

export default async function JournalPage({ searchParams }: PageProps<"/app/journal">) {
  const me = await requireProfile();
  const today = await getToday();
  const params = await searchParams;
  const day = isDayKey(params.d) && params.d <= today ? params.d : today;

  const [entry, entries] = await Promise.all([getJournalEntry(me.id, day), getJournalEntries(me.id, 60)]);

  const month = today.slice(0, 7);
  const monthEntries = entries.filter((e) => e.day.startsWith(month));
  const monthLabel = formatDay(`${month}-01`, { month: "long", year: "numeric" });
  const streak = journalStreak(entries.map((e) => e.day), today, addDays);
  const todayDone = entries.some((e) => e.day === today);

  const card = "rounded-[28px] border border-[#EDE8E3] bg-white shadow-[0_8px_24px_rgba(91,74,63,0.06)]";

  return (
    <>
      <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-5">
        <section className={`${card} p-6`}>
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-[15px] font-bold tracking-[-0.01em] text-[#4A3D34]">{entry ? "Edit journal" : "Create new journal"}</h1>
            <span className="grid h-9 w-9 place-items-center rounded-full border border-[#E6E0DA] text-[#5B4A3F]" aria-hidden>
              <svg width="16" height="16" viewBox="0 0 24 24" style={{ fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" }}><path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15zM10 21h4" /></svg>
            </span>
          </div>
          <JournalComposer
            key={day}
            day={day}
            today={today}
            entryId={entry?.id ?? null}
            initialMood={entry?.mood ?? null}
            initialTitle={entry?.title ?? ""}
            initialBody={entry?.body ?? ""}
            prompt={promptFor(day)}
            photos={entry?.photos ?? []}
          />
        </section>

        <section className={`${card} p-6`}>
          <JournalTimeline today={today} entries={entries} />
        </section>
      </div>

      <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-5 md:min-w-[260px] md:max-w-[360px]">
        {todayDone && <Completion name={me.name} streak={streak} dateLabel={formatDay(today, { weekday: "long", month: "long", day: "numeric" })} />}
        <section className={`${card} p-5`}>
          <JournalStats entries={monthEntries} monthLabel={monthLabel} />
        </section>
      </aside>
    </>
  );
}
