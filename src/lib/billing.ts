import "server-only";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { PLAN } from "@/lib/plan";

let client: Stripe | null = null;
export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set.");
  client ??= new Stripe(key);
  return client;
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

/** The $20/month price, found by its lookup key and created (with its product) the first time. */
export async function planPriceId(): Promise<string> {
  const s = stripe();
  const found = await s.prices.list({ lookup_keys: [PLAN.lookupKey], active: true, limit: 1 });
  if (found.data[0]) return found.data[0].id;
  const product = await s.products.create({ name: PLAN.name, description: "Habits, planner, journal and focus tools" });
  const price = await s.prices.create({
    product: product.id,
    unit_amount: PLAN.priceCents,
    currency: PLAN.currency,
    recurring: { interval: PLAN.interval },
    lookup_key: PLAN.lookupKey,
  });
  return price.id;
}

/** The Stripe customer for a profile, created on first use. */
export async function customerFor(profile: { id: string; email: string; name: string; stripeCustomerId: string | null }): Promise<string> {
  if (profile.stripeCustomerId) return profile.stripeCustomerId;
  const customer = await stripe().customers.create({ email: profile.email, name: profile.name, metadata: { userId: profile.id } });
  await prisma.profile.update({ where: { id: profile.id }, data: { stripeCustomerId: customer.id } });
  return customer.id;
}

/** Copy a subscription's current state from Stripe onto the profile that owns its customer. */
export async function syncSubscription(subscriptionId: string) {
  const sub = await stripe().subscriptions.retrieve(subscriptionId);
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const periodEnd = sub.items.data[0]?.current_period_end;
  await prisma.profile.updateMany({
    where: { stripeCustomerId: customerId },
    data: {
      subscriptionId: sub.id,
      subscriptionStatus: sub.status,
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    },
  });
}
