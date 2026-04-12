const stats = [
  { value: "12+", label: "formations" },
  { value: "3", label: "niveaux" },
  { value: "100%", label: "pratique" },
  { value: "∞", label: "accès à vie" },
];

const featuredCourses = [
  {
    id: 1,
    title: "Introduction à l'IA",
    description: "Comprendre comment fonctionne l'intelligence artificielle sans prérequis techniques.",
    level: "Débutant",
    levelColor: "bg-green-100 text-green-700",
    duration: "3h",
    free: true,
    emoji: "🌱",
  },
  {
    id: 2,
    title: "Prompt Engineering",
    description: "Maîtrisez l'art de communiquer avec les LLMs pour des résultats professionnels.",
    level: "Débutant",
    levelColor: "bg-green-100 text-green-700",
    duration: "5h",
    free: true,
    emoji: "✍️",
  },
  {
    id: 3,
    title: "Automatisation avec l'IA",
    description: "Construisez des workflows intelligents avec Make, Zapier et les APIs LLM.",
    level: "Intermédiaire",
    levelColor: "bg-orange-100 text-orange-700",
    duration: "8h",
    free: false,
    emoji: "⚙️",
  },
  {
    id: 4,
    title: "Créer son agent IA",
    description: "Développez des agents autonomes capables de raisonner et d'agir.",
    level: "Avancé",
    levelColor: "bg-purple-100 text-purple-700",
    duration: "12h",
    free: false,
    emoji: "🤖",
  },
];

export default function Home() {
  return (
    <main>
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <span className="inline-block bg-indigo-50 text-indigo-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
          Formations IA · Tous niveaux
        </span>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-gray-900 leading-tight mb-6">
          Apprenez l'IA,<br />
          <span className="text-indigo-600">de zéro à expert</span>
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10">
          Des formations pratiques et concrètes pour comprendre, utiliser et créer avec l'intelligence artificielle — quel que soit votre niveau.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="/formations" className="bg-indigo-600 text-white px-8 py-3.5 rounded-full text-base font-medium hover:bg-indigo-700 transition-colors">
            Voir toutes les formations
          </a>
          <a href="#niveaux" className="border border-gray-200 text-gray-700 px-8 py-3.5 rounded-full text-base font-medium hover:bg-gray-50 transition-colors">
            Choisir mon niveau
          </a>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-gray-100 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="text-3xl font-bold text-indigo-600">{s.value}</div>
              <div className="text-sm text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Niveaux */}
      <section id="niveaux" className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-4">Trouvez votre niveau</h2>
        <p className="text-gray-500 text-center mb-12 max-w-xl mx-auto">Peu importe d'où vous partez, il y a une formation faite pour vous.</p>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { emoji: "🌱", level: "Débutant", color: "border-green-200 bg-green-50", badge: "bg-green-100 text-green-700", desc: "Aucun prérequis. Vous découvrez l'IA pour la première fois et souhaitez comprendre les bases." },
            { emoji: "⚡", level: "Intermédiaire", color: "border-orange-200 bg-orange-50", badge: "bg-orange-100 text-orange-700", desc: "Vous utilisez déjà des outils IA et voulez automatiser, structurer et aller plus loin." },
            { emoji: "🚀", level: "Avancé", color: "border-purple-200 bg-purple-50", badge: "bg-purple-100 text-purple-700", desc: "Vous êtes prêt à construire des systèmes IA : agents, APIs, fine-tuning, RAG." },
          ].map((n) => (
            <div key={n.level} className={`border-2 ${n.color} rounded-2xl p-8`}>
              <div className="text-4xl mb-4">{n.emoji}</div>
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${n.badge}`}>{n.level}</span>
              <p className="text-gray-600 mt-4 leading-relaxed">{n.desc}</p>
              <a href="/formations" className="inline-block mt-6 text-sm font-medium text-indigo-600 hover:underline">
                Voir les formations →
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Formations vedettes */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-4">Formations populaires</h2>
          <p className="text-gray-500 text-center mb-12">Certaines formations sont gratuites. Les contenus avancés sont accessibles via abonnement.</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredCourses.map((c) => (
              <div key={c.id} className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col hover:shadow-md transition-shadow">
                <div className="text-3xl mb-3">{c.emoji}</div>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${c.levelColor}`}>{c.level}</span>
                  {c.free ? (
                    <span className="text-xs text-green-600 font-medium">Gratuit</span>
                  ) : (
                    <span className="text-xs text-gray-400">🔒 Premium</span>
                  )}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{c.title}</h3>
                <p className="text-sm text-gray-500 flex-1 leading-relaxed">{c.description}</p>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50">
                  <span className="text-xs text-gray-400">⏱ {c.duration}</span>
                  <a href="/formations" className="text-xs font-medium text-indigo-600 hover:underline">
                    {c.free ? "Commencer" : "Débloquer"} →
                  </a>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <a href="/formations" className="bg-indigo-600 text-white px-8 py-3.5 rounded-full text-base font-medium hover:bg-indigo-700 transition-colors">
              Voir toutes les formations
            </a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="tarifs" className="max-w-6xl mx-auto px-6 py-20 text-center">
        <div className="bg-indigo-600 rounded-3xl p-12 text-white">
          <h2 className="text-3xl font-bold mb-4">Commencez gratuitement</h2>
          <p className="text-indigo-200 mb-8 max-w-md mx-auto">
            Accédez aux formations débutant sans carte bancaire. Passez à Premium pour débloquer tout le catalogue.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/formations" className="bg-white text-indigo-600 px-8 py-3.5 rounded-full font-medium hover:bg-indigo-50 transition-colors">
              Accès gratuit
            </a>
            <a href="/formations" className="border border-indigo-400 text-white px-8 py-3.5 rounded-full font-medium hover:bg-indigo-700 transition-colors">
              Premium — 19€/mois
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-10 text-center text-sm text-gray-400">
        © 2026 Apprendia — Tous droits réservés
      </footer>
    </main>
  );
}
