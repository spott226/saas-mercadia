BEGIN;
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(30),
  ADD COLUMN IF NOT EXISTS owner_name VARCHAR(120),
  ADD COLUMN IF NOT EXISTS phone VARCHAR(30),
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS business_hours TEXT;
ALTER TABLE store_promotions
  ADD COLUMN IF NOT EXISTS internal_name VARCHAR(160) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS type VARCHAR(30) NOT NULL DEFAULT 'popup',
  ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 0;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'store_promotions_type_check'
      AND conrelid = 'store_promotions'::regclass
  ) THEN
    ALTER TABLE store_promotions
      ADD CONSTRAINT store_promotions_type_check
      CHECK (type IN ('popup','banner','top_notice','featured'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'store_promotions_dates_check'
      AND conrelid = 'store_promotions'::regclass
  ) THEN
    ALTER TABLE store_promotions
      ADD CONSTRAINT store_promotions_dates_check
      CHECK (starts_at IS NULL OR ends_at IS NULL OR ends_at >= starts_at);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_promotions_display ON store_promotions(store_id, type, priority DESC, id DESC);
COMMIT;
