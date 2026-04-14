import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { sql } from "@/lib/db";
import { Resend } from "resend";

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

      if (process.env.RESEND_API_KEY) {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: "Apprendia <noreply@apprendia.vercel.app>",
          to: email,
          subject: "Réinitialisation de votre mot de passe Apprendia",
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
              <h2 style="color: #1e293b; margin-bottom: 8px;">Réinitialisation de mot de passe</h2>
              <p style="color: #475569; margin-bottom: 24px;">
                Vous avez demandé à réinitialiser votre mot de passe Apprendia.
                Cliquez sur le bouton ci-dessous — ce lien est valable <strong>1 heure</strong>.
              </p>
              <a href="${resetLink}" style="display: inline-block; background: #4f46e5; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">
                Réinitialiser mon mot de passe
              </a>
              <p style="color: #94a3b8; font-size: 13px; margin-top: 24px;">
                Si vous n'avez pas fait cette demande, ignorez cet email.
                Votre mot de passe ne sera pas modifié.
              </p>
              <p style="color: #cbd5e1; font-size: 12px; margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
                Apprendia · <a href="https://apprendia.vercel.app" style="color: #a5b4fc;">apprendia.vercel.app</a>
              </p>
            </div>
          `,
        });
      } else {
        // En développement sans clé Resend : log du lien dans la console
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
