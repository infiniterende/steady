import { redirect } from "next/navigation";
import { AuthShell, primaryBtn } from "@/components/auth/AuthShell";
import { requireAccount } from "@/lib/data";
import { PLAN_LABEL, hasAccess } from "@/lib/plan";
import { startCheckout } from "./actions";

export const metadata = { title: "Subscribe — Steady" };

const INCLUDED = [
  "Habits with minimum, standard and stretch sizes",
  "Today: three priorities, Help me start, focus timer",
  "Planner, Work board, calendar and schedule",
  "Journal with photos, weekly review and reminders",
];

export default async function SubscribePage() {
  const me = await requireAccount();
  if (hasAccess(me)) redirect("/app");
  const lapsed = me.subscriptionStatus !== null;

  return (
    <AuthShell
      title={lapsed ? "Your subscription has ended" : "One plan, everything included"}
      subtitle={lapsed ? "Resubscribe to pick up where you left off. Your habits and entries are saved." : "Start your plan to open Steady. Cancel anytime from your profile."}
      footer={
        <form action="/auth/signout" method="post">
          Not {me.email}?{" "}
          <button type="submit" className="cursor-pointer border-0 bg-transparent p-0 font-semibold underline underline-offset-4">
            Log out
          </button>
        </form>
      }
    >
      <div className="mb-5 flex items-baseline gap-1.5">
        <span className="text-[40px] font-extrabold tracking-[-0.03em]">$20</span>
        <span className="text-sm text-[#5C554E]">per month</span>
      </div>
      <ul className="mb-7 flex flex-col gap-2.5 text-sm text-[#3A3530]">
        {INCLUDED.map((i) => (
          <li key={i} className="flex gap-2.5">
            <span aria-hidden className="text-[#6B705C]">✓</span>
            {i}
          </li>
        ))}
      </ul>
      <form action={startCheckout}>
        <button type="submit" className={primaryBtn}>
          {lapsed ? "Resubscribe" : "Subscribe"} · {PLAN_LABEL}
        </button>
      </form>
      <p className="mt-3 text-center text-xs text-[#8A8178]">Secure checkout by Stripe. Billed monthly until you cancel.</p>
    </AuthShell>
  );
}
