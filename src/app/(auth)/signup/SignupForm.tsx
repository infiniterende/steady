"use client";

import { useActionState } from "react";
import { signup, type AuthState } from "../actions";
import { Field, inputClass, primaryBtn } from "@/components/auth/AuthShell";

export function SignupForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(signup, {});

  if (state.checkEmail) {
    return (
      <div className="rounded-[18px] bg-mint/60 p-5 text-sm leading-relaxed">
        <div className="mb-1 text-[15px] font-bold">Check your inbox</div>
        We sent a confirmation link to <strong>{state.email}</strong>. Open it to finish creating your account, then
        come back and log in.
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Name" error={state.fieldErrors?.name}>
        <input name="name" type="text" autoComplete="name" placeholder="Nora Adeyemi" className={inputClass} />
      </Field>
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
          autoComplete="new-password"
          placeholder="At least 8 characters"
          className={inputClass}
        />
      </Field>
      {state.error && (
        <div className="rounded-[12px] bg-[#F9D8CF]/60 px-3.5 py-2.5 text-[13px] text-[#8A3F24]">{state.error}</div>
      )}
      <button type="submit" disabled={pending} className={primaryBtn}>
        {pending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
