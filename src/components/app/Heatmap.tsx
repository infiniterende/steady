const LEVEL_BG = ["#F4EDE6", "#DDBEA9", "#B7B7A4", "#6B705C"];

export function Heatmap({ weeks, gap = 5, cell = 10 }: { weeks: { day: string; level: number; title: string }[][]; gap?: number; cell?: number }) {
  return (
    <div className="flex" style={{ gap }}>
      {weeks.map((w, i) => (
        <div key={i} className="flex flex-1 flex-col" style={{ gap }}>
          {w.map((d) => (
            <div key={d.day} title={d.title} className="rounded-[3px]" style={{ height: cell, background: LEVEL_BG[d.level] }} />
          ))}
        </div>
      ))}
    </div>
  );
}
