import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";

const RegisterSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Mot de passe trop court (8 caractères min)"),
  name: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = RegisterSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }
    const { email, password, name } = result.data;

    const existing = await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
    // Message générique — ne révèle pas si l'email existe déjà (anti-enumération)
    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Impossible de créer ce compte. Vérifiez vos informations." },
        { status: 409 }
      );
    }

    const hash = await bcrypt.hash(password, 12);
    await sql`INSERT INTO users (email, password_hash, name) VALUES (${email}, ${hash}, ${name ?? null})`;
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
