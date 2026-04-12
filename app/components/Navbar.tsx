"use client";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

export default function Navbar() {
  const { data: session } = useSession();
  const isPremium = (session?.user as { isPremium?: boolean })?.isPremium;

  return (
    <header className="border-b border-gray-100 bg-white/95 backdrop-blur sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
          <span className="text-2xl">🧠</span>
          <span>Apprendia</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm text-gray-600">
          <Link href="/formations" className="hover:text-gray-900 transition-colors">Formations</Link>
          <Link href="/#niveaux" className="hover:text-gray-900 transition-colors">Niveaux</Link>
          {session ? (
            <Link href="/dashboard" className="hover:text-gray-900 transition-colors">Mon parcours</Link>
          ) : (
            <Link href="/#tarifs" className="hover:text-gray-900 transition-colors">Tarifs</Link>
          )}
        </nav>
        <div className="flex items-center gap-3">
          {session ? (
            <>
              {isPremium && <span className="text-xs bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full font-medium hidden md:block">⭐ Premium</span>}
              <Link href="/account" className="text-sm text-gray-600 hover:text-gray-900 hidden md:block">{session.user?.name ?? session.user?.email}</Link>
              <button onClick={() => signOut({ callbackUrl: "/" })}
                className="border border-gray-200 text-gray-600 text-sm px-4 py-2 rounded-full hover:bg-gray-50 transition-colors hidden md:block">
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 hidden md:block">Connexion</Link>
              <Link href="/register" className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-full hover:bg-indigo-700 transition-colors">
                Commencer gratuitement
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}