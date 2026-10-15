"use client";

import { useState, useTransition } from "react";
import { updateProfile } from "@/app/app/actions";
import { ErrorText, btnPrimary, inputBase } from "@/components/app/ui";

export function ProfileForm({ name, about, pointsGoal }: { name: string; about: string; pointsGoal: number }) {
  const [n, setN] = useState(name);
  const [a, setA] = useState(about);
  const [g, setG] = useState(String(pointsGoal));
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      const res = await updateProfile({ name: n, about: a, pointsGoal: parseInt(g, 10) });
      if (!res.ok) return setError(res.error);
      setError("");
      setSaved(true);
    });

  return (
    <div className="flex flex-col gap-3">
      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-muted-2">Name</span>
        <input value={n} onChange={(e) => { setN(e.target.value); setError(""); setSaved(false); }} className={`${inputBase} w-full`} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-muted-2">About</span>
        <textarea value={a} onChange={(e) => { setA(e.target.value); setSaved(false); }} rows={3} maxLength={400} className={`${inputBase} w-full resize-y`} placeholder="What are you building toward?" />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-muted-2">Daily points goal</span>
        <input value={g} onChange={(e) => { setG(e.target.value); setError(""); setSaved(false); }} inputMode="numeric" className={`${inputBase} w-[120px]`} />
      </label>
      {error && <ErrorText>{error}</ErrorText>}
      <div className="flex items-center gap-3">
        <button type="button" onClick={save} disabled={pending} className={btnPrimary}>
          {pending ? "Saving…" : "Save changes"}
        </button>
        {saved && <span className="text-xs text-muted">Saved.</span>}
      </div>
    </div>
  );
}
