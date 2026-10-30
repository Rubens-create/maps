CREATE INDEX IF NOT EXISTS properties_city_tipo_idx
  ON properties (LOWER(BTRIM(cidade)), tipo)
  WHERE cidade IS NOT NULL;
