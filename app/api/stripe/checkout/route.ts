import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql } from "@/lib/db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const rows = await sql`SELECT id, stripe_customer_id FROM users WHERE email = ${session.user.email} LIMIT 1`;
  const user = rows[0];
  if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  let customerId = user.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: session.user.email });
    customerId = customer.id;
    await sql`UPDATE users SET stripe_customer_id = ${customerId} WHERE id = ${user.id}`;
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    success_url: `${process.env.NEXTAUTH_URL}/account?success=1`,
    cancel_url: `${process.env.NEXTAUTH_URL}/formations`,
  });

  return NextResponse.json({ url: checkoutSession.url });
}