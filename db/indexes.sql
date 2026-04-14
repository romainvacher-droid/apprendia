-- Indexes recommandés par DataBot — à exécuter sur Neon PostgreSQL
-- Connecter via : psql $DATABASE_URL

-- 1. Accélère le webhook Stripe (évite seq scan sur users)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_stripe_customer_id
    ON users(stripe_customer_id)
    WHERE stripe_customer_id IS NOT NULL;

-- 2. Optimise le session callback (id + is_premium ensemble)
CREATE INDEX IF NOT EXISTS idx_users_id_premium
    ON users(id, is_premium);

-- 3. Optimise les requêtes de progression (dashboard + API)
CREATE INDEX IF NOT EXISTS idx_course_progress_user_visited
    ON course_progress(user_id, visited_at DESC);

-- 4. Optimise les requêtes de quiz
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_completed
    ON quiz_results(user_id, completed_at DESC);

-- 5. Unicité stripe_subscription_id (requis par ON CONFLICT)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_stripe_subscription_id'
  ) THEN
    ALTER TABLE subscriptions ADD CONSTRAINT uq_stripe_subscription_id UNIQUE (stripe_subscription_id);
  END IF;
END$$;

-- 6. Index sur subscriptions.user_id pour les jointures
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id
    ON subscriptions(user_id);

-- 7. Index email insensible à la casse (évite doublons casse différente)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower
    ON users(lower(email));
