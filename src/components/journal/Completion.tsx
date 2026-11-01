export function Completion({ name, streak, dateLabel }: { name: string; streak: number; dateLabel: string }) {
  const first = name.split(" ")[0];
  const bits = [
    { l: "6%", t: "14%", w: 26, h: 10, r: -25, c: "#A9C46C" },
    { l: "16%", t: "60%", w: 14, h: 14, r: 0, c: "#F08A9B", round: true },
    { l: "28%", t: "22%", w: 10, h: 10, r: 0, c: "#F3C85A", round: true },
    { l: "72%", t: "12%", w: 28, h: 10, r: 30, c: "#B9A8E2" },
    { l: "86%", t: "48%", w: 12, h: 12, r: 0, c: "#A9C46C", round: true },
    { l: "60%", t: "70%", w: 22, h: 9, r: -15, c: "#F0A35C" },
    { l: "92%", t: "78%", w: 18, h: 8, r: 45, c: "#F08A9B" },
  ];
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-[#EDE8E3] bg-white p-6 text-center shadow-[0_8px_24px_rgba(91,74,63,0.06)]">
      {bits.map((b, i) => (
        <span
          key={i}
          aria-hidden
          className="absolute"
          style={{ left: b.l, top: b.t, width: b.w, height: b.h, background: b.c, borderRadius: b.round ? 999 : 4, transform: `rotate(${b.r}deg)`, opacity: 0.9 }}
        />
      ))}
      <div className="text-[12px] text-[#9A8F86]">{dateLabel}</div>
      <div className="mx-auto mt-2 max-w-[300px] text-[17px] font-bold leading-snug text-[#4A3D34]">
        Well done, {first}! You&apos;ve completed today&apos;s journal.
      </div>
      <div className="mx-auto mt-4 grid h-[104px] w-[104px] place-items-center rounded-full border-[6px] border-[#F7F4F1] bg-white shadow-[inset_0_0_0_1px_#EDE8E3]">
        <div>
          <div className="font-mono text-[34px] leading-none text-[#4A3D34]">{streak}</div>
          <div className="mt-1 text-[11px] text-[#9A8F86]">day streak</div>
        </div>
      </div>
    </div>
  );
}
