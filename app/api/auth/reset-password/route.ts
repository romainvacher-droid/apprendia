import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Token manquant." }, { status: 400 });
    }
    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json({ error: "Mot de passe trop court (8 caractères minimum)." }, { status: 400 });
    }

    // Récupère le token valide et non utilisé
    const rows = await sql`
      SELECT id, email, expires_at, used
      FROM password_resets
      WHERE token = ${token}
      LIMIT 1
    `;
    const reset = rows[0] as { id: number; email: string; expires_at: Date; used: boolean } | undefined;

    if (!reset) {
      return NextResponse.json({ error: "Lien invalide ou déjà utilisé." }, { status: 400 });
    }
    if (reset.used) {
      return NextResponse.json({ error: "Ce lien a déjà été utilisé." }, { status: 400 });
    }
    if (new Date(reset.expires_at) < new Date()) {
      return NextResponse.json({ error: "Ce lien a expiré. Faites une nouvelle demande." }, { status: 400 });
    }

    // Met à jour le mot de passe
    const hash = await bcrypt.hash(password, 12);
    await sql`UPDATE users SET password_hash = ${hash} WHERE lower(email) = ${reset.email}`;

    // Marque le token comme utilisé
    await sql`UPDATE password_resets SET used = true WHERE id = ${reset.id}`;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[reset-password]", err);
    return NextResponse.json({ error: "Erreur serveur. Réessayez." }, { status: 500 });
  }
}
