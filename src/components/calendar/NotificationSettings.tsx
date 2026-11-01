"use client";

import { useOptimistic, useState, useSyncExternalStore, useTransition } from "react";
import { setNotificationSetting, setReminderPrefs } from "@/app/app/actions";

type Settings = { quietHours: boolean; weeklyDigest: boolean; blockReminders: boolean; reminderLead: number };

const pill = (on: boolean) => ({
  border: `1px solid ${on ? "#6B705C" : "#E8DDD3"}`,
  background: on ? "#6B705C" : "#fff",
  color: on ? "#fff" : "oklch(0.45 0.014 80)",
});

export function NotificationSettings({ settings }: { settings: Settings }) {
  const [, startTransition] = useTransition();
  const [s, mutate] = useOptimistic(settings, (state: Settings, patch: Partial<Settings>) => ({ ...state, ...patch }));
  const [permOverride, setPermOverride] = useState<NotificationPermission | null>(null);
  const browserPerm = useSyncExternalStore(
    () => () => {},
    () => (typeof Notification === "undefined" ? "unsupported" : Notification.permission),
    () => "default" as const,
  );
  const perm: "unsupported" | NotificationPermission = permOverride ?? browserPerm;

  const toggle = (key: "quietHours" | "weeklyDigest") =>
    startTransition(async () => {
      mutate({ [key]: !s[key] });
      await setNotificationSetting(key, !s[key]);
    });

  const setPrefs = (patch: Partial<Pick<Settings, "blockReminders" | "reminderLead">>) =>
    startTransition(async () => {
      mutate(patch);
      await setReminderPrefs(patch);
    });

  const askPermission = async () => {
    if (typeof Notification === "undefined") return;
    const r = await Notification.requestPermission();
    setPermOverride(r);
    if (r === "granted") new Notification("Steady reminders are on", { body: "You'll get a heads-up before each block.", silent: true });
  };

  return (
    <>
      <h2 className="mb-4 text-[19px] font-bold">Notification settings</h2>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3.5 rounded-[14px] border border-line bg-surface p-[15px]">
          <span className="min-w-[160px] flex-1">
            <span className="block text-sm font-semibold">Heads-up before each block</span>
            <span className="block text-xs text-muted-2">A reminder a few minutes before every timed block, event and task on your schedule</span>
          </span>
          <select
            value={s.reminderLead}
            onChange={(e) => setPrefs({ reminderLead: Number(e.target.value) })}
            aria-label="Lead time"
            className="rounded-[9px] border border-soft bg-white px-2.5 py-1.5 text-xs font-semibold text-[oklch(0.45_0.014_80)] outline-none"
          >
            {[5, 10, 15, 30].map((m) => <option key={m} value={m}>{m} min before</option>)}
          </select>
          <button type="button" aria-pressed={s.blockReminders} onClick={() => setPrefs({ blockReminders: !s.blockReminders })} className="cursor-pointer rounded-full px-3.5 py-[7px] text-xs font-semibold hover:opacity-90" style={pill(s.blockReminders)}>
            {s.blockReminders ? `On · ${s.reminderLead} min before` : "Off"}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3.5 rounded-[14px] border border-line bg-surface p-[15px]">
          <span className="min-w-[160px] flex-1">
            <span className="block text-sm font-semibold">Browser notifications</span>
            <span className="block text-xs text-muted-2">
              {perm === "granted" ? "Allowed. Reminders pop up while Steady is open in a tab." : perm === "denied" ? "Blocked in your browser settings. In-app toasts still show." : perm === "unsupported" ? "Not supported in this browser. In-app toasts still show." : "Allow Steady to show reminders as system notifications."}
            </span>
          </span>
          {perm === "default" && (
            <button type="button" onClick={askPermission} className="cursor-pointer rounded-full px-3.5 py-[7px] text-xs font-semibold hover:opacity-90" style={pill(true)}>
              Enable
            </button>
          )}
          {perm === "granted" && <span className="rounded-full px-3.5 py-[7px] text-xs font-semibold" style={pill(true)}>On</span>}
        </div>

        {(
          [
            { key: "quietHours", title: "Quiet hours", body: "Hold reminders overnight and deliver the first one at wake-up", onLabel: "On · 10pm to 6am" },
            { key: "weeklyDigest", title: "Weekly digest", body: "A summary of streaks, misses and goal pace before your review", onLabel: "On · Sunday 7pm" },
          ] as const
        ).map((r) => {
          const on = s[r.key];
          return (
            <div key={r.key} className="flex flex-wrap items-center gap-3.5 rounded-[14px] border border-line bg-surface p-[15px]">
              <span className="min-w-[160px] flex-1">
                <span className="block text-sm font-semibold">{r.title}</span>
                <span className="block text-xs text-muted-2">{r.body}</span>
              </span>
              <button type="button" aria-pressed={on} onClick={() => toggle(r.key)} className="cursor-pointer rounded-full px-3.5 py-[7px] text-xs font-semibold hover:opacity-90" style={pill(on)}>
                {on ? r.onLabel : "Off"}
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
