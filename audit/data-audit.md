# 📊 Audit Exhaustif de la Base de Données PostgreSQL – Apprendia  
*Stack : Neon PostgreSQL (serverless) + @neondatabase/serverless (tagged template literals `sql\`…\``)*  

---  

## ## Schéma reconstitué (SQL `CREATE TABLE` complet avec tous les index)

```sql
--------------------------------------------------------------------
-- 1️⃣ Table users
--------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id                 SERIAL PRIMARY KEY,
    email              TEXT    NOT NULL UNIQUE,            -- index unique implicite
    password_hash      TEXT    NOT NULL,
    name               TEXT,
    stripe_customer_id TEXT,                                 -- nullable, mais unique (voir index ci‑dessous)
    is_premium         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at         TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes additionnels sur users
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_stripe_customer_id
    ON users(stripe_customer_id)          -- garantit l’unicité et accélère les recherches webhook
    WHERE stripe_customer_id IS NOT NULL; -- garde la compatibilité avec les lignes où ce champ est NULL

CREATE INDEX IF NOT EXISTS idx_users_id
    ON users(id);                         -- améliore les recherches par id (déjà PK mais utile en planification)

--------------------------------------------------------------------
-- 2️⃣ Table subscriptions
--------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscriptions (
    id                     SERIAL PRIMARY KEY,
    user_id                INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_subscription_id TEXT    NOT NULL,                -- utilisé dans ON CONFLICT
    stripe_price_id        TEXT,
    status                 TEXT,
    current_period_end     TIMESTAMP,
    updated_at             TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Contraintes et index sur subscriptions
ALTER TABLE subscriptions
    ADD CONSTRAINT uq_subscriptions_stripe_sub_id UNIQUE (stripe_subscription_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id
    ON subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_status
    ON subscriptions(status);

--------------------------------------------------------------------
-- 3️⃣ Table course_progress (non documentée)
--------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS course_progress (
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id  INTEGER NOT NULL,
    visited_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, course_id)                     -- contrainte UNIQUE sur (user_id,course_id)
);

-- Indexes complémentaires
CREATE INDEX IF NOT EXISTS idx_course_progress_user
    ON course_progress(user_id);

CREATE INDEX IF NOT EXISTS idx_course_progress_user_visited
    ON course_progress(user_id, visited_at DESC);   -- optimise ORDER BY visited_at

--------------------------------------------------------------------
-- 4️⃣ Table quiz_results (non documentée)
--------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quiz_results (
    id           SERIAL PRIMARY KEY,
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id    INTEGER NOT NULL,
    score        INTEGER NOT NULL,
    total        INTEGER NOT NULL,
    completed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, course_id, completed_at)        -- empêche les doublons accidentels
);

-- Indexes complémentaires
CREATE INDEX IF NOT EXISTS idx_quiz_results_user
    ON quiz_results(user_id);

CREATE INDEX IF NOT EXISTS idx_quiz_results_user_completed
    ON quiz_results(user_id, completed_at DESC);   -- optimise ORDER BY completed_at

--------------------------------------------------------------------
-- 5️⃣ Table courses – suggestion d’ajout pour référential integrity
--------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS courses (
    id          SERIAL PRIMARY KEY,
    title       TEXT    NOT NULL,
    description TEXT,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Ajout de FK dans les tables de progression et de quiz
ALTER TABLE course_progress
    ADD CONSTRAINT fk_course_progress_course
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;

ALTER TABLE quiz_results
    ADD CONSTRAINT fk_quiz_results_course
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
```

> **Remarque** : les index uniques créés implicitement par les `PRIMARY KEY` et `UNIQUE` sont déjà exploités par PostgreSQL. Les index supplémentaires ci‑dessus ciblent les colonnes fréquemment utilisées dans les clauses `WHERE`, `JOIN` et les tris `ORDER BY`.

---

## ## Problèmes de performance identifiés

