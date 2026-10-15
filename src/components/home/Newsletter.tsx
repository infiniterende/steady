"use client";

import { useState } from "react";

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const subscribe = () => {
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Enter a valid email.");
      return;
    }
    setError("");
    setSubscribed(true);
  };

  return (
    <div className="mt-11 flex flex-wrap items-center justify-between gap-4 rounded-[18px] bg-home-bg p-5">
      <div>
        <div className="text-[15px] font-semibold">The Sunday note</div>
        <div className="text-[13px] text-[#5C554E]">One short email a week on keeping routines alive.</div>
      </div>
      <form
        className="flex max-w-[420px] flex-[1_1_300px] gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          subscribe();
        }}
      >
        <input
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError("");
            setSubscribed(false);
          }}
          placeholder="you@example.com"
          aria-label="Email address"
          className="min-w-0 flex-1 rounded-full border border-home-line bg-white px-3.5 py-[11px] text-sm text-inherit outline-none"
        />
        <button
          type="submit"
          className="cursor-pointer rounded-full border-0 bg-[#3A3530] px-[18px] py-[11px] text-sm font-semibold text-white hover:bg-[#28241F]"
        >
          {subscribed ? "Subscribed" : "Subscribe"}
        </button>
      </form>
      {error && <div className="flex-[1_1_100%] text-right text-xs text-[#A8452E]">{error}</div>}
    </div>
  );
}
