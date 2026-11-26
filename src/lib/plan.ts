/** The one paid plan. Shared by the paywall page and the server code that creates the Stripe price. */
export const PLAN = { name: "Steady", priceCents: 2000, currency: "usd", interval: "month" as const, lookupKey: "steady_monthly_20" };
export const PLAN_LABEL = "$20/month";

/** Subscription states that keep the app open. past_due stays open while Stripe retries the card. */
const OPEN = new Set(["active", "trialing", "past_due"]);

export function hasAccess(p: { comped: boolean; subscriptionStatus: string | null }): boolean {
  return p.comped || (p.subscriptionStatus !== null && OPEN.has(p.subscriptionStatus));
}
