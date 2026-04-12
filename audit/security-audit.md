## Audit de sécurité – Apprendia  

**Contexte** : Application Next.js 16, base de données PostgreSQL (Neon), paiement Stripe, authentification via NextAuth v4. Nous avons analysé les fichiers clés suivants : `lib/auth.ts`, `lib/db.ts` (non fourni mais utilisé via le tag `sql`), toutes les routes API sous `app/api/`, ainsi que la page de contrôle d’accès des formations premium (`app/formations/[id]/page.tsx`).  

---

### ## Critique  

| # | Issue | Impact | Recommandation |
|---|-------|--------|----------------|
| C‑1 | **Absence de vérification du `Content‑Type` et de taille de charge utile dans le webhook Stripe** | Un attaquant pourrait envoyer un corps arbitraire (ex : très gros ou mal‑formé) qui consomme les ressources du serveur avant même la vérification de signature, entraînant un **Denial‑of‑Service**. | Limiter la taille du corps (`MAX_BODY_SIZE`) et vérifier que `Content‑Type` est `application/json` avant de lire le corps. |
| C‑2 | **Utilisation de `process.env` directement dans le code côté client** (ex. `process.env.NEXTAUTH_URL` injecté dans l’URL de succès Stripe) | Si le bundler expose ces variables, des secrets (ex. `STRIPE_PRICE_ID`) pourraient être visibles dans le code source livré au navigateur. | Déplacer toutes les valeurs sensibles dans des **variables d’environnement réservées au serveur** et les injecter via l’API (`getServerSideProps` / `Server Actions`). |
| C‑3 | **Manque de protection CSRF sur les endpoints POST** (`/api/auth/register`, `/api/progress`, `/api/stripe/...`) | Un site tiers pourrait forger des requêtes POST authentifiées (si l’utilisateur est connecté) et créer/mettre‑à‑jour des données. | Implémenter le middleware **CSRF** de Next.js ou vérifier le header `Origin` / `Referer` et/ou utiliser le token `csrfToken` de NextAuth. |
| C‑4 | **Gestion des erreurs d’authentification non uniforme** – certaines routes renvoient `401` avec message générique, d’autres `403` ou `null`. Cela peut révéler l’existence d’utilisateurs (ex. enregistrement renvoie “Email déjà utilisé”). | Un attaquant peut enumerer les adresses email existantes, facilitant des attaques de credential stuffing. | Normaliser les réponses d’erreur (ex. `400 Bad Request` avec message générique) et éviter de révéler si un email existe. |
| C‑5 | **Mise à jour du statut premium sans vérification de la cohérence Stripe** (`stripe/webhook` met à jour `is_premium` dès réception de l’événement) – si un webhook falsifié passe la validation (clé compromise), l’accès premium peut être accordé frauduleusement. | Accès non autorisé à du contenu payant, perte de revenus. | Stocker **l’ID de la souscription Stripe** et vérifier périodiquement via l’API Stripe (ou webhook de type `invoice.payment_succeeded`) que la souscription est toujours active avant de mettre à jour le flag `is_premium`. |
| C‑6 | **Absence de rate‑limiting / protection contre les bruteforces sur le login et l’enregistrement** (credential provider). | Permet des attaques de dictionnaire pour deviner les mots de passe. | Ajouter `rateLimit` via `next-auth` (`maxAttempts`, `windowMs`) ou un middleware `express-rate-limit`. |
| C‑7 | **Mot de passe hashé avec un coût fixe (`bcrypt.hash(...,12)`)** – acceptable, mais aucune politique de rotation ou d’expiration. | Risque d’exposition à long terme si la base est compromise. | Implémenter une **politique de rotation** et stocker `password_updated_at`. Utiliser `argon2` ou augmenter le facteur de coût selon les performances. |
| C‑8 | **Injection possible via interpolation SQL** – Bien que le tag ``sql`` utilise des paramètres préparés, il faut vérifier que `lib/db.ts` ne concatène jamais des fragments. Sans le fichier, le risque ne peut être totalement exclu. | Si un fragment est concaténé, un attaquant pourrait injecter du SQL. | Auditer `lib/db.ts` pour s’assurer que **tous** les appels utilisent les placeholders `${}` et qu’aucune chaîne brute n’est injectée. |
| C‑9 | **Contrôle d’accès des formations premium uniquement côté serveur** (`page.tsx` utilise `redirect`) mais aucune vérification côté API qui renvoie les données de la formation. Si l’API `/api/…` fournit les contenus sans filtre, un utilisateur non premium pourrait récupérer les données en appelant directement l’API. | Contournement du contrôle d’accès, fuite de contenu premium. | S’assurer que **toutes les API** qui exposent les cours vérifient le flag `isPremium` avant de renvoyer les ressources. |

