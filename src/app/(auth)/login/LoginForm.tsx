"use client";

import { useActionState } from "react";
import { login, type AuthState } from "../actions";
import { Field, inputClass, primaryBtn } from "@/components/auth/AuthShell";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(login, {});

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <Field label="Email" error={state.fieldErrors?.email}>
        <input
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={state.email ?? ""}
          placeholder="you@example.com"
          className={inputClass}
        />
      </Field>
      <Field label="Password" error={state.fieldErrors?.password}>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          className={inputClass}
        />
      </Field>
      {state.error && (
        <div className="rounded-[12px] bg-[#F9D8CF]/60 px-3.5 py-2.5 text-[13px] text-[#8A3F24]">{state.error}</div>
      )}
      <button type="submit" disabled={pending} className={primaryBtn}>
        {pending ? "Signing in…" : "Log in"}
      </button>
    </form>
  );
}
