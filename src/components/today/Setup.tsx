"use client";

import { useState, useTransition } from "react";
import { completeSetup } from "@/app/app/actions";
import { Card, ErrorText, btnPrimary, btnSecondary, inputBase } from "@/components/app/ui";
import { STARTERS } from "@/lib/starters";

/** First-run setup: nothing is created unless the person picks it. */
export function Setup({ firstName }: { firstName: string }) {
  const [picked, setPicked] = useState<string[]>([]);
  const [priority, setPriority] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const toggle = (k: string) => setPicked((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));
  const go = (clean: boolean) =>
    startTransition(async () => {
      const res = await completeSetup({ habits: clean ? [] : picked, priority: clean ? "" : priority });
      if (!res.ok) setError(res.error);
    });

  const nothing = picked.length === 0 && !priority.trim();

  return (
    <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-5">
      <Card className="mx-auto w-full max-w-[760px] p-7">
        <h1 className="mb-1.5 text-[26px] font-bold tracking-[-0.02em]">Welcome, {firstName}</h1>
        <p className="mb-6 max-w-[56ch] text-[14px] text-muted">
          Start small. Pick a habit or two, or begin with a blank page. Nothing here is permanent, and you can add, resize or remove anything later.
        </p>

        <h2 className="mb-2.5 text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">Habits to start with (optional)</h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-2.5">
          {STARTERS.map((s) => {
            const on = picked.includes(s.key);
            return (
              <button
                key={s.key}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(s.key)}
                className="cursor-pointer rounded-[14px] border p-3.5 text-left"
                style={{ borderColor: on ? "#6B705C" : "#E8DDD3", background: on ? "#EEEFE6" : "#fff" }}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-[15px] font-semibold text-ink">{s.name}</span>
                  <span
                    className="grid h-[20px] w-[20px] place-items-center rounded-full text-[11px] text-white"
                    style={{ border: `1.5px solid ${on ? "#6B705C" : "#DDBEA9"}`, background: on ? "#6B705C" : "#fff" }}
                  >
                    {on ? "✓" : ""}
                  </span>
                </span>
                <span className="mt-0.5 block text-xs text-muted-2">
                  {s.cadence} · {s.time} · {s.minutes} min
                </span>
                <span className="mt-1.5 block text-xs text-muted-3">
                  {s.minLabel} · {s.stdLabel} · {s.stretchLabel}
                </span>
              </button>
            );
          })}
        </div>

        <h2 className="mb-2 mt-6 text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">One thing for today (optional)</h2>
        <input
          value={priority}
          onChange={(e) => {
            setPriority(e.target.value);
            setError("");
          }}
          onKeyDown={(e) => e.key === "Enter" && go(false)}
          placeholder="What would make today feel like a good one?"
          aria-label="First priority"
          className={`${inputBase} w-full py-3 text-sm`}
        />

        <div className="mt-6 flex flex-wrap items-center gap-2.5">
          <button type="button" disabled={pending} onClick={() => go(false)} className={btnPrimary}>
            {nothing ? "Start with a clean slate" : `Get started${picked.length ? ` with ${picked.length} habit${picked.length === 1 ? "" : "s"}` : ""}`}
          </button>
          {!nothing && (
            <button type="button" disabled={pending} onClick={() => go(true)} className={btnSecondary}>
              Start clean instead
            </button>
          )}
          {error && <ErrorText>{error}</ErrorText>}
        </div>
      </Card>
    </div>
  );
}
