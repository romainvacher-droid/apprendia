import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { sql } from "@/lib/db";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const rows = await sql`SELECT * FROM users WHERE email = ${credentials.email} LIMIT 1`;
        const user = rows[0];
        if (!user) return null;
        const valid = await bcrypt.compare(credentials.password, user.password_hash);
        if (!valid) return null;
        return { id: String(user.id), email: user.email, name: user.name, isPremium: user.is_premium };
      },
    }),
  ],
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.isPremium = (user as { isPremium?: boolean }).isPremium ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string; isPremium?: boolean }).id = token.id as string;
        (session.user as { id?: string; isPremium?: boolean }).isPremium = token.isPremium as boolean;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};