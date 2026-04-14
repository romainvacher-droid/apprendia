import { COURSES, LEVEL_COLORS } from "@/lib/courses";

const stats = [
  { value: "15+", label: "formations" },
  { value: "3", label: "niveaux" },
  { value: "100%", label: "pratique" },
  { value: "7j/7", label: "accessible" },
];

const testimonials = [
  {
    quote: "En 3 semaines, j'ai automatisé 60 % de mes rapports hebdomadaires. ROI en moins d'un mois.",
    name: "Thomas M.",
    role: "Consultant indépendant",
  },
  {
    quote: "Zéro background technique et pourtant les formations débutant sont vraiment accessibles. Enfin je comprends mes équipes tech.",
    name: "Sarah L.",
    role: "Directrice marketing",
  },
  {
    quote: "La structure théorie + quiz de validation est parfaite. On assimile vraiment avant de passer à la suite.",
    name: "Kevin R.",
    role: "Développeur full-stack",
  },
];

export default function Home() {
  const featuredCourses = [
    ...COURSES.filter((c) => c.free).slice(0, 2),
    ...COURSES.filter((c) => !c.free && c.level === "Intermédiaire").slice(0, 1),
    ...COURSES.filter((c) => c.level === "Avancé").slice(0, 1),
  ];

  return (
    <main>
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <span className="inline-block bg-indigo-50 text-indigo-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
          Formations IA · Tous niveaux
        </span>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-gray-900 leading-tight mb-6">
          Apprenez l&apos;IA,<br />
          <span className="text-indigo-600">de zéro à expert</span>
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10">
          Des formations pratiques et concrètes pour comprendre, utiliser et créer avec l&apos;intelligence artificielle — quel que soit votre niveau.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="/register" className="bg-indigo-600 text-white px-8 py-3.5 rounded-full text-base font-medium hover:bg-indigo-700 transition-colors">
            Commencer gratuitement
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
        <p className="text-gray-500 text-center mb-12 max-w-xl mx-auto">Peu importe d&apos;où vous partez, il y a une formation faite pour vous.</p>
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

      {/* Formations vedettes — synchronisées avec lib/courses.ts */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-4">Formations populaires</h2>
          <p className="text-gray-500 text-center mb-12">Certaines formations sont gratuites. Les contenus avancés sont accessibles via abonnement.</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredCourses.map((c) => (
              <div key={c.id} className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col hover:shadow-md transition-shadow">
                <div className="text-3xl mb-3">{c.emoji}</div>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${LEVEL_COLORS[c.level]}`}>{c.level}</span>
                  {c.free ? (
                    <span className="text-xs text-green-600 font-medium">Gratuit</span>
                  ) : (
                    <span className="text-xs text-gray-400">Premium</span>
                  )}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{c.title}</h3>
                <p className="text-sm text-gray-500 flex-1 leading-relaxed">{c.desc}</p>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50">
                  <span className="text-xs text-gray-400">⏱ {c.duration}</span>
                  <a href={`/formations/${c.id}`} className="text-xs font-medium text-indigo-600 hover:underline">
                    {c.free ? "Commencer" : "Voir"} →
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

      {/* Témoignages */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-4">Ce que disent nos apprenants</h2>
        <p className="text-gray-500 text-center mb-12 max-w-xl mx-auto">Des professionnels qui ont transformé leur rapport à l&apos;IA.</p>
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div key={t.name} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className="text-amber-400 text-sm">★</span>
                ))}
              </div>
              <p className="text-gray-700 text-sm leading-relaxed mb-4">&ldquo;{t.quote}&rdquo;</p>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                <p className="text-xs text-gray-400">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section id="tarifs" className="max-w-6xl mx-auto px-6 pb-20 text-center">
        <div className="bg-indigo-600 rounded-3xl p-12 text-white">
          <h2 className="text-3xl font-bold mb-4">Commencez gratuitement</h2>
          <p className="text-indigo-200 mb-8 max-w-md mx-auto">
            Accédez aux formations débutant sans carte bancaire. Passez à Premium pour débloquer tout le catalogue.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/register" className="bg-white text-indigo-600 px-8 py-3.5 rounded-full font-medium hover:bg-indigo-50 transition-colors">
              Créer un compte gratuit
            </a>
            <a href="/register" className="border border-indigo-400 text-white px-8 py-3.5 rounded-full font-medium hover:bg-indigo-700 transition-colors">
              Premium — 19€/mois
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
