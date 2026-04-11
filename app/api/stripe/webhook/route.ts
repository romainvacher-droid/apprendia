import { NextResponse } from "next/server";
import Stripe from "stripe";
import { sql } from "@/lib/db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Webhook signature invalide" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    const periodEnd = new Date((sub as Stripe.Subscription & { current_period_end: number }).current_period_end * 1000);
    const rows = await sql`SELECT id FROM users WHERE stripe_customer_id = ${customerId} LIMIT 1`;
    if (rows[0]) {
      const userId = rows[0].id;
      await sql`UPDATE users SET is_premium = true WHERE id = ${userId}`;
      await sql`INSERT INTO subscriptions (user_id, stripe_subscription_id, stripe_price_id, status, current_period_end)
        VALUES (${userId}, ${subscriptionId}, ${sub.items.data[0].price.id}, ${sub.status}, ${periodEnd})
        ON CONFLICT (stripe_subscription_id) DO UPDATE SET status = ${sub.status}, current_period_end = ${periodEnd}, updated_at = NOW()`;
    }
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription & { current_period_end: number };
    const isActive = sub.status === "active" || sub.status === "trialing";
    const periodEnd = new Date(sub.current_period_end * 1000);
    const rows = await sql`SELECT id FROM users WHERE stripe_customer_id = ${sub.customer as string} LIMIT 1`;
    if (rows[0]) {
      await sql`UPDATE users SET is_premium = ${isActive} WHERE id = ${rows[0].id}`;
      await sql`UPDATE subscriptions SET status = ${sub.status}, current_period_end = ${periodEnd}, updated_at = NOW()
        WHERE stripe_subscription_id = ${sub.id}`;
    }
  }

  return NextResponse.json({ received: true });
}