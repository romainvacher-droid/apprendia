import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql } from "@/lib/db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const rows = await sql`SELECT stripe_customer_id FROM users WHERE email = ${session.user.email} LIMIT 1`;
  const customerId = rows[0]?.stripe_customer_id;
  if (!customerId) return NextResponse.json({ error: "Aucun abonnement trouvé" }, { status: 404 });

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.NEXTAUTH_URL}/account`,
  });

  return NextResponse.json({ url: portalSession.url });
}