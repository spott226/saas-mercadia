const pool = require("./db");

let bootstrapPromise = null;

async function ensureCustomerAccountSchema(){

  if(bootstrapPromise){
    return bootstrapPromise;
  }

  bootstrapPromise =
    (async () => {
      await pool.query(
        `
        CREATE TABLE IF NOT EXISTS customer_accounts (
          id SERIAL PRIMARY KEY,
          store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
          customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
          name VARCHAR(120) NOT NULL,
          phone VARCHAR(30) NOT NULL,
          password_hash TEXT,
          email VARCHAR(320),
          supabase_user_id UUID,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          last_login_at TIMESTAMPTZ
        )
        `
      );

      await pool.query(
        `
        ALTER TABLE customer_accounts
          ADD COLUMN IF NOT EXISTS email VARCHAR(320),
          ADD COLUMN IF NOT EXISTS supabase_user_id UUID
        `
      );

      await pool.query(
        `
        ALTER TABLE customer_accounts
          ALTER COLUMN password_hash DROP NOT NULL
        `
      );

      await pool.query(
        `
        CREATE UNIQUE INDEX IF NOT EXISTS
          customer_accounts_store_phone_idx
        ON customer_accounts (store_id, phone)
        `
      );

      await pool.query(
        `
        CREATE INDEX IF NOT EXISTS
          customer_accounts_customer_idx
        ON customer_accounts (customer_id)
        `
      );

      await pool.query(
        `
        CREATE TABLE IF NOT EXISTS push_subscriptions (
          id BIGSERIAL PRIMARY KEY,
          store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
          customer_account_id INTEGER NOT NULL REFERENCES customer_accounts(id) ON DELETE CASCADE,
          endpoint TEXT NOT NULL UNIQUE,
          p256dh TEXT NOT NULL,
          auth TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        `
      );

      await pool.query(
        `
        CREATE INDEX IF NOT EXISTS push_subscriptions_account_idx
        ON push_subscriptions (customer_account_id)
        `
      );

      await pool.query(
        `
        CREATE UNIQUE INDEX IF NOT EXISTS
          customer_accounts_store_email_idx
        ON customer_accounts (store_id, email)
        WHERE email IS NOT NULL
        `
      );

      await pool.query(
        `
        CREATE INDEX IF NOT EXISTS
          customer_accounts_supabase_user_idx
        ON customer_accounts (supabase_user_id)
        WHERE supabase_user_id IS NOT NULL
        `
      );
    })();

  return bootstrapPromise;

}

module.exports = {
  ensureCustomerAccountSchema
};
