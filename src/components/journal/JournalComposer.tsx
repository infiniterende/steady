"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeJournal, registerJournalPhotos, removeJournalPhoto, saveJournal } from "@/app/app/actions";
import { MOODS, PROMPTS, moodOf, wordCount } from "@/lib/journal";
import { formatDay } from "@/lib/dates";
import { Lightbox } from "@/components/journal/Lightbox";
import { createClient } from "@/lib/supabase/client";
import { JOURNAL_BUCKET_NAME, PHOTOS_PER_ENTRY, PHOTO_MAX_BYTES, PHOTO_MAX_MB, PHOTO_TYPES } from "@/lib/photos";

type Photo = { id: string; url: string };

export function JournalComposer({
  userId,
  day,
  today,
  entryId,
  initialMood,
  initialTitle,
  initialBody,
  prompt,
  photos,
}: {
  userId: string;
  day: string;
  today: string;
  entryId: string | null;
  initialMood: number | null;
  initialTitle: string;
  initialBody: string;
  prompt: string;
  photos: Photo[];
}) {
  const router = useRouter();
  const [mood, setMood] = useState<number | null>(initialMood);
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
  const [moodOpen, setMoodOpen] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "dirty" | "saved">("idle");
  const [pending, startTransition] = useTransition();
  const [uploading, startUpload] = useTransition();
  const [focusTick, setFocusTick] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(220, el.scrollHeight)}px`;
  }, [body]);

  const dirty = () => {
    setStatus("dirty");
    setError("");
  };

  const save = () =>
    startTransition(async () => {
      const res = await saveJournal({ day, mood, title, body });
      if (!res.ok) return setError(res.error);
      setError("");
      setStatus("saved");
    });

  // Move the caret to the end of the body after a prompt is inserted (runs after React commits the new text).
  useEffect(() => {
    if (!focusTick) return;
    const el = textRef.current;
    if (!el) return;
    el.focus();
    el.selectionStart = el.selectionEnd = el.value.length;
  }, [focusTick]);

  const insertPrompt = (q: string) => {
    setBody((b) => (b.trim() ? `${b.replace(/\s+$/, "")}\n\n${q}\n` : `${q}\n`));
    setPromptOpen(false);
    dirty();
    setFocusTick((t) => t + 1);
  };

  const [progress, setProgress] = useState("");

  const upload = (files: FileList | null) => {
    if (!files || !files.length) return;
    const list = Array.from(files);
    if (photos.length + list.length > PHOTOS_PER_ENTRY) return setError(`Up to ${PHOTOS_PER_ENTRY} photos per day.`);
    for (const f of list) {
      if (!PHOTO_TYPES[f.type]) return setError(`${f.name || "That file"} isn't a JPEG, PNG, WebP or GIF.`);
      if (f.size > PHOTO_MAX_BYTES) return setError(`${f.name || "That photo"} is over ${PHOTO_MAX_MB} MB.`);
    }
    setError("");
    startUpload(async () => {
      // Straight from the browser to storage, so photo size isn't limited by the app server.
      const supabase = createClient();
      const done: string[] = [];
      let failure = "";
      for (const [i, f] of list.entries()) {
        setProgress(list.length > 1 ? `Uploading ${i + 1} of ${list.length}…` : "Uploading…");
        const path = `${userId}/${day}/${crypto.randomUUID()}.${PHOTO_TYPES[f.type]}`;
        const { error: upErr } = await supabase.storage.from(JOURNAL_BUCKET_NAME).upload(path, f, { contentType: f.type, upsert: false });
        if (upErr) {
          failure = `Upload failed: ${upErr.message}`;
          break;
        }
        done.push(path);
      }
      if (done.length) {
        const res = await registerJournalPhotos({ day, paths: done });
        if (!res.ok) failure = res.error;
      }
      setProgress("");
      setError(failure);
      if (fileRef.current) fileRef.current.value = "";
    });
  };

  const m = moodOf(mood);
  const words = wordCount(body);
  const dateLabel = day === today ? "Today" : formatDay(day, { weekday: "short", month: "short", day: "numeric" });

  return (
    <div className="relative">
      {/* top pills */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => dateRef.current?.showPicker?.() ?? dateRef.current?.click()}
          className="relative flex cursor-pointer items-center gap-2 rounded-full border border-[#E6E0DA] bg-white px-3.5 py-2 text-[13px] font-semibold text-[#5B4A3F] hover:bg-[#F7F4F1]"
        >
          <CalendarIcon />
          {dateLabel}
          <Chevron />
          <input
            ref={dateRef}
            type="date"
            value={day}
            max={today}
            onChange={(e) => e.target.value && router.push(`/app/journal?d=${e.target.value}`)}
            aria-label="Entry date"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            tabIndex={-1}
          />
        </button>
        <div className="relative">
          <button
            type="button"
            aria-expanded={moodOpen}
            onClick={() => setMoodOpen((o) => !o)}
            className="flex cursor-pointer items-center gap-2 rounded-full border border-[#E6E0DA] bg-white px-3.5 py-2 text-[13px] font-semibold text-[#5B4A3F] hover:bg-[#F7F4F1]"
          >
            <span className="text-base leading-none">{m ? m.emoji : "🙂"}</span>
            {m ? m.label : "Mood"}
            <Chevron />
          </button>
          {moodOpen && (
            <div className="absolute left-0 top-[calc(100%+6px)] z-20 flex gap-1 rounded-2xl border border-[#E6E0DA] bg-white p-1.5 shadow-[0_12px_30px_rgba(91,74,63,0.14)]">
              {MOODS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  title={o.label}
                  onClick={() => {
                    setMood(mood === o.value ? null : o.value);
                    setMoodOpen(false);
                    dirty();
                  }}
                  className="flex cursor-pointer flex-col items-center gap-0.5 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold text-[#5B4A3F] hover:bg-[#F7F4F1]"
                  style={{ background: mood === o.value ? "#EEF3E3" : undefined }}
                >
                  <span className="text-xl leading-none">{o.emoji}</span>
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <span className="ml-auto text-xs text-[#9A8F86]">
          {words} words{status === "saved" && " · Saved"}
          {status === "dirty" && " · Unsaved"}
        </span>
      </div>

      {/* title */}
      <input
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          dirty();
        }}
        placeholder="Untitled"
        aria-label="Entry title"
        maxLength={80}
        className="mb-3 w-full border-0 bg-transparent p-0 text-[30px] font-bold leading-[1.15] tracking-[-0.03em] text-[#4A3D34] outline-none placeholder:text-[#C9C0B8]"
      />

      {/* body */}
      <textarea
        ref={textRef}
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          dirty();
        }}
        onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === "Enter" && save()}
        placeholder={`${prompt}\nTap to continue your journal…`}
        aria-label="Journal entry"
        className="min-h-[220px] w-full resize-none border-0 bg-transparent p-0 text-[16px] leading-[1.7] text-[#5B4A3F] outline-none placeholder:text-[#C9C0B8]"
      />

      {/* photos */}
      {photos.length > 0 && (
        <div className={`mt-4 grid gap-3 ${photos.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
          {photos.map((p, i) => (
            <figure
              key={p.id}
              className={`group relative m-0 overflow-hidden rounded-[20px] bg-[#F7F4F1] ${photos.length === 1 ? "aspect-[16/10] max-h-[440px]" : "aspect-[4/3]"}`}
            >
              <button
                type="button"
                title="View larger"
                onClick={() => setLightbox(i)}
                className="block h-full w-full cursor-zoom-in border-0 bg-transparent p-0"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" className="h-full w-full object-cover transition group-hover:scale-[1.02]" loading="lazy" />
              </button>
              <button
                type="button"
                title="Remove photo"
                disabled={uploading}
                onClick={() => startUpload(async () => { const r = await removeJournalPhoto(p.id); if (!r.ok) setError(r.error); })}
                className="absolute right-2.5 top-2.5 grid h-8 w-8 cursor-pointer place-items-center rounded-full border-0 bg-[#F08A9B] text-sm text-white shadow-[0_4px_12px_rgba(0,0,0,0.2)] opacity-0 transition group-hover:opacity-100 focus:opacity-100 [@media(hover:none)]:opacity-100"
              >
                ×
              </button>
            </figure>
          ))}
        </div>
      )}
      {lightbox !== null && <Lightbox photos={photos} index={lightbox} onClose={() => setLightbox(null)} onIndex={setLightbox} />}

      {error && <div className="mt-3 text-xs text-[#D9534F]">{error}</div>}

      {/* toolbar */}
      <div className="relative mt-5 flex items-center gap-2 rounded-[22px] border border-[#EDE8E3] bg-white p-2 shadow-[0_10px_30px_rgba(91,74,63,0.08)]">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          aria-label="Add photos"
          onChange={(e) => upload(e.target.files)}
        />
        <Tool label={uploading ? progress || "Uploading…" : "Add photo"} disabled={uploading || photos.length >= PHOTOS_PER_ENTRY} onClick={() => fileRef.current?.click()}>
          <PhotoIcon />
        </Tool>
        <div className="relative">
          <Tool label="Insert a prompt" onClick={() => setPromptOpen((o) => !o)} active={promptOpen}>
            <SparkleIcon />
          </Tool>
          {promptOpen && (
            <div className="absolute bottom-[calc(100%+8px)] left-0 z-20 w-[320px] rounded-2xl border border-[#E6E0DA] bg-white p-2 shadow-[0_12px_30px_rgba(91,74,63,0.14)]">
              <div className="px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9A8F86]">Prompts</div>
              {PROMPTS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => insertPrompt(q)}
                  className="block w-full cursor-pointer rounded-xl px-2.5 py-2 text-left text-[13px] font-semibold text-[#5B4A3F] hover:bg-[#F7F4F1]"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
        </div>
        <Tool label="Mood" onClick={() => setMoodOpen((o) => !o)}>
          <span className="text-lg leading-none">{m ? m.emoji : "🙂"}</span>
        </Tool>
        {entryId && (
          <Tool
            label="Delete entry"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await removeJournal(entryId);
                setBody("");
                setTitle("");
                setMood(null);
                setStatus("idle");
              })
            }
          >
            <TrashIcon />
          </Tool>
        )}
        <button
          type="button"
          onClick={save}
          disabled={pending}
          title="Save entry (⌘↩)"
          className="ml-auto grid h-11 w-11 cursor-pointer place-items-center rounded-full border-0 bg-[#A9C46C] text-white shadow-[0_6px_16px_rgba(169,196,108,0.5)] transition hover:bg-[#98B55A] disabled:opacity-60"
        >
          {pending ? <span className="text-xs font-bold">…</span> : <ArrowIcon />}
        </button>
      </div>
    </div>
  );
}

function Tool({ children, label, onClick, disabled, active }: { children: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; active?: boolean }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-11 w-11 cursor-pointer place-items-center rounded-full border-0 text-[#5B4A3F] transition hover:bg-[#F7F4F1] disabled:opacity-50"
      style={{ background: active ? "#F7F4F1" : "transparent" }}
    >
      {children}
    </button>
  );
}

const ico = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;
function CalendarIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" style={ico}><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>; }
function Chevron() { return <svg width="12" height="12" viewBox="0 0 24 24" style={ico}><path d="M6 9l6 6 6-6" /></svg>; }
function PhotoIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" style={ico}><rect x="3" y="5" width="18" height="14" rx="3" /><circle cx="9" cy="10" r="1.6" /><path d="M21 16l-5-5-8 8" /></svg>; }
function SparkleIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" style={ico}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 17l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" /></svg>; }
function TrashIcon() { return <svg width="19" height="19" viewBox="0 0 24 24" style={ico}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" /></svg>; }
function ArrowIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" style={{ ...ico, strokeWidth: 2.2 }}><path d="M5 12h14M13 6l6 6-6 6" /></svg>; }
