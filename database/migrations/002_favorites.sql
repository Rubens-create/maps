CREATE TABLE IF NOT EXISTS favorites (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id integer NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, property_id)
);

CREATE INDEX IF NOT EXISTS favorites_user_created_at_idx
  ON favorites (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS favorites_property_id_idx
  ON favorites (property_id);
