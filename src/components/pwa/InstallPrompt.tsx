"use client";

import { useEffect, useState } from "react";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const DISMISS_KEY = "steady.install.dismissed";
const QUIET_DAYS = 14;

/** A slim banner on phones: a one-tap install where the browser supports it, instructions on iPhone. */
export function InstallPrompt() {
  const [mode, setMode] = useState<"hidden" | "native" | "ios">("hidden");
  const [event, setEvent] = useState<InstallEvent | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
      const phone = window.matchMedia("(pointer: coarse)").matches && window.innerWidth < 900;
      let quiet = false;
      try {
        const at = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
        quiet = Date.now() - at < QUIET_DAYS * 86_400_000;
      } catch {}
      if (standalone || !phone || quiet) return;
      const ua = navigator.userAgent;
      const ios = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Mac") && navigator.maxTouchPoints > 1);
      if (ios) setMode("ios");
    }, 0);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      let quiet = false;
      try {
        quiet = Date.now() - Number(localStorage.getItem(DISMISS_KEY) ?? 0) < QUIET_DAYS * 86_400_000;
      } catch {}
      if (quiet) return;
      setEvent(e as InstallEvent);
      setMode("native");
    };
    const onInstalled = () => setMode("hidden");
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      clearTimeout(t);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
    setMode("hidden");
  };

  if (mode === "hidden") return null;
  return (
    <div className="mx-4 mt-3 flex items-center gap-3 rounded-2xl border border-line bg-white p-3 text-[13px] md:hidden" role="region" aria-label="Install Steady">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-olive text-sm font-bold text-white">st</span>
      <span className="min-w-0 flex-1 leading-snug text-muted">
        {mode === "native" ? (
          <>
            <b className="block text-ink">Install Steady</b>Add it to your home screen for one-tap access.
          </>
        ) : (
          <>
            <b className="block text-ink">Add Steady to your home screen</b>
            Tap <span aria-label="Share">the Share button</span>, then &ldquo;Add to Home Screen&rdquo;.
          </>
        )}
      </span>
      {mode === "native" && event && (
        <button
          type="button"
          className="cursor-pointer rounded-[10px] border-0 bg-olive px-3.5 py-2 text-xs font-semibold text-white"
          onClick={async () => {
            await event.prompt();
            const { outcome } = await event.userChoice;
            if (outcome === "accepted") setMode("hidden");
            else dismiss();
          }}
        >
          Install
        </button>
      )}
      <button type="button" aria-label="Dismiss" onClick={dismiss} className="h-8 w-8 shrink-0 cursor-pointer border-0 bg-transparent text-lg text-muted-3">
        ×
      </button>
    </div>
  );
}
