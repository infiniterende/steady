import type { Domain } from "@prisma/client";
import { CAT } from "@/lib/domain";

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-[18px] border border-line bg-white ${className}`}>{children}</section>;
}

export function CatIcon({ domain, size = 20, stroke }: { domain: Domain; size?: number; stroke?: string }) {
  const c = CAT[domain];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 22 22"
      style={{ fill: "none", stroke: stroke ?? c.stroke, strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" }}
      aria-hidden
    >
      <path d={c.icon} />
    </svg>
  );
}

export function CatTile({ domain, size = 40, dim }: { domain: Domain; size?: number; dim?: boolean }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-xl"
      style={{ width: size, height: size, background: CAT[domain].bg, opacity: dim ? 0.6 : 1 }}
    >
      <CatIcon domain={domain} />
    </span>
  );
}

export function Ring({
  pct,
  size,
  inset,
  color = "#6B705C",
  track = "#F4EDE6",
  innerBg = "#fff",
  children,
}: {
  pct: number;
  size: number;
  inset: number;
  color?: string;
  track?: string;
  innerBg?: string;
  children?: React.ReactNode;
}) {
  return (
    <span
      className="relative shrink-0 rounded-full"
      style={{ width: size, height: size, background: `conic-gradient(${color} 0 ${pct}%, ${track} ${pct}% 100%)` }}
    >
      <span className="absolute grid place-items-center rounded-full" style={{ inset, background: innerBg }}>
        {children}
      </span>
    </span>
  );
}

export function Bar({ pct, color, height = 8, track = "#F4EDE6" }: { pct: number; color: string; height?: number; track?: string }) {
  return (
    <span className="block overflow-hidden rounded-full" style={{ height, background: track }}>
      <span
        className="block h-full rounded-full transition-[width] duration-300 ease-in-out"
        style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color }}
      />
    </span>
  );
}

export const btnPrimary =
  "cursor-pointer rounded-[10px] border-0 bg-olive px-4 py-[9px] text-[13px] font-semibold text-white transition hover:bg-olive-dark disabled:opacity-60";
export const btnSecondary =
  "cursor-pointer rounded-[9px] border border-soft bg-white px-3 py-2 text-xs font-semibold text-[oklch(0.45_0.014_80)] transition hover:bg-surface disabled:opacity-60";
export const inputBase =
  "min-w-0 rounded-[9px] border border-soft bg-white px-3 py-[9px] text-[13px] text-inherit outline-none focus:border-olive";

export function ErrorText({ children }: { children: React.ReactNode }) {
  return <div className="flex-[1_1_100%] text-xs text-danger">{children}</div>;
}
