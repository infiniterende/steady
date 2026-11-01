"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { removeJournal } from "@/app/app/actions";
import { formatDay } from "@/lib/dates";
import { bodyBlocks, moodOf, wordCount } from "@/lib/journal";

export type TimelineEntry = {
  id: string;
  day: string;
  mood: number | null;
  title: string;
  body: string;
  photoCount: number;
  photos: { id: string; url: string }[];
};

export function JournalTimeline({ entries, today }: { entries: TimelineEntry[]; today: string }) {
  const [q, setQ] = useState("");
  const [pending, startTransition] = useTransition();

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return entries;
    return entries.filter((e) => `${e.title} ${e.body} ${moodOf(e.mood)?.label ?? ""}`.toLowerCase().includes(needle));
  }, [entries, q]);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[19px] font-bold text-[#4A3D34]">Your journal</h2>
        <label className="flex items-center gap-2 rounded-full border border-[#E6E0DA] bg-white px-3.5 py-2 text-[13px] text-[#5B4A3F]">
          <svg width="15" height="15" viewBox="0 0 24 24" style={{ fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" }}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search entries" aria-label="Search entries" className="w-[150px] border-0 bg-transparent p-0 text-[13px] outline-none placeholder:text-[#B8AFA7]" />
        </label>
      </div>

      {shown.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-[#F7F4F1] text-2xl">📖</div>
          <div className="text-lg font-bold text-[#4A3D34]">{q ? "No result found" : "Nothing written yet"}</div>
          <div className="max-w-[260px] text-[13px] text-[#9A8F86]">
            {q ? <>There&apos;s no match for &ldquo;{q}&rdquo;. Try another keyword.</> : "Your first entry can be a single line."}
          </div>
        </div>
      ) : (
        <ol className="relative m-0 list-none p-0">
          {shown.map((e, i) => {
            const m = moodOf(e.mood);
            const blocks = bodyBlocks(e.body);
            const excerpt = blocks.map((b) => b.answer || b.question || "").join(" ").replace(/\s+/g, " ").trim();
            const heading = e.title || blocks.find((b) => b.question)?.question || (excerpt ? excerpt.slice(0, 48) + (excerpt.length > 48 ? "…" : "") : "Untitled");
            return (
              <li key={e.id} className="flex gap-4">
                <div className="flex w-[52px] shrink-0 flex-col items-center">
                  <span className="rounded-full bg-[#F7F4F1] px-2 py-1 font-mono text-[11px] text-[#9A8F86]">
                    {e.day === today ? "Today" : formatDay(e.day, { month: "short", day: "numeric" })}
                  </span>
                  {i < shown.length - 1 && <span className="my-1 w-px flex-1 bg-[#EDE8E3]" />}
                </div>
                <div className="group relative mb-3 min-w-0 flex-1 rounded-[20px] border border-[#EDE8E3] bg-white p-3.5 pr-24 shadow-[0_6px_18px_rgba(91,74,63,0.05)]">
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#F7F4F1] text-xl">{m ? m.emoji : "📝"}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-bold text-[#4A3D34]">{heading}</div>
                      <div className="mt-0.5 line-clamp-1 text-[12px] text-[#7E7369]">{excerpt || (e.photoCount ? "Photos only." : "No writing, just a mood.")}</div>
                      <div className="mt-1 text-[11px] text-[#9A8F86]">
                        {wordCount(e.body)} total words{m ? ` · ${m.label}` : ""}{e.photoCount ? ` · ${e.photoCount} ${e.photoCount === 1 ? "photo" : "photos"}` : ""}
                      </div>
                    </div>
                  </div>
                  {e.photos.length > 0 && (
                    <div className="mt-3 flex gap-2">
                      {e.photos.map((p) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={p.id} src={p.url} alt="" className="h-[108px] w-[144px] rounded-xl object-cover" loading="lazy" />
                      ))}
                      {e.photoCount > e.photos.length && (
                        <span className="grid h-[108px] w-[72px] place-items-center rounded-xl bg-[#F7F4F1] font-mono text-sm text-[#7E7369]">+{e.photoCount - e.photos.length}</span>
                      )}
                    </div>
                  )}
                  <div className="absolute right-3 top-1/2 flex -translate-y-1/2 gap-1.5">
                    <Link
                      href={`/app/journal?d=${e.day}`}
                      title="Open entry"
                      className="grid h-9 w-9 place-items-center rounded-full bg-[#A9C46C] text-white hover:bg-[#98B55A] hover:text-white"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" style={{ fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round" }}><path d="M4 20h4l10-10-4-4L4 16zM13 7l4 4" /></svg>
                    </Link>
                    <button
                      type="button"
                      title="Delete entry"
                      disabled={pending}
                      onClick={() => startTransition(() => removeJournal(e.id).then(() => undefined))}
                      className="grid h-9 w-9 cursor-pointer place-items-center rounded-full border-0 bg-[#F08A9B] text-white hover:bg-[#E5768A] disabled:opacity-60"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" style={{ fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round" }}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}