---

### ## Important  

| # | Issue | Impact | Recommandation |
|---|-------|--------|----------------|
| I‑1 | **JWT secret (`NEXTAUTH_SECRET`) exposé potentiellement** – valeur tirée de `process.env` mais il n’y a aucune indication que le secret soit assez long (> 32 bytes) ni stocké via un secret manager. | Si le secret est faible ou exposé, un attaquant peut forge : JWT et usurper l’identité. | Utiliser un secret **cryptographiquement aléatoire** (≥ 256 bits) et le stocker dans le service de gestion de secrets de la plateforme (ex. Vault, AWS Secrets Manager). |
| I‑2 | **Manque de `SameSite` et `Secure` sur les cookies de session** – NextAuth crée des cookies de session même en mode JWT (pour le CSRF). Aucun paramètre explicite n’est défini. | Risque de vol de cookie via XSS ou requêtes cross‑site. | Configurer `cookies` dans `authOptions` : `{ sessionToken: { name: "...", options: { httpOnly: true, sameSite: "lax", secure: true } } }`. |
| I‑3 | **Réponse de l’API `register` renvoie `success: true` sans email de confirmation** – pas critique, mais facilite l’usage de comptes jetables. | Augmente le risque d’abus (spam, fraude). | Implémenter un **processus de vérification d’email** (token expirable) avant d’activer le compte. |
| I‑4 | **`stripe.checkout.sessions.create` utilise `process.env.STRIPE_PRICE_ID!` sans validation** – si la variable est mal définie, la création échoue et l’erreur n’est pas gérée. | Le serveur renvoie une erreur 500 potentielle, pouvant divulguer des informations internes. | Ajouter un **try/catch** autour de la création de session et renvoyer un message d’erreur générique. |
| I‑5 | **Linéarité des identifiants** – `users.id` est utilisé tel quel dans le JWT. Si les IDs sont séquentiels, un attaquant peut deviner les IDs d’autres utilisateurs. | Facilite l’enumération d’utilisateurs et ciblage. | Utiliser des **UUID** ou des IDs opaque (hashé). |
| I‑6 | **Pas de `Content‑Security‑Policy` (CSP) ni de headers de sécurité HTTP** – aucun middleware détecté pour ajouter `X‑Frame‑Options`, `X‑Content‑Type‑Options`, `Referrer‑Policy`. | Augmente la surface d’attaque XSS, click‑jacking, etc. | Ajouter un middleware (ex. `helmet` ou le config Next.js `headers`) pour injecter les headers de sécurité recommandés. |
| I‑7 | **Gestion de la date d’expiration du webhook** – aucune rotation ou rotation de `STRIPE_WEBHOOK_SECRET`. Si ce secret fuit, l’attaquant peut envoyer des événements falsifiés indéfiniment. | Perte de contrôle sur les accès premium. | **Rotate** le secret périodiquement et mettre en place une alerte en cas d’échec de validation. |
| I‑8 | **Absence de logs d’audit** sur les opérations critiques (inscription, mise à jour premium, changement de mot de passe). | Difficile de détecter ou enquêter sur des actions suspectes. | Loguer de façon sécurisée (ex. `pino`, `winston`) les événements sensibles, sans inclure les données sensibles (ex. mot de passe). |
| I‑9 | **Exposition du champ `stripe_customer_id`** – il est utilisé directement dans les requêtes sans validation de type. | Risque minimal mais peut causer des erreurs si la chaîne contient des caractères inattendus. | Valider le format (ex. regex `/^cus_[a-zA-Z0-9]+$/`). |

---

### ## Mineur  

