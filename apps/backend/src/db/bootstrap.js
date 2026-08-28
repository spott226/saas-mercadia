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
        ALTER TABLE users
          ADD COLUMN IF NOT EXISTS role VARCHAR(30) NOT NULL DEFAULT 'admin'
        `
      );

      await pool.query(
        `
        ALTER TABLE products
          ADD COLUMN IF NOT EXISTS item_type VARCHAR(20) NOT NULL DEFAULT 'product',
          ADD COLUMN IF NOT EXISTS has_variants BOOLEAN NOT NULL DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS track_inventory BOOLEAN NOT NULL DEFAULT TRUE
        `
      );

      await pool.query(
        `
        ALTER TABLE order_items
          ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(12,2)
        `
      );

      await pool.query(
        `
        UPDATE order_items oi
        SET unit_cost = COALESCE(pv.cost, 0)
        FROM product_variants pv
        WHERE oi.variant_id = pv.id
          AND oi.unit_cost IS NULL
        `
      );

      await pool.query(
        `
        UPDATE products p
        SET has_variants = TRUE
        WHERE has_variants = FALSE
          AND EXISTS (
            SELECT 1
            FROM product_variants pv
            WHERE pv.product_id = p.id
            GROUP BY pv.product_id
            HAVING COUNT(*) > 1
              OR BOOL_OR(
                LOWER(COALESCE(pv.color, '')) NOT IN ('', 'unica', 'única')
                OR LOWER(COALESCE(pv.size, '')) NOT IN ('', 'unica', 'única')
              )
          )
        `
      );

      await pool.query(
        `
        CREATE TABLE IF NOT EXISTS merchant_accounts (
          id BIGSERIAL PRIMARY KEY,
          supabase_user_id UUID UNIQUE,
          email VARCHAR(320) NOT NULL UNIQUE,
          full_name VARCHAR(120) NOT NULL,
          phone VARCHAR(30),
          business_name VARCHAR(120) NOT NULL,
          desired_slug VARCHAR(80) NOT NULL,
          status VARCHAR(30) NOT NULL DEFAULT 'pending_email'
            CHECK (status IN ('pending_email','payment_pending','payment_reported','active','rejected','suspended')),
          plan_amount NUMERIC(10,2) NOT NULL DEFAULT 399,
          payment_reference VARCHAR(40) NOT NULL UNIQUE,
          store_id INTEGER REFERENCES stores(id) ON DELETE SET NULL,
          email_verified BOOLEAN NOT NULL DEFAULT FALSE,
          approved_at TIMESTAMPTZ,
          approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        `
      );

      await pool.query(
        `
        CREATE TABLE IF NOT EXISTS merchant_payments (
          id BIGSERIAL PRIMARY KEY,
          merchant_account_id BIGINT NOT NULL REFERENCES merchant_accounts(id) ON DELETE CASCADE,
          amount NUMERIC(10,2) NOT NULL,
          reference VARCHAR(40) NOT NULL,
          proof_url TEXT,
          notes VARCHAR(500),
          status VARCHAR(20) NOT NULL DEFAULT 'reported'
            CHECK (status IN ('reported','approved','rejected')),
          rejection_reason VARCHAR(500),
          reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          reviewed_at TIMESTAMPTZ,
          reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL
        )
        `
      );

      await pool.query(
        `
        ALTER TABLE merchant_accounts
          ALTER COLUMN plan_amount SET DEFAULT 399
        `
      );

      await pool.query(
        `
        UPDATE merchant_accounts
        SET plan_amount = 399,
            updated_at = NOW()
        WHERE plan_amount = 3.99
          AND status IN ('pending_email','payment_pending','payment_reported')
        `
      );

      await pool.query(
        `
        CREATE INDEX IF NOT EXISTS merchant_payments_status_idx
        ON merchant_payments (status, reported_at DESC)
        `
      );

      await pool.query(
        `
        UPDATE users
        SET role = 'superadmin'
        WHERE id = (SELECT MIN(id) FROM users)
          AND NOT EXISTS (
            SELECT 1 FROM users WHERE role = 'superadmin'
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
        CREATE TABLE IF NOT EXISTS merchant_push_subscriptions (
          id BIGSERIAL PRIMARY KEY,
          store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
          merchant_account_id BIGINT NOT NULL REFERENCES merchant_accounts(id) ON DELETE CASCADE,
          endpoint TEXT NOT NULL UNIQUE,
          p256dh TEXT NOT NULL,
          auth TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        `
      );

      await pool.query(
        `CREATE INDEX IF NOT EXISTS merchant_push_store_idx
         ON merchant_push_subscriptions (store_id)`
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
