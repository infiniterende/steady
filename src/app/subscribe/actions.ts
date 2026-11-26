"use server";

import { redirect } from "next/navigation";
import { requireAccount } from "@/lib/data";
import { customerFor, planPriceId, siteUrl, stripe } from "@/lib/billing";

/** Send the signed-in person to Stripe Checkout for the monthly plan. */
export async function startCheckout() {
  const me = await requireAccount();
  const customer = await customerFor(me);
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer,
    client_reference_id: me.id,
    line_items: [{ price: await planPriceId(), quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${siteUrl()}/subscribe/done?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl()}/subscribe`,
  });
  redirect(session.url!);
}

/** Stripe's hosted page for changing card, viewing invoices or cancelling. */
export async function openBillingPortal() {
  const me = await requireAccount();
  if (!me.stripeCustomerId) redirect("/subscribe");
  const session = await stripe().billingPortal.sessions.create({ customer: me.stripeCustomerId, return_url: `${siteUrl()}/app/profile` });
  redirect(session.url);
}
