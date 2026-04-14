import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-white py-10 mt-auto">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors">
            <span className="text-xl">🧠</span>
            <span>Apprendia</span>
          </Link>
          <nav className="flex flex-wrap justify-center gap-5 text-sm text-gray-400">
            <Link href="/formations" className="hover:text-gray-700 transition-colors">Formations</Link>
            <Link href="/#tarifs" className="hover:text-gray-700 transition-colors">Tarifs</Link>
            <Link href="/mentions-legales" className="hover:text-gray-700 transition-colors">Mentions légales</Link>
            <Link href="/mentions-legales#cgv" className="hover:text-gray-700 transition-colors">CGV</Link>
            <Link href="/mentions-legales#rgpd" className="hover:text-gray-700 transition-colors">Données personnelles</Link>
          </nav>
          <p className="text-xs text-gray-300">© 2026 Apprendia</p>
        </div>
      </div>
    </footer>
  );
}
