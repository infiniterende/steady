"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { finishTask, recordFocus } from "@/app/app/actions";
import { btnPrimary, btnSecondary, inputBase } from "@/components/app/ui";
import { FOCUS_EVENT, type FocusRequest } from "@/components/today/focusEvents";

export type FocusOption = { title: string; taskId: string | null };

type Session = {
  title: string;
  taskId: string | null;
  note?: string;
  day: string;
  totalSec: number;
  /** epoch ms when it ends, while running */
  endsAt: number | null;
  /** seconds left, while paused or finished */
  leftSec: number;
  status: "running" | "paused" | "finished";
};

const KEY_PREFIX = "steady.focus";
const DURATIONS = [5, 15, 25, 45];

const fmt = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
const clock = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

function load(key: string): Session | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}
function save(key: string, s: Session | null) {
  try {
    if (s) localStorage.setItem(key, JSON.stringify(s));
    else localStorage.removeItem(key);
  } catch {}
}

export function FocusTimer({
  userId,
  day,
  options,
  today,
}: {
  userId: string;
  day: string;
  options: FocusOption[];
  today: { sessions: number; minutes: number };
}) {
  const key = `${KEY_PREFIX}.${userId}`; // per account, so a shared browser never shows someone else's session
  const [session, setSession] = useState<Session | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [title, setTitle] = useState("");
  const [minutes, setMinutes] = useState(25);
  const [custom, setCustom] = useState("");
  const recorded = useRef(false);

  // Resume whatever was running before a reload or navigation. A session that ran out while the
  // page was closed is picked up by the finish effect below and recorded once.
  useEffect(() => {
    const t = setTimeout(() => {
      const s = load(key);
      if (!s) return;
      recorded.current = s.status === "finished";
      setSession(s);
      setNow(Date.now());
    }, 0);
    return () => clearTimeout(t);
  }, [key]);

  const begin = useCallback(
    (req: FocusRequest) => {
      const totalSec = Math.max(1, Math.round(req.minutes)) * 60;
      recorded.current = false;
      const s: Session = {
        title: req.title.trim().slice(0, 60) || "Focus",
        taskId: req.taskId ?? null,
        note: req.note?.slice(0, 220),
        day,
        totalSec,
        endsAt: Date.now() + totalSec * 1000,
        leftSec: totalSec,
        status: "running",
      };
      save(key, s);
      setSession(s);
      setNow(Date.now());
    },
    [day, key],
  );

  useEffect(() => {
    const h = (e: Event) => begin((e as CustomEvent<FocusRequest>).detail);
    window.addEventListener(FOCUS_EVENT, h);
    return () => window.removeEventListener(FOCUS_EVENT, h);
  }, [begin]);

  // Tick from the end timestamp so a throttled background tab stays accurate.
  useEffect(() => {
    if (session?.status !== "running") return;
    const iv = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(iv);
  }, [session?.status]);

  const left = session
    ? session.status === "running" && session.endsAt
      ? Math.max(0, Math.ceil((session.endsAt - now) / 1000))
      : session.leftSec
    : 0;

  const finish = useCallback((s: Session) => {
    if (recorded.current) return;
    recorded.current = true;
    const done: Session = { ...s, status: "finished", endsAt: null, leftSec: 0 };
    save(key, done);
    setSession(done);
    void recordFocus({ day: s.day, title: s.title, taskId: s.taskId, plannedMin: s.totalSec / 60, actualSec: s.totalSec, completed: true });
    try {
      if ("Notification" in window && Notification.permission === "granted") new Notification("Focus session done", { body: s.title });
    } catch {}
  }, [key]);

  useEffect(() => {
    if (session?.status === "running" && left === 0) finish(session);
  }, [session, left, finish]);

  // Show the countdown in the tab title.
  useEffect(() => {
    if (session?.status !== "running") return;
    const base = document.title;
    document.title = `${fmt(left)} · ${session.title}`;
    return () => {
      document.title = base;
    };
  }, [session?.status, session?.title, left]);

  const pause = () => {
    if (!session || session.status !== "running") return;
    const s: Session = { ...session, status: "paused", endsAt: null, leftSec: left };
    save(key, s);
    setSession(s);
  };
  const resume = () => {
    if (!session || session.status !== "paused") return;
    const s: Session = { ...session, status: "running", endsAt: Date.now() + session.leftSec * 1000 };
    save(key, s);
    setSession(s);
    setNow(Date.now());
  };
  const stopEarly = () => {
    if (!session) return;
    const elapsed = session.totalSec - left;
    void recordFocus({ day: session.day, title: session.title, taskId: session.taskId, plannedMin: session.totalSec / 60, actualSec: elapsed, completed: false });
    save(key, null);
    setSession(null);
  };
  const close = () => {
    save(key, null);
    setSession(null);
  };

  const start = () => {
    const c = parseInt(custom, 10);
    const mins = custom && Number.isFinite(c) ? Math.min(180, Math.max(1, c)) : minutes;
    const match = options.find((o) => o.title === title.trim());
    begin({ title: title || "Focus", minutes: mins, taskId: match?.taskId ?? null });
    setTitle("");
  };

  const pct = session ? Math.round(((session.totalSec - left) / session.totalSec) * 100) : 0;

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-muted">Focus session</h2>
        <span className="text-xs text-muted-2">
          {today.sessions
            ? `${today.minutes} min across ${today.sessions} session${today.sessions === 1 ? "" : "s"} today`
            : "Nothing timed yet today"}
        </span>
      </div>

      {!session && (
        <div className="flex flex-col gap-3 rounded-[14px] border border-line bg-surface p-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && start()}
            list="focus-options"
            placeholder="What will you work on?"
            aria-label="Focus session subject"
            className={inputBase}
          />
          <datalist id="focus-options">
            {options.map((o) => (
              <option key={`${o.taskId}-${o.title}`} value={o.title} />
            ))}
          </datalist>
          <div className="flex flex-wrap items-center gap-2">
            {DURATIONS.map((d) => {
              const on = !custom && minutes === d;
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    setMinutes(d);
                    setCustom("");
                  }}
                  className="cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-semibold"
                  style={{ borderColor: on ? "#6B705C" : "#DDBEA9", background: on ? "#6B705C" : "#fff", color: on ? "#fff" : "#40453A" }}
                >
                  {d} min
                </button>
              );
            })}
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value.replace(/\D/g, "").slice(0, 3))}
              inputMode="numeric"
              placeholder="custom"
              aria-label="Custom minutes"
              className={`${inputBase} w-[84px]`}
            />
            <button type="button" onClick={start} className={`${btnPrimary} ml-auto`}>
              Start focus
            </button>
          </div>
          <p className="text-xs text-muted-2">One thing, a clear end time. When the timer stops, you stop.</p>
        </div>
      )}

      {session && (
        <div className="flex flex-wrap items-center gap-5 rounded-[14px] border border-line bg-surface p-4">
          <div
            className="relative h-[96px] w-[96px] shrink-0 rounded-full"
            style={{ background: `conic-gradient(${session.status === "finished" ? "#6B705C" : "#CB997E"} ${pct}%, #F4EDE6 ${pct}% 100%)` }}
          >
            <div className="absolute inset-2 grid place-items-center rounded-full bg-white text-center">
              <div>
                <div className="font-mono text-[22px] font-medium tracking-[-0.02em]">{session.status === "finished" ? "Done" : fmt(left)}</div>
                <div className="text-[9px] tracking-[0.06em] text-muted-3">{session.status === "finished" ? "NICE WORK" : "LEFT"}</div>
              </div>
            </div>
          </div>
          <div className="flex min-w-0 flex-[1_1_200px] flex-col gap-2">
            <div className="truncate text-[16px] font-semibold">{session.title}</div>
            {session.note && session.status !== "finished" && <div className="text-[13px] leading-snug text-muted">{session.note}</div>}
            <div className="text-xs text-muted-2">
              {session.status === "running" && session.endsAt
                ? `Stops at ${clock(session.endsAt)}`
                : session.status === "paused"
                  ? `Paused · ${fmt(left)} left`
                  : `You focused for ${Math.round(session.totalSec / 60)} minutes. Take a breath.`}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {session.status === "running" && (
                <button type="button" onClick={pause} className={btnPrimary}>
                  Pause
                </button>
              )}
              {session.status === "paused" && (
                <button type="button" onClick={resume} className={btnPrimary}>
                  Resume
                </button>
              )}
              {session.status !== "finished" && (
                <button type="button" onClick={stopEarly} className={btnSecondary}>
                  Stop early
                </button>
              )}
              {session.status === "finished" && (
                <>
                  {session.taskId && (
                    <button
                      type="button"
                      className={btnPrimary}
                      onClick={() => {
                        void finishTask(session.taskId!);
                        close();
                      }}
                    >
                      Mark task done
                    </button>
                  )}
                  <button type="button" className={btnSecondary} onClick={() => begin({ title: session.title, minutes: 5, taskId: session.taskId, note: session.note })}>
                    5 more minutes
                  </button>
                  <button type="button" className={btnSecondary} onClick={close}>
                    Close
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
