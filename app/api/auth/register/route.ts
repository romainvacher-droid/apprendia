import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const { email, password, name } = await req.json();
  if (!email || !password) return NextResponse.json({ error: "Email et mot de passe requis" }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Mot de passe trop court (8 caractères min)" }, { status: 400 });

  const existing = await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
  if (existing.length > 0) return NextResponse.json({ error: "Email déjà utilisé" }, { status: 409 });

  const hash = await bcrypt.hash(password, 12);
  await sql`INSERT INTO users (email, password_hash, name) VALUES (${email}, ${hash}, ${name ?? null})`;
  return NextResponse.json({ success: true });
}