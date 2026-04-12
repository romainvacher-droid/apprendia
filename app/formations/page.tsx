"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { COURSES, LEVEL_COLORS } from "@/lib/courses";

export default function Formations() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const isPremium = (session?.user as { isPremium?: boolean })?.isPremium;

  const handleAction = async (course: typeof COURSES[0]) => {
    if (course.free) { router.push(`/formations/${course.id}`); return; }
    if (!session) { router.push(`/register?from=/formations/${course.id}`); return; }
    if (isPremium) { router.push(`/formations/${course.id}`); return; }
    setLoadingId(course.id);
    const res = await fetch("/api/stripe/checkout", { method: "POST" });
    const { url, error } = await res.json();
    if (error) { alert(error); setLoadingId(null); return; }
    window.location.href = url;
  };

  return (
    <main className="max-w-6xl mx-auto px-6 py-16">
      <div className="text-center mb-14">
        <h1 className="text-4xl font-bold mb-4">Toutes les formations</h1>
        <p className="text-gray-500 max-w-xl mx-auto">Du total débutant au développeur IA confirmé — progressez à votre rythme.</p>
      </div>
      {isPremium && (
        <div className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-5 py-3 rounded-xl text-sm text-center mb-8">
          ⭐ Vous avez accès à toutes les formations Premium
        </div>
      )}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {COURSES.map((c) => {
          const locked = !c.free && !isPremium;
          return (
            <div key={c.id} className={`border rounded-2xl p-6 flex flex-col bg-white transition-shadow ${locked ? "border-gray-100 opacity-90" : "border-gray-100 hover:shadow-md"}`}>
              <div className="text-3xl mb-4">{locked ? "🔒" : c.emoji}</div>
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${LEVEL_COLORS[c.level]}`}>{c.level}</span>
                {c.free
                  ? <span className="text-xs text-green-600 font-medium bg-green-50 px-2.5 py-1 rounded-full">Gratuit</span>
                  : <span className="text-xs text-gray-400">Premium</span>}
              </div>
              <h2 className="font-semibold text-gray-900 mb-2 text-lg">{c.title}</h2>
              <p className="text-sm text-gray-500 flex-1 leading-relaxed">{c.desc}</p>
              <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                <div className="text-xs text-gray-400 flex gap-3">
                  <span>⏱ {c.duration}</span>
                  <span>📦 {c.modules} modules</span>
                </div>
                <button onClick={() => handleAction(c)} disabled={loadingId === c.id}
                  className={`text-xs font-medium px-4 py-2 rounded-full transition-colors disabled:opacity-50 ${
                    c.free ? "bg-indigo-600 text-white hover:bg-indigo-700"
                    : isPremium ? "bg-indigo-600 text-white hover:bg-indigo-700"
                    : "bg-gray-900 text-white hover:bg-gray-700"}`}>
                  {loadingId === c.id ? "..." : c.free ? "Commencer" : isPremium ? "Accéder" : "Débloquer"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {!isPremium && (
        <div className="mt-16 bg-indigo-600 rounded-3xl p-10 text-white text-center">
          <h2 className="text-2xl font-bold mb-3">Accédez à tout le catalogue</h2>
          <p className="text-indigo-200 mb-6 max-w-md mx-auto">Débloquez les 6 formations avancées, les mises à jour et les nouveaux modules chaque mois.</p>
          <button onClick={() => handleAction(COURSES[3])}
            className="bg-white text-indigo-600 px-8 py-3 rounded-full font-medium hover:bg-indigo-50 transition-colors">
            Premium — 19€/mois
          </button>
        </div>
      )}
    </main>
  );
}