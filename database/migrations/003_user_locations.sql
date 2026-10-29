ALTER TABLE users
  ADD COLUMN IF NOT EXISTS precise_location_enabled boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS user_locations (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  captured_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_locations_captured_at_idx
  ON user_locations (captured_at);
