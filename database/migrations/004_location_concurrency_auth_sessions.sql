ALTER TABLE users
  ADD COLUMN IF NOT EXISTS location_consent_version integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS auth_sessions (
  token_id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS auth_sessions_user_expiry_idx
  ON auth_sessions (user_id, expires_at);

CREATE INDEX IF NOT EXISTS auth_sessions_expiry_idx
  ON auth_sessions (expires_at);
