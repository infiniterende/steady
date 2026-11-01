import { Bar, Card } from "@/components/app/ui";
import { ApplySuggestion } from "@/components/today/ApplySuggestion";
import { getToday, getWeeklyReview, requireProfile } from "@/lib/data";
import { formatDay } from "@/lib/dates";
import { SIZE_NAME } from "@/lib/sizes";

export const metadata = { title: "Weekly review — Steady" };

export default async function ReviewPage() {
  const me = await requireProfile();
  const today = await getToday();
  const r = await getWeeklyReview(me.id, today);
  const range = `${formatDay(r.start, { month: "short", day: "numeric" })} – ${formatDay(r.end, { month: "short", day: "numeric" })}`;
  const delta = r.prevRate === null ? null : r.rate - r.prevRate;
  const empty = r.total === 0;

  return (
    <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-5">
      <Card className="p-6">
        <h1 className="mb-1 text-[26px] font-bold tracking-[-0.02em]">Weekly review</h1>
        <p className="mb-5 text-[13px] text-muted-2">The last seven days · {range}</p>

        {empty ? (
          <div className="rounded-[14px] border border-dashed border-soft p-6 text-center text-[13px] text-muted">
            Nothing to review yet. Once your habits have a few days behind them, this page shows what worked.
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3">
            <Tile label="Habit blocks done" value={`${r.done}/${r.total}`} sub={delta === null ? `${r.rate}%` : `${r.rate}% · ${delta >= 0 ? "+" : ""}${delta} vs last week`} bg="#EEEFE6" />
            <Tile label="Days you showed up" value={`${r.activeDays}/7`} sub={r.comebacks ? `${r.comebacks} comeback${r.comebacks === 1 ? "" : "s"} after a miss` : "no gaps to come back from"} bg="#F6E8DE" />
            <Tile
              label="Priorities finished"
              value={r.prioritiesTotal ? `${r.prioritiesDone}/${r.prioritiesTotal}` : "–"}
              sub={r.prioritiesTotal ? "from your daily three" : "no priorities picked"}
              bg="#F1E9E1"
            />
            <Tile
              label="Focus time"
              value={`${r.focusMinutes}m`}
              sub={`${r.focusSessions} session${r.focusSessions === 1 ? "" : "s"}${r.focusPrevMinutes !== null ? ` · ${r.focusPrevMinutes}m last week` : ""}`}
              bg="#EEEFE6"
            />
          </div>
        )}
      </Card>

      {!empty && (
        <>
          <Card className="p-6">
            <h2 className="mb-1 text-[19px] font-bold tracking-[-0.01em]">One thing to adjust</h2>
            <p className="mb-4 text-[13px] text-muted-2">Based only on the counts below. You decide whether it happens.</p>
            <div className="rounded-[14px] bg-surface p-4">
              <div className="mb-1 text-[16px] font-semibold">{r.suggestion.title}</div>
              <p className="mb-3 text-sm leading-relaxed text-muted">{r.suggestion.why}</p>
              <ApplySuggestion
                kind={r.suggestion.kind}
                habitId={"habitId" in r.suggestion ? r.suggestion.habitId : undefined}
                time={"time" in r.suggestion ? r.suggestion.time : undefined}
              />
            </div>
          </Card>

          <div className="grid gap-5 md:grid-cols-2">
            <Card className="p-6">
              <h2 className="mb-3 text-[17px] font-bold">What worked</h2>
              {r.worked.length === 0 ? (
                <p className="text-sm text-muted">Nothing logged yet this week.</p>
              ) : (
                <ul className="flex flex-col gap-3.5">
                  {r.worked.map((h) => {
                    const used = (["MIN", "STANDARD", "STRETCH"] as const).filter((k) => h.bySize[k] > 0);
                    return (
                      <li key={h.id}>
                        <div className="mb-1 flex justify-between text-sm">
                          <span className="font-semibold">{h.name}</span>
                          <span className="font-mono text-xs text-muted-2">
                            {h.done}/{h.total}
                          </span>
                        </div>
                        <Bar pct={(h.done / h.total) * 100} color="#6B705C" />
                        {used.length > 0 && (
                          <div className="mt-1 text-xs text-muted-2">{used.map((k) => `${h.bySize[k]}× ${SIZE_NAME[k].toLowerCase()}`).join(" · ")}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            <Card className="p-6">
              <h2 className="mb-3 text-[17px] font-bold">Skipped more than twice</h2>
              {r.skipped.length === 0 ? (
                <p className="text-sm text-muted">Nothing was skipped three or more times.</p>
              ) : (
                <ul className="flex flex-col gap-3.5">
                  {r.skipped.map((h) => (
                    <li key={h.id}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="font-semibold">{h.name}</span>
                        <span className="font-mono text-xs text-muted-2">
                          missed {h.missed} of {h.total}
                        </span>
                      </div>
                      <Bar pct={(h.done / h.total) * 100} color="#CB997E" />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function Tile({ label, value, sub, bg }: { label: string; value: string; sub: string; bg: string }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: bg }}>
      <div className="text-xs text-muted">{label}</div>
      <div className="my-1 font-mono text-[26px] font-medium">{value}</div>
      <div className="text-xs text-muted-2">{sub}</div>
    </div>
  );
}
