# Audit SEO & Marketing — Apprendia

*Rédigé par MarketingAgent (via Jean-Clawd) — 2026-04-13*

---

## Score SEO : 3,5/10

La base technique est présente (title, description, lang=fr, HTTPS Vercel) mais les éléments fondamentaux manquent : pas de sitemap, pas de robots.txt, pas d'Open Graph, pas de meta descriptions par page, URLs non descriptives. Le site est pratiquement invisible pour les moteurs de recherche et les réseaux sociaux.

---

## Manquant critique

**1. Aucun Open Graph / Twitter Card**
Quand un lien est partagé sur LinkedIn, Twitter ou WhatsApp : aucune image de prévisualisation, titre générique, description absente. Taux de clic des partages sociaux très bas, opportunité de trafic viral perdue.

**2. Aucun sitemap.xml ni robots.txt**
Les crawlers Google n'ont aucune carte du site. Les pages /formations/1, /formations/2... ne sont pas soumises à l'indexation. Impossible d'exclure /login, /register, /dashboard, /api/.

**3. URLs numériques non descriptives**
/formations/1, /formations/2... sont opaques. Google préfère /formations/introduction-ia, /formations/prompt-engineering. Aucun mot-clé dans l'URL = signal SEO manqué sur chaque page de formation.

**4. Zéro meta description par page**
La page /formations (catalogue) n'a pas de title ni de description propres. Chaque page formation utilise le title/description global. Google génère ses propres extraits — souvent peu pertinents.

**5. Pas de données structurées (Schema.org)**
Les formations méritent le balisage `Course` : prix, durée, niveau visibles en rich snippets dans Google.

---

## Recommandations prioritaires

**P1 — generateMetadata() sur chaque formation (30 min)**
Ajouter dans app/formations/[id]/page.tsx :
```
export async function generateMetadata({ params }) {
  const course = COURSES.find(c => c.id === parseInt(params.id));
  return {
    title: `${course.title} — Apprendia`,
    description: course.desc,
    openGraph: { title: course.title, description: course.desc, url: `https://apprendia.vercel.app/formations/${params.id}` },
  };
}
```

**P1 — Sitemap dynamique (30 min)**
Créer app/sitemap.ts avec les pages libres indexables + homepage + catalogue.

**P1 — robots.txt (15 min)**
Dans /public/robots.txt : Allow /, Disallow /dashboard /account /api/, Sitemap: .../sitemap.xml

**P2 — Slugs dans les URLs**
Ajouter champ `slug` à lib/courses.ts, routes /formations/[slug] avec redirect depuis les IDs.

**P2 — Page /pricing dédiée**
SEO sur "formation IA prix", comparatif gratuit vs premium, tableau de fonctionnalités.

**P3 — Schema.org Course**
JSON-LD sur chaque page formation pour les rich snippets Google.

---

## Actions rapides (< 1h chacune)

| Action | Temps |
|--------|-------|
| robots.txt dans /public/ | 15 min |
| generateMetadata() sur /formations/[id] | 30 min |
| Meta description sur /formations | 15 min |
| app/sitemap.ts | 30 min |
| Soumettre dans Google Search Console | 10 min |

---

## Positionnement concurrentiel

Opportunité : la niche "formation IA en français" est peu couverte par des acteurs spécialisés. Avec un SEO technique correct, Apprendia peut se positionner sur des requêtes longue traîne : "apprendre prompt engineering français", "créer agent IA débutant", "formation RAG gratuite française". Les concurrents (Coursera, Udemy, Le Wagon) ont une notoriété forte mais Apprendia a l'avantage d'être focalisé IA, francophone et accessible (19€/mois vs cours à 50-200€).
