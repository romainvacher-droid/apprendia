import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mentions légales & CGV — Apprendia",
  description: "Mentions légales, conditions générales de vente et politique de confidentialité d'Apprendia.",
};

export default function MentionsLegalesPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Mentions légales</h1>
      <p className="text-gray-400 text-sm mb-12">Dernière mise à jour : avril 2026</p>

      {/* Éditeur */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Éditeur du site</h2>
        <div className="bg-gray-50 rounded-2xl p-6 space-y-2 text-sm text-gray-600">
          <p><span className="font-medium text-gray-800">Nom commercial :</span> Apprendia</p>
          <p><span className="font-medium text-gray-800">Forme juridique :</span> [À compléter — Ex : SAS, SARL, auto-entrepreneur]</p>
          <p><span className="font-medium text-gray-800">Siège social :</span> [Adresse à compléter]</p>
          <p><span className="font-medium text-gray-800">SIRET :</span> [Numéro à compléter]</p>
          <p><span className="font-medium text-gray-800">Email :</span> contact@apprendia.vercel.app</p>
          <p><span className="font-medium text-gray-800">Directeur de publication :</span> [Nom à compléter]</p>
        </div>
      </section>

      {/* Hébergeur */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Hébergeur</h2>
        <div className="bg-gray-50 rounded-2xl p-6 space-y-2 text-sm text-gray-600">
          <p><span className="font-medium text-gray-800">Société :</span> Vercel Inc.</p>
          <p><span className="font-medium text-gray-800">Adresse :</span> 340 Pine Street, Suite 701, San Francisco, CA 94104, États-Unis</p>
          <p><span className="font-medium text-gray-800">Site web :</span> vercel.com</p>
        </div>
      </section>

      {/* CGV */}
      <section id="cgv" className="mb-10 scroll-mt-24">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Conditions Générales de Vente</h2>
        <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
          <h3 className="font-semibold text-gray-800">1. Objet</h3>
          <p>Les présentes CGV régissent les ventes de formations en ligne proposées par Apprendia. Toute commande implique l&apos;acceptation sans réserve des présentes conditions.</p>

          <h3 className="font-semibold text-gray-800">2. Offres et tarifs</h3>
          <p>Apprendia propose deux types d&apos;accès :</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li><strong>Gratuit :</strong> accès aux formations de niveau Débutant sans limitation de durée.</li>
            <li><strong>Premium :</strong> accès à l&apos;intégralité du catalogue au tarif de 19 € TTC/mois, résiliable à tout moment.</li>
          </ul>
          <p>Les prix sont indiqués en euros TTC. Apprendia se réserve le droit de modifier ses tarifs à tout moment, sans effet rétroactif sur les abonnements en cours.</p>

          <h3 className="font-semibold text-gray-800">3. Paiement</h3>
          <p>Le paiement est sécurisé via Stripe. Les données bancaires ne sont pas stockées par Apprendia. L&apos;abonnement est renouvelé automatiquement chaque mois jusqu&apos;à résiliation.</p>

          <h3 className="font-semibold text-gray-800">4. Droit de rétractation</h3>
          <p>Conformément à l&apos;article L.221-28 du Code de la consommation, le droit de rétractation ne s&apos;applique pas aux contenus numériques dont l&apos;exécution a commencé avec l&apos;accord du consommateur. Toutefois, Apprendia s&apos;engage à rembourser tout abonnement sur demande dans les 7 jours suivant la souscription si aucune formation premium n&apos;a été consultée.</p>

          <h3 className="font-semibold text-gray-800">5. Résiliation</h3>
          <p>L&apos;abonnement Premium peut être résilié à tout moment depuis l&apos;espace &quot;Mon compte&quot;. La résiliation prend effet à la fin de la période de facturation en cours.</p>

          <h3 className="font-semibold text-gray-800">6. Propriété intellectuelle</h3>
          <p>L&apos;ensemble des contenus du site (textes, vidéos, quiz, structure pédagogique) est la propriété exclusive d&apos;Apprendia ou de ses partenaires. Toute reproduction est interdite sans autorisation écrite préalable.</p>
        </div>
      </section>

      {/* RGPD */}
      <section id="rgpd" className="mb-10 scroll-mt-24">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Politique de confidentialité (RGPD)</h2>
        <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
          <h3 className="font-semibold text-gray-800">Données collectées</h3>
          <p>Apprendia collecte les données suivantes :</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Adresse email et nom (inscription)</li>
            <li>Données de progression et résultats de quiz (utilisation du service)</li>
            <li>Données de facturation via Stripe (abonnement Premium)</li>
          </ul>

          <h3 className="font-semibold text-gray-800">Finalités du traitement</h3>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Gestion des comptes utilisateurs et authentification</li>
            <li>Fourniture du service de formation en ligne</li>
            <li>Traitement des paiements</li>
            <li>Amélioration du service</li>
          </ul>

          <h3 className="font-semibold text-gray-800">Base légale</h3>
          <p>Le traitement est fondé sur l&apos;exécution du contrat (accès au service) et, pour les communications marketing optionnelles, sur le consentement de l&apos;utilisateur.</p>

          <h3 className="font-semibold text-gray-800">Durée de conservation</h3>
          <p>Les données sont conservées pendant la durée du compte et 3 ans après sa suppression, conformément aux obligations légales.</p>

          <h3 className="font-semibold text-gray-800">Vos droits</h3>
          <p>Conformément au RGPD, vous disposez des droits d&apos;accès, de rectification, de suppression, de portabilité et d&apos;opposition. Pour exercer ces droits : <strong>contact@apprendia.vercel.app</strong></p>
          <p>Vous avez également le droit d&apos;introduire une réclamation auprès de la CNIL (cnil.fr).</p>

          <h3 className="font-semibold text-gray-800">Sous-traitants</h3>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li><strong>Vercel</strong> — hébergement (États-Unis, clauses contractuelles types)</li>
            <li><strong>Neon</strong> — base de données PostgreSQL</li>
            <li><strong>Stripe</strong> — paiement sécurisé</li>
          </ul>

          <h3 className="font-semibold text-gray-800">Cookies</h3>
          <p>Le site utilise uniquement un cookie de session sécurisé (HttpOnly) pour maintenir votre connexion. Aucun cookie publicitaire ou de tracking tiers n&apos;est utilisé.</p>
        </div>
      </section>

      <p className="text-xs text-gray-400 border-t border-gray-100 pt-8">
        Pour toute question : <a href="mailto:contact@apprendia.vercel.app" className="text-indigo-600 hover:underline">contact@apprendia.vercel.app</a>
      </p>
    </main>
  );
}
