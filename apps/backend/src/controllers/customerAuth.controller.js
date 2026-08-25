const pool = require("../db/db");
const supabaseAuth = require("../services/supabaseAuth");

function clean(value, max = 255){
  return String(value || "").trim().slice(0, max);
}

function normalizeEmail(value){
  return clean(value, 320).toLowerCase();
}

function normalizePhone(value){
  return String(value || "").replace(/\D/g, "").slice(0, 30);
}

function isEmail(value){
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function redirectUrl(value){
  const raw = clean(value, 2000);
  if(!raw) return undefined;

  try{
    const url = new URL(raw);
    return ["http:", "https:"].includes(url.protocol)
      ? url.toString()
      : undefined;
  }catch(error){
    return undefined;
  }
}

function publicAuthError(error){
  const message = String(error?.message || "").toLowerCase();

  if(message.includes("invalid login") || message.includes("invalid credentials")){
    return "correo o contrasena incorrectos";
  }
  if(message.includes("email not confirmed")){
    return "confirma tu correo antes de iniciar sesion";
  }
  if(error?.status === 429){
    return "demasiados intentos; espera unos minutos";
  }
  return "no se pudo completar la autenticacion";
}

function sessionPayload(data){
  if(!data?.access_token) return {};

  return {
    token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
    expires_at:
      Math.floor(Date.now() / 1000) + Number(data.expires_in || 3600)
  };
}

async function findStore(client, storeId){
  const result = await client.query(
    "SELECT id, name, slug FROM stores WHERE id = $1 LIMIT 1",
    [storeId]
  );
  return result.rows[0] || null;
}

async function findCustomer(client, storeId, phone){
  const result = await client.query(
    `SELECT * FROM customers
     WHERE store_id = $1
       AND regexp_replace(COALESCE(phone, ''), '\\D', '', 'g') = $2
     ORDER BY total_orders DESC, id DESC LIMIT 1`,
    [storeId, phone]
  );
  return result.rows[0] || null;
}

async function findAccount(client, storeId, supabaseUserId, email){
  const result = await client.query(
    `SELECT * FROM customer_accounts
     WHERE store_id = $1
       AND (
         ($2::uuid IS NOT NULL AND supabase_user_id = $2)
         OR ($3::text IS NOT NULL AND email = $3)
       )
     LIMIT 1`,
    [storeId, supabaseUserId || null, email || null]
  );
  return result.rows[0] || null;
}

async function saveAccount(client, data){
  await client.query("BEGIN");

  try{
    let customer = await findCustomer(client, data.storeId, data.phone);

    if(customer){
      const updated = await client.query(
        "UPDATE customers SET name = $1 WHERE id = $2 RETURNING *",
        [data.name, customer.id]
      );
      customer = updated.rows[0];
    }else{
      const inserted = await client.query(
        `INSERT INTO customers
           (store_id, name, phone, total_orders, total_spent)
         VALUES ($1,$2,$3,0,0) RETURNING *`,
        [data.storeId, data.name, data.phone]
      );
      customer = inserted.rows[0];
    }

    const existingAccountResult = await client.query(
      `SELECT * FROM customer_accounts
       WHERE store_id = $1
         AND regexp_replace(COALESCE(phone, ''), '\\D', '', 'g') = $2
       LIMIT 1`,
      [data.storeId, data.phone]
    );
    const existingAccount = existingAccountResult.rows[0];

    const result = existingAccount
      ? await client.query(
          `UPDATE customer_accounts
           SET customer_id = $1, name = $2, phone = $3, email = $4,
               supabase_user_id = $5, password_hash = NULL,
               is_active = TRUE, updated_at = NOW()
           WHERE id = $6
           RETURNING *`,
          [
            customer.id,
            data.name,
            data.phone,
            data.email,
            data.supabaseUserId,
            existingAccount.id
          ]
        )
      : await client.query(
      `INSERT INTO customer_accounts
         (store_id, customer_id, name, phone, email, supabase_user_id, password_hash)
       VALUES ($1,$2,$3,$4,$5,$6,NULL)
       ON CONFLICT (store_id, email)
       DO UPDATE SET
         customer_id = EXCLUDED.customer_id,
         name = EXCLUDED.name,
         phone = EXCLUDED.phone,
         supabase_user_id = EXCLUDED.supabase_user_id,
         is_active = TRUE,
         updated_at = NOW()
       RETURNING *`,
      [
        data.storeId,
        customer.id,
        data.name,
        data.phone,
        data.email,
        data.supabaseUserId
      ]
    );

    await client.query("COMMIT");
    return result.rows[0];
  }catch(error){
    await client.query("ROLLBACK");
    throw error;
  }
}

async function customerOrders(client, storeId, phone){
  const result = await client.query(
    `SELECT * FROM orders
     WHERE store_id = $1
       AND regexp_replace(COALESCE(customer_phone, ''), '\\D', '', 'g') = $2
     ORDER BY id DESC`,
    [storeId, phone]
  );
  const orders = result.rows;
  if(!orders.length) return [];

  const itemsResult = await client.query(
    "SELECT * FROM order_items WHERE order_id = ANY($1) ORDER BY id ASC",
    [orders.map(order => order.id)]
  );
  const itemsByOrder = new Map();

  for(const item of itemsResult.rows){
    const list = itemsByOrder.get(item.order_id) || [];
    list.push(item);
    itemsByOrder.set(item.order_id, list);
  }

  return orders.map(order => ({
    ...order,
    items: itemsByOrder.get(order.id) || []
  }));
}

exports.register = async (req, res, next) => {
  const client = await pool.connect();

  try{
    const storeId = Number(req.body.store_id);
    const name = clean(req.body.name, 120);
    const phone = normalizePhone(req.body.phone);
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");

    if(!Number.isInteger(storeId) || !name || phone.length < 8 || !isEmail(email) || password.length < 6){
      return res.status(400).json({
        success: false,
        error: "nombre, telefono, correo valido y contrasena de 6 caracteres son requeridos"
      });
    }

    const store = await findStore(client, storeId);
    if(!store){
      return res.status(404).json({ success: false, error: "store not found" });
    }

    let authData;
    let existingUser = false;

    try{
      authData = await supabaseAuth.signIn(email, password);
      existingUser = true;
    }catch(error){
      authData = await supabaseAuth.signUp({
        email,
        password,
        name,
        phone,
        storeId,
        redirectTo: redirectUrl(req.body.redirect_to)
      });
    }

    const authUser = authData.user;
    const hasRealIdentity =
      existingUser ||
      !Array.isArray(authUser?.identities) ||
      authUser.identities.length > 0;

    if(!authUser?.id || !hasRealIdentity){
      return res.status(202).json({
        success: true,
        email_confirmation_required: true
      });
    }

    const account = await saveAccount(client, {
      storeId,
      name,
      phone,
      email,
      supabaseUserId: authUser.id
    });

    res.status(existingUser ? 200 : 201).json({
      success: true,
      email_confirmation_required: !authData.access_token,
      ...sessionPayload(authData),
      customer: {
        id: account.id,
        store_id: account.store_id,
        customer_id: account.customer_id,
        name: account.name,
        phone: account.phone,
        email: account.email,
        store
      }
    });
  }catch(error){
    if(error?.status){
      return res.status(error.status >= 500 ? 502 : error.status).json({
        success: false,
        error: publicAuthError(error)
      });
    }
    next(error);
  }finally{
    client.release();
  }
};

exports.login = async (req, res, next) => {
  const client = await pool.connect();

  try{
    const storeId = Number(req.body.store_id);
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");

    if(!Number.isInteger(storeId) || !isEmail(email) || !password){
      return res.status(400).json({
        success: false,
        error: "store_id, correo y contrasena son requeridos"
      });
    }

    const authData = await supabaseAuth.signIn(email, password);
    const account = await findAccount(client, storeId, authData.user?.id, email);

    if(!account || !account.is_active){
      return res.status(403).json({
        success: false,
        error: "esta cuenta no pertenece a esta tienda"
      });
    }

    await client.query(
      `UPDATE customer_accounts
       SET supabase_user_id = COALESCE(supabase_user_id, $1),
           last_login_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [authData.user?.id, account.id]
    );

    const store = await findStore(client, storeId);
    res.json({
      success: true,
      ...sessionPayload(authData),
      customer: {
        id: account.id,
        store_id: account.store_id,
        customer_id: account.customer_id,
        name: account.name,
        phone: account.phone,
        email: account.email,
        store
      }
    });
  }catch(error){
    if(error?.status){
      return res.status(error.status >= 500 ? 502 : error.status).json({
        success: false,
        error: publicAuthError(error)
      });
    }
    next(error);
  }finally{
    client.release();
  }
};

exports.refresh = async (req, res, next) => {
  try{
    const token = String(req.body.refresh_token || "");
    if(!token){
      return res.status(400).json({ success: false, error: "refresh_token requerido" });
    }

    const data = await supabaseAuth.refresh(token);
    res.json({ success: true, ...sessionPayload(data) });
  }catch(error){
    if(error?.status){
      return res.status(401).json({ success: false, error: "la sesion vencio" });
    }
    next(error);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try{
    const email = normalizeEmail(req.body.email);
    if(!isEmail(email)){
      return res.status(400).json({ success: false, error: "correo valido requerido" });
    }

    await supabaseAuth.recover(email, redirectUrl(req.body.redirect_to));
    res.json({
      success: true,
      message: "Si existe una cuenta, recibiras un correo para cambiar tu contrasena."
    });
  }catch(error){
    if(error?.status){
      return res.status(error.status >= 500 ? 502 : error.status).json({
        success: false,
        error: publicAuthError(error)
      });
    }
    next(error);
  }
};

exports.updatePassword = async (req, res, next) => {
  try{
    const password = String(req.body.password || "");
    if(password.length < 6){
      return res.status(400).json({
        success: false,
        error: "la contrasena debe tener al menos 6 caracteres"
      });
    }

    await supabaseAuth.updatePassword(req.accessToken, password);
    res.json({ success: true, message: "contrasena actualizada" });
  }catch(error){
    if(error?.status){
      return res.status(401).json({ success: false, error: publicAuthError(error) });
    }
    next(error);
  }
};

exports.me = async (req, res, next) => {
  const client = await pool.connect();

  try{
    const result = await client.query(
      `SELECT ca.id, ca.store_id, ca.customer_id, ca.name, ca.phone, ca.email,
              ca.created_at, ca.last_login_at, c.address, c.total_orders, c.total_spent
       FROM customer_accounts ca
       LEFT JOIN customers c ON c.id = ca.customer_id
       WHERE ca.id = $1 AND ca.store_id = $2 LIMIT 1`,
      [req.user.customer_account_id, req.user.store_id]
    );
    const account = result.rows[0];

    if(!account){
      return res.status(404).json({ success: false, error: "cuenta no encontrada" });
    }

    const store = await findStore(client, req.user.store_id);
    res.json({ success: true, customer: { ...account, store } });
  }catch(error){
    next(error);
  }finally{
    client.release();
  }
};

exports.getMyOrders = async (req, res, next) => {
  const client = await pool.connect();

  try{
    const orders = await customerOrders(client, req.user.store_id, req.user.phone);
    res.json({ success: true, orders });
  }catch(error){
    next(error);
  }finally{
    client.release();
  }
};