| # | Issue | Impact | Recommandation |
|---|-------|--------|----------------|
| M‑1 | **Messages d’erreur en français uniquement** – aucune localisation, mais cela n’impacte pas la sécurité. | Aucun. | Conserver. |
| M‑2 | **Utilisation de `redirect` côté serveur sans `await`** – fine, mais peut entraîner des avertissements de lint. | Aucun impact sécurité. | Ajouter `await` ou laisser tel quel. |
| M‑3 | **`await sql\`SELECT ...\`` – la requête ne spécifie pas de groupe de colonnes** – dans `authOptions.session` on récupère `is_premium` sans vérifier l’existence de la colonne. | Aucun. | Verifier que le schéma possède bien la colonne. |
| M‑4 | **Les variables d’environnement pour Stripe et NextAuth sont toutes requises (`!`)** – si manquantes, le serveur plante au démarrage. | Peut causer downtime. | Mettre en place un script de validation au démarrage. |
| M‑5 | **Absence de typage strict pour les paramètres API** – `courseId` est accepté tel quel. | Faible, mais pourrait entraîner des insertions inattendues. | Valider le type (`Number.isInteger(courseId)`). |
| M‑6 | **Pas de nettoyage des entrées de `email`** – la requête SQL utilise le placeholder, mais le format d’email n’est pas vérifié. | Peu probable d’injection, mais améliore la qualité des données. | Utiliser une validation d’email (ex. `zod`). |
| M‑7 | **Les réponses JSON contiennent des booléens et strings simples** – aucune information sensible n’est renvoyée. | Aucun. | OK. |
| M‑8 | **`process.env.NEXTAUTH_URL`** utilisé dans les URLs de Stripe – si la variable est mal configurée (ex. `http`), le redirect peut être non‑SSL. | Risque de fuite de session via http. | S’assurer que l’URL est `https://`. |
| M‑9 | **Pas de test d’intégrité des données** – par ex., aucune contrainte d’unicité sur `email` du côté DB (mais le code vérifie). | Peu de risque, mais la contrainte DB serait plus robuste. | Ajouter une contrainte unique sur `users.email`. |

---

### ## OK  

| # | Observation | Pourquoi c’est correct |
|---|-------------|------------------------|
| O‑1 | **Utilisation de `bcryptjs` avec un facteur de coût 12** – bon équilibre sécurité/performance. | Le hachage est résistant aux attaques par force‑brute. |
| O‑2 | **Utilisation de requêtes paramétrées via le tag `sql`** – élimine le risque d’injection SQL tant que `lib/db.ts` ne concatène pas de chaînes. | Paramétrage sûr. |
| O‑3 | **Gestion du flag `is_premium` dans la session** – le callback JWT enrichit le token et la session ajoute le flag via une requête DB. | Permet un contrôle d’accès côté serveur fiable. |
| O‑4 | **Pages protégées redirigées vers `/login` ou `/formations?upgrade=1`** – UX claire et prévention d’accès direct. | Bon comportement d’accès. |
| O‑5 | **Clés Stripe utilisées via le SDK officiel (`stripe.webhooks.constructEvent`)** – validation de signature conforme. | Sécurise le webhook. |
| O‑6 | **Stockage du `stripe_customer_id` dans la table `users`** – associe l’utilisateur à Stripe de façon simple. | Facilite la synchronisation. |
| O‑7 | **Vérification de la longueur du mot de passe (≥ 8)** – règle de base pour la complexité. | Réduit la force des mots de passe faibles. |
| O‑8 | **Utilisation du mode de session JWT** – simplifie le scaling côté serveur. | Approche adaptée aux architectures serverless. |
| O‑9 | **Gestion des réponses JSON avec codes HTTP appropriés (400, 401, 409, 200)** – conformité aux standards REST. | Bonne API. |

---

## Synthèse et plan d’action  

1. **Renforcer les contrôles de CSRF** sur toutes les routes POST.  
2. **Durcir les headers HTTP** (CSP, HSTS, X‑Frame‑Options, etc.) via un middleware `helmet` ou `NextResponse.headers`.  
3. **Auditer `lib/db.ts`** pour garantir que **toutes** les requêtes sont paramétrées et qu’aucune concaténation de chaînes n’est utilisée.  
4. **Séparer clairement les variables d’environnement côté serveur** (ex. `NEXT_PUBLIC_*` pour le client) afin que les secrets Stripe et JWT ne soient jamais exposés au bundle client.  
5. **Implémenter la validation et le throttling** sur les endpoints d’authentification (login, register) : limite de tentatives, CAPTCHA, vérification d’email.  
6. **Ajouter des logs d’audit** pour les événements critiques (inscription, paiement, mise à jour premium).  
7. **Mettre en place une rotation régulière** des secrets (`NEXTAUTH_SECRET`, `STRIPE_WEBHOOK_SECRET`) avec alertes en cas de compromission.  
8. **Appliquer des vérifications strictes** sur les identifiants Stripe (`cus_…`, `sub_…`) et les IDs internes (préférer UUID).  
9. **Renforcer le contrôle d’accès côté API** afin que les endpoints servissant les contenus premium vérifient le flag `isPremium` avant de renvoyer les données.  

En suivant ces recommandations, le périmètre d’attaque d’Apprendia sera considérablement réduit, les données sensibles seront mieux protégées, et la conformité aux bonnes pratiques de sécurité (OWASP Top 10, PCI‑DSS pour Stripe) sera assurée.
