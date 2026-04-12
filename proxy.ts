import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Rate limiting en mémoire — fonctionne par instance Vercel
// Pour la production à forte charge, remplacer par Upstash Redis
const rateLimit = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMITS: Record<string, { max: number; windowMs: number }> = {
  "/api/auth/register": { max: 5, windowMs: 15 * 60 * 1000 },
  "/api/auth/signin":   { max: 10, windowMs: 15 * 60 * 1000 },
};

function checkRateLimit(ip: string, path: string): boolean {
  const config = RATE_LIMITS[path];
  if (!config) return true;
  const key = `${ip}:${path}`;
  const now = Date.now();
  const entry = rateLimit.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimit.set(key, { count: 1, resetAt: now + config.windowMs });
    return true;
  }
  if (entry.count >= config.max) return false;
  entry.count++;
  return true;
}

// Routes POST protégées contre le CSRF par vérification d'origine
const CSRF_PROTECTED = [
  "/api/auth/register",
  "/api/progress",
  "/api/stripe/checkout",
  "/api/stripe/portal",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // Vérification CSRF
  if (method === "POST" && CSRF_PROTECTED.some((p) => pathname.startsWith(p))) {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    const allowedOrigin = process.env.NEXTAUTH_URL ?? `https://${host}`;
    if (origin && !origin.startsWith(allowedOrigin)) {
      return NextResponse.json({ error: "Origine non autorisée" }, { status: 403 });
    }
  }

  // Rate limiting
  if (method === "POST" && RATE_LIMITS[pathname]) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";
    if (!checkRateLimit(ip, pathname)) {
      return NextResponse.json(
        { error: "Trop de tentatives. Réessayez dans 15 minutes." },
        { status: 429 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/auth/register", "/api/auth/signin", "/api/progress/:path*", "/api/stripe/:path*"],
};
