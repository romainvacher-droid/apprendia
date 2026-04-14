-- Migration : table de réinitialisation de mot de passe
-- À exécuter sur Neon PostgreSQL : psql $DATABASE_URL -f db/migration_reset_tokens.sql

CREATE TABLE IF NOT EXISTS password_resets (
  id         SERIAL PRIMARY KEY,
  email      TEXT NOT NULL,
  token      TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used       BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email);

-- Nettoyage automatique des tokens expirés (optionnel, à exécuter périodiquement)
-- DELETE FROM password_resets WHERE expires_at < NOW() OR used = true;
