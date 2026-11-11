import { NextResponse } from "next/server";
import Stripe from "stripe";
import { serverClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

/**
 * POST /api/stripe/checkout
 *
 * Creates a Stripe Checkout session for a paid plan. The body names it:
 * { "plan": "plus" } is $20 a month, { "plan": "pro" } is $100 a month.
 * The price ids come from STRIPE_PRICE_PLUS and STRIPE_PRICE_PRO.
 * The user must be signed in — we attach their Supabase user id as
 * client_reference_id so the webhook can link the subscription back.
 */
export async function POST(req) {
  if (!stripe) {
    return NextResponse.json(
      { error: "Payments are not configured yet." },
      { status: 503 }
    );
  }

  const supabase = await serverClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://agdesk.vercel.app";
  const body = await req.json().catch(() => ({}));
  const plan = body?.plan === "pro" ? "pro" : "plus";
  const priceId = plan === "pro" ? process.env.STRIPE_PRICE_PRO : process.env.STRIPE_PRICE_PLUS;

  if (!priceId) {
    return NextResponse.json(
      { error: "Paid plans are not switched on yet." },
      { status: 503 }
    );
  }

  // Check if user already has a Stripe customer id stored.
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .single();

  const sessionParams = {
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/?upgraded=1#SET`,
    cancel_url: `${origin}/#SET`,
    client_reference_id: user.id,
    metadata: { supabase_user_id: user.id, plan },
    subscription_data: { metadata: { supabase_user_id: user.id, plan } },
  };

  // If we already know their Stripe customer, reuse it.
  if (profile?.stripe_customer_id) {
    sessionParams.customer = profile.stripe_customer_id;
  } else {
    sessionParams.customer_email = user.email;
  }

  try {
    const session = await stripe.checkout.sessions.create(sessionParams);
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json(
      { error: "Could not start checkout." },
      { status: 500 }
    );
  }
}