| # | Requête / Situation | Pourquoi c’est problématique | Impact observé / potentiel |
|---|----------------------|------------------------------|----------------------------|
| **1** | `SELECT * FROM users WHERE email = $1 LIMIT 1` (login) | Retourne **toutes** les colonnes (`password_hash`, `stripe_customer_id`, `created_at`, etc.) alors que seules `id`, `password_hash` (et éventuellement `is_premium`) sont nécessaires. | Consommation de bande passante inutile, cache de connexion plus gros, augmentation du temps de lecture, surtout sur un service serverless où chaque ms compte. |
| **2** | `SELECT is_premium FROM users WHERE id = $1 LIMIT 1` exécuté **à chaque appel API authentifié** (session callback) | Cette requête très fréquente (potentiellement plusieurs dizaines par minute par utilisateur actif) ne profite d’aucun cache. | Charge additive sur le pool de connexions Neon, latence accrue, coûts serveur inutiles. |
| **3** | Absence de **pagination** (`LIMIT / OFFSET`) sur les requêtes de `course_progress` et `quiz_results` du dashboard. | Si un utilisateur possède un historique massif (ex. plusieurs milliers de cours), la base renvoie **tout** le tableau, ce qui sollicite fortement le disque et la mémoire. | Risque d’« out‑of‑memory », temps de réponse qui explode, facturation plus élevée sur Neon (IO). |
| **4** | Deux appels séparés dans `dashboard/page.tsx` : un pour `course_progress`, un pour `quiz_results`. | Bien que chaque appel utilise un index, le **nombre total de round‑trips** est doublé. | Latence réseau (RTT) multipliée, surcharge de l’API. |
| **5** | Le **webhook Stripe** effectue plusieurs `UPDATE` et `INSERT` séquentiels sans transaction. | Si une des étapes échoue (ex. perte de connexion, quota dépassé), la base peut rester dans un état partiellement mis à jour (`is_premium = true` mais pas d’abonnement). | Incohérence logique, facturation erronée, besoin d’une compensation manuelle. |
| **6** | `INSERT … ON CONFLICT (user_id, course_id) DO NOTHING` – **pas d’index unique** explicite sur `(user_id, course_id)` (seulement PK composite, mais si la PK n’est pas présente ou si la table est créée sans PK, la clause `ON CONFLICT` fera un *scan* complet). | Le coût d’insertion croît linéairement avec le nombre de lignes. | Dégradation progressive du débit d’écriture, surtout en période de pic d’activité (lancement de nombreux cours). |
| **7** | Utilisation d’interpolation de variables dans les requêtes (`${variable}`) au lieu de **paramètres préparés**. | Si la couche `sql\`…\`` ne prépare réellement la requête, cela ouvre la porte à **SQL‑Injection** et empêche le ré‑utilisation du plan d’exécution, augmentant le temps de planification. | Risque de sécurité majeur, perte de performances due à des plans non réutilisables. |
| **8** | Pas d’**index** sur `stripe_customer_id` dans `users`. Le webhook effectue `SELECT id FROM users WHERE stripe_customer_id = $1`. | Sans index, PostgreSQL effectue un *seq scan* sur toute la table `users`. | Latence élevée (ms → dizaines de ms) chaque fois qu’un événement Stripe arrive, pouvant devenir un goulot d’étranglement si le trafic webhook augmente. |

### Observation spécifique à Neon Serverless
Neon facture à la fois le **CPU‑seconds** et les **I/O**. Chaque appel inutile (ex. `SELECT *`) augmente les I/O et donc la facture. De plus, les connexions sont **stateless** ; chaque appel crée généralement une nouvelle connexion, amplifiant l’impact des requêtes lourdes. Optimiser les requêtes et réduire le nombre d’appels est donc crucial pour la maîtrise des coûts.

---

## ## Risques d'intégrité de données

