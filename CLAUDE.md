@AGENTS.md

# Déploiement

Ce site est déployé sur **Vercel** via intégration GitHub.
**Chaque push sur `main` déclenche automatiquement un déploiement** — pas de commande manuelle.

## Stack
- Next.js 16 + TypeScript + Tailwind CSS
- Base de données : Neon PostgreSQL (projet `still-mud-52051218`)
- Hébergement : Vercel (projet `ai-academy-hub`)

## Variables d'environnement
Gérées sur Vercel (pas dans GitHub secrets) :
- `DATABASE_URL` — connexion Neon
- `STRIPE_SECRET_KEY` — clé Stripe

## Workflow de mise à jour
```bash
git add .
git commit -m "feat: description"
git push origin main
# Vercel déploie automatiquement (~1 min)
```

## Contraintes
- Ne pas créer de nouveaux projets Neon — utiliser uniquement `still-mud-52051218`
- Ne pas modifier les GitHub secrets (token insuffisant) — passer par l'API Vercel
