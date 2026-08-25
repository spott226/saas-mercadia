ALTER TABLE stores
ADD COLUMN IF NOT EXISTS homepage_sections JSONB NOT NULL DEFAULT '[]'::jsonb;
