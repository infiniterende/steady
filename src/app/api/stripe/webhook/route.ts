import type Stripe from "stripe";
import { stripe, syncSubscription } from "@/lib/billing";

/** Stripe calls this when a subscription starts, renews, changes, fails to pay or ends. */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) return new Response("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = await stripe().webhooks.constructEventAsync(await request.text(), signature, secret);
  } catch {
    return new Response("Bad signature", { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const sub = event.data.object.subscription;
      if (sub) await syncSubscription(typeof sub === "string" ? sub : sub.id);
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "customer.subscription.paused":
    case "customer.subscription.resumed":
      await syncSubscription(event.data.object.id);
      break;
  }
  return Response.json({ received: true });
}
