export default function Navbar() {
  return (
    <header className="border-b border-gray-100 bg-white/95 backdrop-blur sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2 font-semibold text-lg">
          <span className="text-2xl">🧠</span>
          <span>IA Academy Hub</span>
        </a>
        <nav className="hidden md:flex items-center gap-8 text-sm text-gray-600">
          <a href="/formations" className="hover:text-gray-900 transition-colors">Formations</a>
          <a href="#niveaux" className="hover:text-gray-900 transition-colors">Niveaux</a>
          <a href="#tarifs" className="hover:text-gray-900 transition-colors">Tarifs</a>
        </nav>
        <div className="flex items-center gap-3">
          <a href="/formations" className="text-sm text-gray-600 hover:text-gray-900 hidden md:block">Connexion</a>
          <a href="/formations" className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-full hover:bg-indigo-700 transition-colors">
            Commencer gratuitement
          </a>
        </div>
      </div>
    </header>
  );
}
