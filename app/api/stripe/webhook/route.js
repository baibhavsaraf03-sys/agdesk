import { NextResponse } from "next/server";
import Stripe from "stripe";
import { adminClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * POST /api/stripe/webhook
 *
 * Stripe sends events here. We care about:
 *   checkout.session.completed  — new subscription
 *   customer.subscription.updated — plan change, renewal
 *   customer.subscription.deleted — cancellation
 *
 * Each event writes the subscription status into the `profiles` table
 * so the client can check it with a simple select.
 */
export async function POST(req) {
  if (!stripe || !WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature failed:", err.message);
    return NextResponse.json({ error: "Bad signature" }, { status: 400 });
  }

  const db = adminClient();

  /** Which plan a subscription is for, read from its price. */
  const planOf = (sub) => {
    const price = sub?.items?.data?.[0]?.price?.id;
    if (price && price === process.env.STRIPE_PRICE_PRO) return "pro";
    if (price && price === process.env.STRIPE_PRICE_PLUS) return "plus";
    return sub?.metadata?.plan === "pro" ? "pro" : "plus";
  };
  /** Newer Stripe API versions moved the period end onto the item. */
  const periodEnd = (sub) => {
    const t = sub?.current_period_end ?? sub?.items?.data?.[0]?.current_period_end;
    return t ? new Date(t * 1000).toISOString() : null;
  };

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const userId = session.client_reference_id || session.metadata?.supabase_user_id;
      if (!userId || !session.subscription) break;

      const sub = await stripe.subscriptions.retrieve(session.subscription);

      await db.from("profiles").upsert({
        user_id: userId,
        stripe_customer_id: session.customer,
        stripe_subscription_id: sub.id,
        stripe_status: sub.status,
        plan: planOf(sub),
        current_period_end: periodEnd(sub),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object;

      const { data: profile } = await db
        .from("profiles")
        .select("user_id")
        .eq("stripe_customer_id", sub.customer)
        .single();

      if (profile) {
        const active = event.type !== "customer.subscription.deleted" && ["active", "trialing"].includes(sub.status);
        await db.from("profiles").update({
          stripe_status: sub.status,
          plan: active ? planOf(sub) : "free",
          current_period_end: periodEnd(sub),
          updated_at: new Date().toISOString(),
        }).eq("user_id", profile.user_id);
      }
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
