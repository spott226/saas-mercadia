BEGIN;
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS custom_domain VARCHAR(253),
  ADD COLUMN IF NOT EXISTS custom_domain_status VARCHAR(20) NOT NULL DEFAULT 'none';
CREATE UNIQUE INDEX IF NOT EXISTS stores_custom_domain_unique
  ON stores (LOWER(custom_domain)) WHERE custom_domain IS NOT NULL;
COMMIT;
