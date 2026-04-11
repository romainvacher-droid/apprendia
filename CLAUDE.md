@AGENTS.md

# IA Academy Hub — Guide agent

## Stack
- Next.js 16 + TypeScript + Tailwind CSS
- Auth : NextAuth v4 (credentials email/password, table `users` Neon)
- Paiement : Stripe Checkout — abonnement 19€/mois, mode test actif
- Base de données : Neon PostgreSQL (`still-mud-52051218`, base `neondb`)
- Hébergement : Vercel — push sur `main` = déploiement automatique (~1 min)

## Ajouter ou modifier une formation

**Un seul fichier à éditer : `lib/courses.ts`**

Chaque formation est un objet dans le tableau `COURSES` :

```ts
{
  id: number,        // identifiant unique, incrémenter le dernier
  title: string,     // titre de la formation
  desc: string,      // description courte (1-2 phrases)
  level: "Débutant" | "Intermédiaire" | "Avancé",
  duration: string,  // ex: "6h", "12h"
  modules: number,   // nombre de modules
  free: boolean,     // true = accessible sans abonnement
  emoji: string,     // un emoji représentant le sujet
}
```

Règle : `free: true` uniquement pour les formations Débutant. Les niveaux Intermédiaire et Avancé sont toujours `free: false`.

## Workflow de mise à jour

```bash
# 1. Cloner si besoin
git clone https://github.com/romainvacher-droid/ai-academy-hub.git
cd ai-academy-hub

# 2. Modifier lib/courses.ts

# 3. Pousser — Vercel déploie automatiquement
git add lib/courses.ts
git commit -m "content: add formation XYZ"
git push origin main
```

## Architecture des fichiers clés

```
lib/
  courses.ts          ← données de toutes les formations (ÉDITER ICI)
  auth.ts             ← config NextAuth
  db.ts               ← client Neon
app/
  formations/page.tsx ← catalogue (lit lib/courses.ts)
  page.tsx            ← accueil (vitrine, 4 formations en vedette)
  login/page.tsx      ← connexion
  register/page.tsx   ← inscription
  account/page.tsx    ← gestion abonnement
  api/
    auth/register/    ← POST inscription
    stripe/checkout/  ← POST → URL Stripe Checkout
    stripe/webhook/   ← POST webhook Stripe (mise à jour is_premium)
    stripe/portal/    ← POST → URL portail Stripe
```

## Schéma base de données

```sql
users (id, email, password_hash, name, stripe_customer_id, is_premium, created_at)
subscriptions (id, user_id, stripe_subscription_id, stripe_price_id, status, current_period_end)
```

## Variables d'environnement (sur Vercel, ne pas modifier via GitHub secrets)

- `DATABASE_URL` — Neon connection string
- `NEXTAUTH_SECRET` — secret JWT sessions
- `NEXTAUTH_URL` — https://ia-academy-hub.vercel.app
- `STRIPE_SECRET_KEY` — clé secrète Stripe (test: sk_test_...)
- `STRIPE_PRICE_ID` — price_1TL6MGHyjQScY8Y4K71H7cV7
- `STRIPE_WEBHOOK_SECRET` — secret de validation webhook Stripe

## Contraintes

- Ne jamais créer de nouveaux projets Neon — utiliser `still-mud-52051218`
- Ne pas modifier les GitHub secrets — passer par l'API Vercel
- Ne pas demander d'approbation `/approve` pour des opérations git standard
- Pour tester Stripe en mode test : carte `4242 4242 4242 4242`, date future, CVC quelconque