"use client";

import { useOptimistic, useTransition } from "react";
import { setNotificationSetting } from "@/app/app/actions";

type Settings = { quietHours: boolean; weeklyDigest: boolean };

export function NotificationSettings({ settings }: { settings: Settings }) {
  const [, startTransition] = useTransition();
  const [s, mutate] = useOptimistic(settings, (state: Settings, patch: Partial<Settings>) => ({ ...state, ...patch }));

  const toggle = (key: keyof Settings) =>
    startTransition(async () => {
      mutate({ [key]: !s[key] });
      await setNotificationSetting(key, !s[key]);
    });

  const rows: { key: keyof Settings; title: string; body: string; onLabel: string }[] = [
    { key: "quietHours", title: "Quiet hours", body: "Hold reminders overnight and deliver the first one at wake-up", onLabel: "On · 10pm to 6am" },
    { key: "weeklyDigest", title: "Weekly digest", body: "A summary of streaks, misses and goal pace before your review", onLabel: "On · Sunday 7pm" },
  ];

  return (
    <>
      <h2 className="mb-4 text-[19px] font-bold">Notification settings</h2>
      <div className="flex flex-col gap-3">
        {rows.map((r) => {
          const on = s[r.key];
          return (
            <div key={r.key} className="flex flex-wrap items-center gap-3.5 rounded-[14px] border border-line bg-surface p-[15px]">
              <span className="min-w-[160px] flex-1">
                <span className="block text-sm font-semibold">{r.title}</span>
                <span className="block text-xs text-muted-2">{r.body}</span>
              </span>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => toggle(r.key)}
                className="cursor-pointer rounded-full px-3.5 py-[7px] text-xs font-semibold hover:opacity-90"
                style={{
                  border: `1px solid ${on ? "#6B705C" : "#E8DDD3"}`,
                  background: on ? "#6B705C" : "#fff",
                  color: on ? "#fff" : "oklch(0.45 0.014 80)",
                }}
              >
                {on ? r.onLabel : "Off"}
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
