CREATE TABLE IF NOT EXISTS store_promotions (
  id SERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  title VARCHAR(160) NOT NULL,
  description TEXT,
  discount_text VARCHAR(120),
  button_text VARCHAR(80),
  button_url TEXT,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMP,
  ends_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_promotions_store_id
ON store_promotions(store_id);

CREATE INDEX IF NOT EXISTS idx_store_promotions_store_active
ON store_promotions(store_id, is_active);

CREATE INDEX IF NOT EXISTS idx_store_promotions_dates
ON store_promotions(starts_at, ends_at);