| # | Risque | Pourquoi il existe | Conséquence possible |
|---|--------|--------------------|----------------------|
| **1** | **Absence d’unicité** sur `stripe_customer_id` | Aucun `UNIQUE` déclaré (avant l’ajout de l’index). | Deux comptes différents pourraient partager le même identifiant Stripe → mise à jour du mauvais compte lors d’un webhook. |
| **2** | **Clé étrangère manquante** vers `courses` pour `course_progress.course_id` et `quiz_results.course_id` | Le schéma initial ne référencie pas la table `courses`. | Insertion possible d’un `course_id` qui n’existe pas, entraînant des incohérences dans les rapports d’apprentissage. |
| **3** | **Transactions manquantes** sur le webhook Stripe (multiple `UPDATE`/`INSERT`). | Opérations réalisées séparément. | Si la deuxième mise à jour échoue, le flag `is_premium` reste à `true` sans abonnement actif → perte de revenus, support client accru. |
| **4** | **Contraintes NOT NULL insuffisantes** | Par exemple, `stripe_customer_id` et `stripe_subscription_id` sont nullable alors qu’ils sont essentiels pour la facturation. | Incohérences de logique métier, requêtes qui retournent `NULL` et provoquent des erreurs d’application. |
| **5** | **Duplication accidentelle** dans `quiz_results` | Aucun `UNIQUE` sur `(user_id, course_id, completed_at)` (ajouté dans la migration, mais absent dans le schéma initial). | Deux enregistrements identiques pourraient gonfler les scores ou compromettre les calculs de progression. |
| **6** | **Mise à jour partielle** du champ `is_premium` via deux requêtes distinctes (`UPDATE users SET is_premium = true` puis `UPDATE users SET is_premium = $1`). | Le deuxième `UPDATE` utilise le même paramètre que le premier (`$1`) sans contrôle de cohérence. | Risque de régression du flag premium si le deuxième `UPDATE` reçoit une valeur erronée (ex. `false`). |
| **7** | **Suppression en cascade non définie** sur les tables dépendantes. | `subscriptions`, `course_progress`, `quiz_results` ne spécifient pas `ON DELETE CASCADE`. | Suppression d’un utilisateur laisse des lignes orphelines = accumulation de données inutiles. |

---

## ## Index recommandés (SQL prêt à exécuter)

```sql
/* --------------------------------------------------------------------
   1️⃣ Index uniques et FK supplémentaires
-------------------------------------------------------------------- */
-- Garantir l’unicité et accélérer les recherches webhook
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_stripe_customer_id
    ON users(stripe_customer_id)
    WHERE stripe_customer_id IS NOT NULL;

/* --------------------------------------------------------------------
   2️⃣ Index sur colonnes de filtrage / tri fréquentes
-------------------------------------------------------------------- */
-- Optimise la requête de session callback
CREATE INDEX IF NOT EXISTS idx_users_is_premium_id
    ON users(id, is_premium);

-- Optimise les recherches de progression d’un utilisateur
CREATE INDEX IF NOT EXISTS idx_course_progress_user_visited
    ON course_progress(user_id, visited_at DESC);

-- Optimise les recherches de scores de quiz
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_completed
    ON quiz_results(user_id, completed_at DESC);

/* --------------------------------------------------------------------
   3️⃣ Index pour les jointures Stripe / abonnement
-------------------------------------------------------------------- */
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub_id
    ON subscriptions(stripe_subscription_id);

-- Index sur user_id dans subscriptions pour les requêtes de gestion d’abonnement
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id
    ON subscriptions(user_id);

/* --------------------------------------------------------------------
   4️⃣ Index pour les requêtes de dashboard (jointure éventuelle)
-------------------------------------------------------------------- */
-- Couverture pour la jointure course_progress ↔ quiz_results
CREATE INDEX IF NOT EXISTS idx_course_progress_course_user
    ON course_progress(user_id, course_id);

CREATE INDEX IF NOT EXISTS idx_quiz_results_course_user
    ON quiz_results(user_id, course_id);

/* --------------------------------------------------------------------
   5️⃣ Index supplémentaires (sécurité & maintenance)
-------------------------------------------------------------------- */
-- Pour les recherches par email (déjà UNIQUE, mais on force l’ordre)
CREATE INDEX IF NOT EXISTS idx_users_email_lower
    ON users (lower(email));

-- Index sur status dans subscriptions (filtrage éventuel dans UI admin)
CREATE INDEX IF NOT EXISTS idx_subscriptions_status
    ON subscriptions(status);
```

