ALTER TABLE customer_accounts
  ADD COLUMN IF NOT EXISTS email VARCHAR(320),
  ADD COLUMN IF NOT EXISTS supabase_user_id UUID;

ALTER TABLE customer_accounts
  ALTER COLUMN password_hash DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS
  customer_accounts_store_email_idx
ON customer_accounts (store_id, email)
WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS
  customer_accounts_supabase_user_idx
ON customer_accounts (supabase_user_id)
WHERE supabase_user_id IS NOT NULL;
