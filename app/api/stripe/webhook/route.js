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

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const userId = session.client_reference_id || session.metadata?.supabase_user_id;
      if (!userId) break;

      // Retrieve the subscription to get its status and period.
      const sub = await stripe.subscriptions.retrieve(session.subscription);

      await db.from("profiles").upsert({
        id: userId,
        stripe_customer_id: session.customer,
        stripe_subscription_id: sub.id,
        stripe_status: sub.status,
        plan: "pro",
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object;
      const customerId = sub.customer;

      // Look up the user by their Stripe customer id.
      const { data: profile } = await db
        .from("profiles")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .single();

      if (profile) {
        const active = ["active", "trialing"].includes(sub.status);
        await db.from("profiles").update({
          stripe_status: sub.status,
          plan: active ? "pro" : "free",
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", profile.id);
      }
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
