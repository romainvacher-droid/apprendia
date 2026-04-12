"use client";
import { useSession, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";

function AccountContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const success = params.get("success");
  const [loading, setLoading] = useState(false);

  if (status === "loading") return <div className="text-center py-20 text-gray-400">Chargement...</div>;
  if (!session) { router.push("/login"); return null; }

  const isPremium = (session.user as { isPremium?: boolean }).isPremium;

  const handlePortal = async () => {
    setLoading(true);
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const { url } = await res.json();
    window.location.href = url;
  };

  const handleCheckout = async () => {
    setLoading(true);
    const res = await fetch("/api/stripe/checkout", { method: "POST" });
    const { url } = await res.json();
    window.location.href = url;
  };

  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold mb-8">Mon compte</h1>
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-5 py-4 rounded-xl mb-6">
          ✅ Abonnement activé ! Vous avez maintenant accès à toutes les formations.
        </div>
      )}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-6 shadow-sm">
        <h2 className="font-semibold text-gray-700 mb-4 text-sm uppercase tracking-wide">Informations</h2>
        <p className="text-gray-900">{session.user?.name ?? "—"}</p>
        <p className="text-gray-500 text-sm">{session.user?.email}</p>
      </div>
      <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-6 shadow-sm">
        <h2 className="font-semibold text-gray-700 mb-4 text-sm uppercase tracking-wide">Abonnement</h2>
        {isPremium ? (
          <div className="flex items-center justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-sm font-medium px-3 py-1 rounded-full">⭐ Premium actif</span>
              <p className="text-gray-500 text-sm mt-2">Accès illimité à toutes les formations</p>
            </div>
            <button onClick={handlePortal} disabled={loading}
              className="text-sm text-gray-500 border border-gray-200 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50">
              Gérer
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-gray-600">Plan gratuit — formations débutant uniquement</span>
            </div>
            <button onClick={handleCheckout} disabled={loading}
              className="bg-indigo-600 text-white text-sm px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50">
              {loading ? "..." : "Passer à Premium — 19€/mois"}
            </button>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between">
        <a href="/dashboard"
          className="text-sm text-indigo-600 hover:text-indigo-800 transition-colors font-medium">
          📊 Mon parcours →
        </a>
        <button onClick={() => signOut({ callbackUrl: "/" })}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
          Se déconnecter
        </button>
      </div>
    </main>
  );
}

export default function AccountPage() {
  return <Suspense><AccountContent /></Suspense>;
}