> **Pourquoi ces index ?**  
> *Les index composés* (`user_id, visited_at DESC` et `user_id, completed_at DESC`) permettent à PostgreSQL de satisfaire directement les clauses `ORDER BY … DESC` sans trier en mémoire, réduisant le coût de **O(n log n)** à **O(log n)**.  
> L’index `idx_users_is_premium_id` résout le problème du callback fréquent en fournissant le champ voulu en même temps que la recherche par `id`.  
> L’index `idx_users_stripe_customer_id` évite le *seq scan* lors du webhook.

---

## ## Autres recommandations (optimisation, sécurité, bonnes pratiques)

### 1️⃣ Utiliser exclusivement les **requêtes paramétrées** (`sql\`…\``)  
Ne jamais interpoler directement des variables dans les chaînes SQL. `@neondatabase/serverless` supporte les *tagged template literals* qui transforment chaque `${var}` en paramètre préparé. Cela garantit :  

* protection contre les injections SQL,  
* ré‑utilisation du plan d’exécution (prepared statements) → gains de performance (évite la recompilation du plan à chaque appel).  

Exemple correct :  

```ts
const user = await sql<User>`
    SELECT id, password_hash, is_premium
    FROM users
    WHERE email = ${email}
    LIMIT 1;
`;
```

### 2️⃣ **Caching côté API** pour le flag `is_premium`  
Le champ `is_premium` change uniquement lors d’un webhook Stripe. On peut :  

* le placer dans le **payload JWT** (ou dans le cache Redis/Neon‑Cache) et ne le rafraîchir que lors d’un évènement `subscription.updated`.  
* ajouter un TTL court (ex. 5 min) si on veut rester tolérant aux changements en temps réel.  

Résultat : réduction de plusieurs dizaines d’appels `SELECT is_premium …` par minute, moindre charge I/O.

### 3️⃣ **Pagination & Limitation** dans les API de progression et de quiz  
Implémenter une pagination basée sur `LIMIT` + `OFFSET` ou, idéalement, la **cursor‑based pagination** (`WHERE visited_at < $cursor`). Exemple :

```sql
SELECT course_id, visited_at
FROM course_progress
WHERE user_id = $1
  AND visited_at < $2   -- cursor
ORDER BY visited_at DESC
LIMIT 50;
```

Cela protège contre les scans complets sur de gros historiques et garde les temps de réponse constants.

### 4️⃣ **Transactions atomiques** pour les webhooks Stripe  
Encapsuler toutes les modifications liées à un même événement dans une transaction :

```sql
BEGIN;

-- Vérifier l’utilisateur
SELECT id INTO user_id FROM users WHERE stripe_customer_id = $1 FOR UPDATE;

-- Mettre à jour le flag premium
UPDATE users SET is_premium = $2 WHERE id = user_id;

-- Upsert de l’abonnement
INSERT INTO subscriptions (user_id, stripe_subscription_id, stripe_price_id, status, current_period_end, updated_at)
VALUES (user_id, $3, $4, $5, $6, NOW())
ON CONFLICT (stripe_subscription_id) DO UPDATE
SET status = EXCLUDED.status,
    current_period_end = EXCLUDED.current_period_end,
    updated_at = NOW();

COMMIT;
```

En cas d’erreur, le `ROLLBACK` assure la **cohérence ACID**.

### 5️⃣ **Ajout de la table `courses` et de ses FK**  
Les tables `course_progress` et `quiz_results` référencent `course_id` sans contrainte de clé étrangère. Créer une table `courses` (au minimum `id`, `title`, `slug`, `created_at`) et ajouter les FK :  

* cela empêche les insertions de cours inexistants,  
* facilite les jointures et les index de couverture,  
* améliore la lisibilité du modèle métier.

### 6️⃣ **Gestion des colonnes `updated_at`**  
`subscriptions.updated_at` est mis à jour dans le code mais n’apparaît pas dans le `CREATE TABLE` initial.  

* Ajoutez la colonne avec `DEFAULT NOW()` et créez un **trigger** qui la met automatiquement à jour sur chaque `UPDATE`.  

