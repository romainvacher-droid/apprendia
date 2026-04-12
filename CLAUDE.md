@AGENTS.md

# AI Academy Hub — Guide agent

> Production : https://ai-academy-hub.vercel.app

## Infrastructure

| Composant | Détail |
|---|---|
| **Hébergement** | Vercel — push sur `main` = déploiement automatique (~1 min) |
| **Sources** | GitHub : `romainvacher-droid/ai-academy-hub` |
| **Base de données** | Neon PostgreSQL (`still-mud-52051218`, base `neondb`) |
| **Auth** | NextAuth v4 — inscription/connexion email+mot de passe |
| **Paiement** | Stripe Checkout — abonnement 19€/mois (mode test actif) |
| **Stack** | Next.js 16 + TypeScript + Tailwind CSS |

## Modifier le catalogue de formations

**Un seul fichier : `lib/courses.ts`** — tableau `COURSES`.

Chaque formation est un objet :
```ts
{
  id: number,        // incrémenter le dernier id existant
  title: string,     // titre accrocheur, court
  desc: string,      // description 1 phrase (max 80 caractères)
  level: "Débutant" | "Intermédiaire" | "Avancé",
  duration: string,  // ex: "6h", "12h"
  modules: number,   // nombre de modules
  free: boolean,     // RÈGLE : true uniquement pour Débutant
  emoji: string,     // un emoji représentant le sujet
}
```

**Règle free/premium :**
- `free: true` → formations **Débutant** uniquement (accessible sans abonnement)
- `free: false` → formations **Intermédiaire** et **Avancé** (abonnement 19€/mois requis)

**Workflow pour ajouter ou modifier une formation :**
```bash
# 1. Éditer lib/courses.ts

# 2. Vérifier que le TypeScript compile
npm run build

# 3. Commiter et pousser → Vercel déploie automatiquement
git add lib/courses.ts
git commit -m "content: add/update formation XYZ"
git push origin main
```

## Tâche planifiée — ajout automatique de formations

**Script :** `scripts/content_manager.py`
**Cron :** `17 1 * * *` (01h17 chaque nuit)
**Comportement :** Lit le catalogue actuel, demande à un LLM (Groq llama-3.3-70b) de proposer 2 nouvelles formations complémentaires, les ajoute dans `lib/courses.ts`, commit et push → Vercel redéploie automatiquement.

```bash
# Lancer manuellement
python3 scripts/content_manager.py          # cycle complet
python3 scripts/content_manager.py audit    # voir le catalogue sans modifier
python3 scripts/content_manager.py status   # résumé rapide

# Vérifier le cron
crontab -l | grep content_manager
```

## Schéma base de données

```sql
users (
  id               SERIAL PRIMARY KEY,
  email            TEXT UNIQUE NOT NULL,
  password_hash    TEXT NOT NULL,
  name             TEXT,
  stripe_customer_id TEXT,
  is_premium       BOOLEAN DEFAULT false,
  created_at       TIMESTAMP DEFAULT NOW()
)

subscriptions (
  id                     SERIAL PRIMARY KEY,
  user_id                INTEGER REFERENCES users(id),
  stripe_subscription_id TEXT,
  stripe_price_id        TEXT,
  status                 TEXT,
  current_period_end     TIMESTAMP
)
```

**Accès premium :** Stripe webhook (`/api/stripe/webhook`) met automatiquement `is_premium = true` quand un paiement est confirmé.

## Variables d'environnement

Stockées sur Vercel (ne pas modifier via GitHub secrets) :

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Neon connection string |
| `NEXTAUTH_SECRET` | Secret JWT pour les sessions |
| `NEXTAUTH_URL` | `https://ai-academy-hub.vercel.app` |
| `STRIPE_SECRET_KEY` | Clé secrète Stripe (test: `sk_test_...`) |
| `STRIPE_PRICE_ID` | `price_1TL6MGHyjQScY8Y4K71H7cV7` |
| `STRIPE_WEBHOOK_SECRET` | Secret de validation des webhooks Stripe |

Pour développement local :
```bash
npx vercel env pull .env.local --yes   # récupère toutes les variables depuis Vercel
```

## Architecture des fichiers clés

```
lib/
  courses.ts          ← CATALOGUE (éditer ici pour ajouter/modifier des formations)
  auth.ts             ← config NextAuth (credentials email/password)
  db.ts               ← client Neon PostgreSQL
app/
  page.tsx            ← accueil (vitrine, formations en vedette)
  formations/page.tsx ← catalogue complet (lit lib/courses.ts)
  login/page.tsx      ← connexion NextAuth
  register/page.tsx   ← inscription
  account/page.tsx    ← gestion abonnement Stripe
  layout.tsx          ← layout global avec SessionProvider
  components/
    Navbar.tsx        ← barre de navigation avec état auth
    Providers.tsx     ← wrapper SessionProvider
  api/
    auth/[...nextauth]/   ← handler NextAuth
    auth/register/        ← POST inscription (crée user en BDD)
    stripe/checkout/      ← POST → URL Stripe Checkout
    stripe/portal/        ← POST → URL portail Stripe (gestion abonnement)
    stripe/webhook/       ← POST webhook Stripe (met à jour is_premium)
scripts/
  content_manager.py  ← agent nightly (ajoute des formations dans lib/courses.ts)
```

## Tester Stripe en mode test

Carte de test : `4242 4242 4242 4242`, date future quelconque, CVC quelconque.

## Contraintes importantes

- Ne jamais créer de nouveau projet Neon — utiliser `still-mud-52051218`
- Ne pas modifier les GitHub secrets — passer par le dashboard Vercel
- Ne pas commiter `.env.local` (déjà dans `.gitignore`)
