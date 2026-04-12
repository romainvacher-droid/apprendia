"use client";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

export default function Navbar() {
  const { data: session } = useSession();
  const isPremium = (session?.user as { isPremium?: boolean })?.isPremium;
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="border-b border-gray-100 bg-white/95 backdrop-blur sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
          <span className="text-2xl">🧠</span>
          <span>Apprendia</span>
        </Link>

        {/* Nav desktop */}
        <nav className="hidden md:flex items-center gap-8 text-sm text-gray-600">
          <Link href="/formations" className="hover:text-gray-900 transition-colors">Formations</Link>
          <Link href="/#niveaux" className="hover:text-gray-900 transition-colors">Niveaux</Link>
          {session ? (
            <Link href="/dashboard" className="hover:text-gray-900 transition-colors">Mon parcours</Link>
          ) : (
            <Link href="/#tarifs" className="hover:text-gray-900 transition-colors">Tarifs</Link>
          )}
        </nav>

        {/* Actions desktop */}
        <div className="hidden md:flex items-center gap-3">
          {session ? (
            <>
              {isPremium && <span className="text-xs bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full font-medium">⭐ Premium</span>}
              <Link href="/account" className="text-sm text-gray-600 hover:text-gray-900">{session.user?.name ?? session.user?.email}</Link>
              <button onClick={() => signOut({ callbackUrl: "/" })}
                className="border border-gray-200 text-gray-600 text-sm px-4 py-2 rounded-full hover:bg-gray-50 transition-colors">
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">Connexion</Link>
              <Link href="/register" className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-full hover:bg-indigo-700 transition-colors">
                Commencer gratuitement
              </Link>
            </>
          )}
        </div>

        {/* Bouton hamburger mobile */}
        <button
          className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Menu"
          aria-expanded={menuOpen}
        >
          {menuOpen ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Menu mobile déroulant */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-6 py-4 space-y-3 text-sm">
          <Link href="/formations" className="block py-2 text-gray-700 hover:text-indigo-600 transition-colors" onClick={() => setMenuOpen(false)}>
            Formations
          </Link>
          <Link href="/#niveaux" className="block py-2 text-gray-700 hover:text-indigo-600 transition-colors" onClick={() => setMenuOpen(false)}>
            Niveaux
          </Link>
          {session ? (
            <>
              <Link href="/dashboard" className="block py-2 text-gray-700 hover:text-indigo-600 transition-colors" onClick={() => setMenuOpen(false)}>
                Mon parcours
              </Link>
              <Link href="/account" className="block py-2 text-gray-700 hover:text-indigo-600 transition-colors" onClick={() => setMenuOpen(false)}>
                {session.user?.name ?? session.user?.email}
                {isPremium && <span className="ml-2 text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">⭐ Premium</span>}
              </Link>
              <button onClick={() => { signOut({ callbackUrl: "/" }); setMenuOpen(false); }}
                className="block w-full text-left py-2 text-gray-500 hover:text-gray-900 transition-colors">
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="block py-2 text-gray-700 hover:text-indigo-600 transition-colors" onClick={() => setMenuOpen(false)}>
                Connexion
              </Link>
              <Link href="/register" className="block mt-1 bg-indigo-600 text-white text-center px-4 py-2.5 rounded-full hover:bg-indigo-700 transition-colors font-medium" onClick={() => setMenuOpen(false)}>
                Commencer gratuitement
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
