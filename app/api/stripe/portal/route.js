import { NextResponse } from "next/server";
import Stripe from "stripe";
import { serverClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

/**
 * POST /api/stripe/portal
 *
 * Opens a Stripe Customer Portal session so the user can manage their
 * subscription (cancel, change card, view invoices).
 */
export async function POST() {
  if (!stripe) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const supabase = await serverClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .single();

  if (!profile?.stripe_customer_id) {
    return NextResponse.json({ error: "No subscription found." }, { status: 404 });
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://agdesk.vercel.app";

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/#SET`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Portal error:", err);
    return NextResponse.json({ error: "Could not open portal." }, { status: 500 });
  }
}
