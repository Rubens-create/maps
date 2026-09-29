CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 100),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS properties (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  titulo text NOT NULL CHECK (char_length(titulo) BETWEEN 3 AND 150),
  descricao text,
  tipo text NOT NULL CHECK (tipo IN ('Venda', 'Aluguel')),
  preco numeric(14, 2) NOT NULL CHECK (preco > 0),
  quartos smallint NOT NULL DEFAULT 1 CHECK (quartos >= 0),
  banheiros smallint NOT NULL DEFAULT 1 CHECK (banheiros >= 0),
  area numeric(8, 2) CHECK (area > 0),
  aceita_pet boolean NOT NULL DEFAULT false,
  whatsapp text,
  foto_capa text,
  location geometry(Point, 4326) NOT NULL,
  cidade text,
  estado text,
  bairro text,
  endereco text,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS properties_location_gix
  ON properties USING GIST (location);
CREATE INDEX IF NOT EXISTS properties_user_id_idx
  ON properties (user_id);
CREATE INDEX IF NOT EXISTS properties_tipo_idx
  ON properties (tipo);
CREATE INDEX IF NOT EXISTS properties_preco_idx
  ON properties (preco);