```sql
CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_subscriptions_updated
BEFORE UPDATE ON subscriptions
FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
```

### 7️⃣ **Nettoyage des données orphelines**  
Planifiez un job périodique (ex. `cron` dans Neon) qui :

* supprime les lignes `course_progress` et `quiz_results` dont `user_id` n’existe plus (`ON DELETE CASCADE` dans les FK résout ce problème à la source).  
* archive les quiz anciens (> 2 ans) dans une table de type `quiz_results_archive` pour garder la table légère.

### 8️⃣ **Monitoring et alerte**  
* Activez `pg_stat_statements` (Neon le supporte) afin de visualiser les requêtes les plus lourdes.  
* Créez des métriques d’**I/O** et de **latence** pour les requêtes `SELECT is_premium` et le webhook Stripe – une hausse inattendue indique un problème de caching ou de trafic.  
* Définissez une alerte sur le nombre de *seq scans* sur `users` (devrait être 0 grâce à l’index `stripe_customer_id`).  

### 9️⃣ **Optimisation du dashboard** – **Jointure unique**  
Lorsque le tableau de bord affiche à la fois la dernière visite du cours et le dernier score, on peut regrouper les deux requêtes :

```sql
SELECT cp.course_id,
       cp.visited_at,
       qr.score,
       qr.total,
       qr.completed_at
FROM course_progress cp
LEFT JOIN LATERAL (
    SELECT score, total, completed_at
    FROM quiz_results qr
    WHERE qr.user_id = cp.user_id
      AND qr.course_id = cp.course_id
    ORDER BY completed_at DESC
    LIMIT 1
) qr ON TRUE
WHERE cp.user_id = $1
ORDER BY cp.visited_at DESC
LIMIT 50;
```

Cela réduit le nombre de round‑trip de 2 à 1 et exploite pleinement les index composés.

### 10️⃣ **Documentation et migration**  
* Stockez le **schéma complet** (y compris les tables `courses`, `course_progress`, `quiz_results`) dans un fichier versionné `db/schema.sql`.  
* Utilisez un outil de migration comme **Prisma Migrate**, **Flyway** ou **dbmate** afin que chaque modification de schéma soit versionnée et appliquée automatiquement en CI.  
* Ajoutez un **README** indiquant les contraintes (UNIQUE, NOT NULL) et les index critiques pour les nouveaux développeurs.

---

## ## Conclusion

L’audit montre que la base de données d’Apprendia possède déjà un socle fonctionnel (`users`, `subscriptions`), mais plusieurs lacunes compromettent la performance, la scalabilité et la sûreté des données :

1. **Performance** – requêtes trop larges (`SELECT *`), absence de pagination, manque d’index sur les colonnes les plus filtrées, appels multiples dans le dashboard.  
2. **Intégrité** – absence de contraintes de clé étrangère, de contraintes d’unicité sur `stripe_customer_id`, de transactions atomiques lors des webhooks.  
3. **Sécurité** – interpolation directe des variables, risque d’injection SQL.  

En appliquant les **modifications de schéma** (ajout des tables, contraintes, index), les **optimisations de requêtes** (colonne sélective, jointure unique, cache du flag premium) et les **bonnes pratiques** (transactions, migrations versionnées, monitoring), la plateforme gagnera :  

* **Temps de réponse** nettement réduits (souvent de 2‑5 ms à < 1 ms pour les requêtes critiques).  
* **Coûts Neon** diminués grâce à moins d’I/O et de plans de requêtes lourds.  
* **Robustesse** accrue – les incohérences entre abonnements et statut premium seront éliminées.  
* **Sécurité** renforcée – aucun vecteur d’injection SQL restant.

Ces actions constituent un **plan d’action immédiat** (index, transactions, requêtes ciblées) et un **plan à moyen terme** (introduction de la table `courses`, nettoyage périodique, mise en place d’un système de migration). Une fois implémentées, la base de données d’Apprendia sera prête à supporter une croissance importante du nombre d’utilisateurs tout en maintenant une expérience réactive et fiable.
