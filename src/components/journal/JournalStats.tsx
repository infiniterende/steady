import { SENTIMENT, moodOf, sentimentOf, wordCount, type Sentiment } from "@/lib/journal";

type Entry = { day: string; mood: number | null; body: string; photoCount: number };

export function JournalStats({ entries, monthLabel }: { entries: Entry[]; monthLabel: string }) {
  const counts: Record<Sentiment, number> = { negative: 0, neutral: 0, positive: 0 };
  for (const e of entries) {
    const s = sentimentOf(e.mood);
    if (s) counts[s]++;
  }
  const max = Math.max(1, ...Object.values(counts));
  const words = entries.map((e) => wordCount(e.body));
  const avgWords = words.length ? Math.round(words.reduce((a, b) => a + b, 0) / words.length) : 0;
  const moodTally = new Map<number, number>();
  for (const e of entries) if (e.mood) moodTally.set(e.mood, (moodTally.get(e.mood) ?? 0) + 1);
  const topMoods = [...moodTally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([v]) => moodOf(v)!.label);
  const photos = entries.reduce((a, e) => a + e.photoCount, 0);

  const order: Sentiment[] = ["negative", "neutral", "positive"];

  return (
    <>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[19px] font-bold text-[#4A3D34]">Stats</h2>
          <p className="text-[12px] text-[#9A8F86]">Stats for {monthLabel}</p>
        </div>
        <span className="grid h-9 w-9 place-items-center rounded-full border border-[#E6E0DA] text-base">☕</span>
      </div>

      <div className="flex h-[180px] items-end gap-3">
        {order.map((s) => {
          const n = counts[s];
          const h = Math.max(72, Math.round((n / max) * 170));
          const c = SENTIMENT[s];
          return (
            <div key={s} className="flex flex-1 flex-col items-center justify-end">
              <div
                className="flex w-full max-w-[64px] flex-col items-center justify-between rounded-t-[22px] rounded-b-[22px] pb-2.5 pt-3 text-white transition-[height] duration-300"
                style={{ height: h, background: c.color }}
              >
                <span className="text-center leading-tight">
                  <span className="block font-mono text-[17px] font-medium">{n}</span>
                  <span className="block text-[10px] opacity-90">{c.label}</span>
                </span>
                <span className="text-sm">{c.face}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex flex-col divide-y divide-[#EDE8E3] rounded-2xl border border-[#EDE8E3]">
        <Row icon="☺" label="Mood" value={topMoods.length ? topMoods.join(", ") : "—"} />
        <Row icon="✎" label="Entries" value={`${entries.length} ${entries.length === 1 ? "day" : "days"}`} />
        <Row icon="▤" label="Average word count" value={String(avgWords)} />
        <Row icon="▣" label="Photos" value={String(photos)} />
      </div>
    </>
  );
}

function Row({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-3.5 py-2.5 text-[13px]">
      <span className="grid h-7 w-7 place-items-center rounded-full bg-[#F7F4F1] text-[12px] text-[#7E7369]">{icon}</span>
      <span className="text-[#7E7369]">{label}</span>
      <span className="ml-auto font-semibold text-[#4A3D34]">{value}</span>
    </div>
  );
}
