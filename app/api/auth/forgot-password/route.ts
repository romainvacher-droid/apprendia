import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { sql } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email requis." }, { status: 400 });
    }

    // Vérifie si l'utilisateur existe (réponse toujours générique pour éviter l'énumération d'emails)
    const rows = await sql`SELECT id FROM users WHERE lower(email) = lower(${email}) LIMIT 1`;
    const user = rows[0] as { id: number } | undefined;

    if (user) {
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 heure

      // Supprime les anciens tokens non utilisés pour cet email
      await sql`DELETE FROM password_resets WHERE email = lower(${email}) AND used = false`;

      // Crée le nouveau token
      await sql`
        INSERT INTO password_resets (email, token, expires_at)
        VALUES (lower(${email}), ${token}, ${expiresAt})
      `;

      const resetLink = `${process.env.NEXTAUTH_URL ?? "https://apprendia.vercel.app"}/reset-password?token=${token}`;

      // TODO : envoyer l'email avec resetLink via Resend ou autre provider
      // Exemple avec Resend :
      // await resend.emails.send({
      //   from: "noreply@apprendia.vercel.app",
      //   to: email,
      //   subject: "Réinitialisation de votre mot de passe Apprendia",
      //   html: `<p>Cliquez sur ce lien pour réinitialiser votre mot de passe (valable 1h) :</p>
      //          <a href="${resetLink}">${resetLink}</a>`,
      // });

      // En développement : log du lien dans la console
      if (process.env.NODE_ENV !== "production") {
        console.log(`[DEV] Lien de réinitialisation pour ${email} : ${resetLink}`);
      }
    }

    // Réponse générique dans tous les cas (sécurité)
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[forgot-password]", err);
    return NextResponse.json({ error: "Erreur serveur. Réessayez." }, { status: 500 });
  }
}
