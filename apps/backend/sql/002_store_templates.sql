ALTER TABLE stores
ADD COLUMN IF NOT EXISTS business_type VARCHAR(40) NOT NULL DEFAULT 'ecommerce';

ALTER TABLE stores
ADD COLUMN IF NOT EXISTS template_key VARCHAR(80) NOT NULL DEFAULT 'ecommerce_default';

CREATE INDEX IF NOT EXISTS idx_stores_business_type
ON stores(business_type);
