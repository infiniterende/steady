/** Browser-side helpers for planner reminders: sound and system notifications. */

const SOUND_KEY = "steady.planner.sound";
let ctx: AudioContext | null = null;

export function soundEnabled(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundEnabled(on: boolean) {
  try {
    localStorage.setItem(SOUND_KEY, on ? "on" : "off");
  } catch {}
}

function audio(): AudioContext | null {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    return ctx;
  } catch {
    return null;
  }
}

/** Browsers only allow sound after the person has interacted with the page, so unlock on first input. */
export function installAudioUnlock(): () => void {
  const unlock = () => {
    const c = audio();
    if (c && c.state === "suspended") void c.resume();
  };
  const events = ["pointerdown", "keydown", "touchstart"] as const;
  events.forEach((e) => window.addEventListener(e, unlock, { passive: true }));
  return () => events.forEach((e) => window.removeEventListener(e, unlock));
}

/** A short two-note chime, played three times. Returns false if the browser blocked audio. */
export function playChime(): boolean {
  const c = audio();
  if (!c) return false;
  if (c.state === "suspended") void c.resume();
  if (c.state !== "running") return false;
  const note = (freq: number, at: number, len: number) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.25, at + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, at + len);
    o.connect(g).connect(c.destination);
    o.start(at);
    o.stop(at + len + 0.05);
  };
  const t0 = c.currentTime + 0.05;
  for (let i = 0; i < 3; i++) {
    note(880, t0 + i * 1.1, 0.45);
    note(1174.66, t0 + i * 1.1 + 0.22, 0.6);
  }
  return true;
}

export function notificationState(): "granted" | "denied" | "default" | "unsupported" {
  return typeof Notification === "undefined" ? "unsupported" : Notification.permission;
}

export async function askNotificationPermission() {
  if (typeof Notification === "undefined") return "unsupported" as const;
  return Notification.requestPermission();
}

export function systemNotify(title: string, body: string, tag: string) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, tag, requireInteraction: true });
  } catch {}
}
