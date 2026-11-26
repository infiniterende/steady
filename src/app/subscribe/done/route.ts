import { NextResponse } from "next/server";
import { requireAccount } from "@/lib/data";
import { stripe, syncSubscription } from "@/lib/billing";

/** Where Stripe Checkout sends people back. Records the new subscription right away so they don't wait on the webhook. */
export async function GET(request: Request) {
  const me = await requireAccount();
  const id = new URL(request.url).searchParams.get("session_id");
  if (id) {
    try {
      const session = await stripe().checkout.sessions.retrieve(id);
      const customer = typeof session.customer === "string" ? session.customer : session.customer?.id;
      const sub = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
      if (customer === me.stripeCustomerId && sub) await syncSubscription(sub);
    } catch {
      // The webhook will catch up.
    }
  }
  return NextResponse.redirect(new URL("/app", request.url), { status: 303 });
}
