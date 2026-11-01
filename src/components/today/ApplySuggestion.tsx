"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { moveHabitTime } from "@/app/app/actions";
import { btnPrimary, btnSecondary } from "@/components/app/ui";

/** Approve or skip a weekly-review suggestion. Nothing changes until the user taps Apply. */
export function ApplySuggestion({ kind, habitId, time }: { kind: string; habitId?: string; time?: string }) {
  const [state, setState] = useState<"idle" | "applied" | "skipped">("idle");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  if (state === "applied") return <p className="text-sm font-semibold text-olive">Done. Open blocks from today on now use the new time.</p>;
  if (state === "skipped") return <p className="text-sm text-muted">Skipped. It will show up again next week if it still applies.</p>;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {kind === "MOVE_TIME" && habitId && time && (
        <button
          type="button"
          disabled={pending}
          className={btnPrimary}
          onClick={() =>
            startTransition(async () => {
              const res = await moveHabitTime(habitId, time);
              if (!res.ok) return setError(res.error);
              setState("applied");
            })
          }
        >
          Move to {time}
        </button>
      )}
      {(kind === "SET_MIN" || kind === "TRY_STRETCH") && (
        <Link href="/app/habits" className={`${btnPrimary} inline-block text-white hover:text-white`}>
          Edit sizes
        </Link>
      )}
      {kind !== "KEEP_GOING" && (
        <button type="button" className={btnSecondary} onClick={() => setState("skipped")}>
          Not now
        </button>
      )}
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
