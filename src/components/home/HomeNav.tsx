"use client";

import { useEffect, useState } from "react";

const LINKS: { label: string; target: string | null }[] = [
  { label: "Overview", target: null },
  { label: "How it works", target: "how" },
  { label: "Features", target: "features" },
];

export function HomeNav() {
  const [active, setActive] = useState("Overview");

  useEffect(() => {
    const ids = LINKS.filter((l) => l.target).map((l) => l.target as string);
    const onScroll = () => {
      let current = "Overview";
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top - 120 <= 0) {
          current = LINKS.find((l) => l.target === id)!.label;
        }
      }
      setActive(current);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const go = (label: string, target: string | null) => {
    setActive(label);
    const el = target ? document.getElementById(target) : null;
    window.scrollTo({
      top: el ? el.getBoundingClientRect().top + window.scrollY - 16 : 0,
      behavior: "smooth",
    });
  };

  return (
    <nav className="flex flex-wrap items-center justify-center gap-1 rounded-2xl bg-white/80 p-1.5 shadow-[0_6px_20px_rgba(120,90,70,0.08)]">
      {LINKS.map((l) => {
        const on = active === l.label;
        return (
          <button
            key={l.label}
            type="button"
            onClick={() => go(l.label, l.target)}
            className="cursor-pointer rounded-[11px] border-0 px-4 py-2.5 text-sm transition hover:bg-home-tint"
            style={{
              fontWeight: on ? 600 : 500,
              color: on ? "#3A3530" : "#6A625A",
              background: on ? "#F6EEE8" : "transparent",
            }}
          >
            {l.label}
          </button>
        );
      })}
    </nav>
  );
}
