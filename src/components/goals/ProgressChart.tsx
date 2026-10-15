import { fmtNum } from "@/lib/goals";
import { formatDay } from "@/lib/dates";

type Entry = { date: string; value: number };

/** Line chart of logged values with the target as a dashed guide. Pure SVG, no client JS. */
export function ProgressChart({
  entries,
  start,
  target,
  unit,
  milestones,
}: {
  entries: Entry[];
  start: number;
  target: number;
  unit: string;
  milestones: { value: number; achieved: boolean }[];
}) {
  const W = 640;
  const H = 220;
  const padL = 44;
  const padR = 16;
  const padT = 14;
  const padB = 28;

  if (entries.length === 0) {
    return (
      <div className="rounded-[14px] border border-dashed border-soft p-8 text-center text-[13px] text-muted">
        Log your first value to start the chart.
      </div>
    );
  }

  const values = [...entries.map((e) => e.value), start, target];
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  if (lo === hi) {
    lo -= 1;
    hi += 1;
  }
  const padY = (hi - lo) * 0.08;
  lo -= padY;
  hi += padY;

  const t0 = Date.parse(entries[0].date);
  const t1 = Math.max(Date.parse(entries[entries.length - 1].date), t0 + 86_400_000);
  const x = (d: string) => padL + ((Date.parse(d) - t0) / (t1 - t0)) * (W - padL - padR);
  const y = (v: number) => padT + ((hi - v) / (hi - lo)) * (H - padT - padB);

  const path = entries.map((e, i) => `${i ? "L" : "M"}${x(e.date).toFixed(1)},${y(e.value).toFixed(1)}`).join(" ");
  const ticks = [lo + padY, (lo + hi) / 2, hi - padY];
  const first = entries[0];
  const last = entries[entries.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Progress chart in ${unit}`}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="#F4EDE6" />
          <text x={padL - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fontFamily="var(--font-mono)" fill="oklch(0.55 0.014 80)">
            {fmtNum(Math.round(t * 10) / 10)}
          </text>
        </g>
      ))}
      {milestones.map((m, i) => (
        <line
          key={i}
          x1={padL}
          x2={W - padR}
          y1={y(m.value)}
          y2={y(m.value)}
          stroke={m.achieved ? "#B7B7A4" : "#E8DDD3"}
          strokeDasharray="2 4"
        />
      ))}
      <line x1={padL} x2={W - padR} y1={y(target)} y2={y(target)} stroke="#CB997E" strokeDasharray="5 4" />
      <text x={W - padR} y={y(target) - 5} textAnchor="end" fontSize="11" fontFamily="var(--font-mono)" fill="#8A553A">
        target {fmtNum(target)}
      </text>
      <path d={path} fill="none" stroke="#6B705C" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
      {entries.map((e) => (
        <circle key={e.date} cx={x(e.date)} cy={y(e.value)} r="3.5" fill="#fff" stroke="#6B705C" strokeWidth="2">
          <title>{`${formatDay(e.date, { month: "short", day: "numeric" })}: ${fmtNum(e.value)} ${unit}`}</title>
        </circle>
      ))}
      <text x={padL} y={H - 8} fontSize="11" fontFamily="var(--font-mono)" fill="oklch(0.55 0.014 80)">
        {formatDay(first.date, { month: "short", day: "numeric" })}
      </text>
      <text x={W - padR} y={H - 8} textAnchor="end" fontSize="11" fontFamily="var(--font-mono)" fill="oklch(0.55 0.014 80)">
        {first.date === last.date ? "" : formatDay(last.date, { month: "short", day: "numeric" })}
      </text>
    </svg>
  );
}
