const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const pool = require("../db/db");
const supabaseAuth = require("../services/supabaseAuth");
const { JWT_SECRET, JWT_EXPIRES_IN } = require("../config/auth");

const PLAN_AMOUNT = 3.99;

function clean(value, max = 255){
  return String(value || "").trim().slice(0, max);
}

function email(value){
  return clean(value, 320).toLowerCase();
}

function slugify(value){
  return clean(value, 80)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function paymentReference(){
  return `MER-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

function bankDetails(){
  return {
    bank_name: process.env.BANK_NAME || "Nu México",
    bank_account: process.env.BANK_ACCOUNT || "",
    bank_beneficiary: process.env.BANK_BENEFICIARY || ""
  };
}

function sessionPayload(data){
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in
  };
}

function merchantView(account){
  return {
    id: account.id,
    email: account.email,
    full_name: account.full_name,
    phone: account.phone,
    business_name: account.business_name,
    desired_slug: account.desired_slug,
    status: account.status,
    plan_amount: Number(account.plan_amount),
    payment_reference: account.payment_reference,
    store_id: account.store_id,
    email_verified: account.email_verified,
    store_url: account.store_slug
      ? `/tienda/${account.store_slug}`
      : null,
    admin_url: account.store_id
      ? "/admin/dashboard.html"
      : null
  };
}

async function accountByAuthUser(authUser){
  const result = await pool.query(
    `SELECT ma.*, s.slug AS store_slug
     FROM merchant_accounts ma
     LEFT JOIN stores s ON s.id = ma.store_id
     WHERE ma.supabase_user_id = $1 OR ma.email = $2
     ORDER BY ma.id DESC LIMIT 1`,
    [authUser.id, email(authUser.email)]
  );
  return result.rows[0] || null;
}

async function authUserFromRequest(req){
  const header = String(req.headers.authorization || "");
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if(!token){
    const error = new Error("token required");
    error.status = 401;
    throw error;
  }
  return {
    token,
    user: await supabaseAuth.getUser(token)
  };
}

exports.register = async (req, res, next) => {
  try{
    const fullName = clean(req.body.full_name, 120);
    const phone = clean(req.body.phone, 30);
    const userEmail = email(req.body.email);
    const password = String(req.body.password || "");
    const businessName = clean(req.body.business_name, 120);
    const desiredSlug = slugify(req.body.slug || businessName);

    if(!fullName || !businessName || !desiredSlug || !/^\S+@\S+\.\S+$/.test(userEmail) || password.length < 8){
      return res.status(400).json({
        success: false,
        error: "Completa nombre, negocio, correo y una contraseña de al menos 8 caracteres."
      });
    }

    const existing = await pool.query(
      "SELECT id FROM merchant_accounts WHERE email = $1 LIMIT 1",
      [userEmail]
    );
    if(existing.rows.length){
      return res.status(409).json({ success: false, error: "Ese correo ya está registrado." });
    }

    const authData = await supabaseAuth.signUp({
      email: userEmail,
      password,
      name: fullName,
      phone,
      storeId: null,
      redirectTo: `${req.protocol}://${req.get("host")}/?verified=1`
    });

    if(!authData.user?.id){
      return res.status(502).json({ success: false, error: "No se pudo crear la cuenta de acceso." });
    }

    const result = await pool.query(
      `INSERT INTO merchant_accounts
       (supabase_user_id,email,full_name,phone,business_name,desired_slug,status,plan_amount,payment_reference,email_verified)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        authData.user.id,
        userEmail,
        fullName,
        phone || null,
        businessName,
        desiredSlug,
        authData.access_token ? "payment_pending" : "pending_email",
        PLAN_AMOUNT,
        paymentReference(),
        Boolean(authData.access_token)
      ]
    );

    res.status(201).json({
      success: true,
      email_confirmation_required: !authData.access_token,
      merchant: merchantView(result.rows[0]),
      ...(authData.access_token ? sessionPayload(authData) : {})
    });
  }catch(error){
    if(error?.status){
      return res.status(error.status < 500 ? error.status : 502).json({
        success: false,
        error: error.message || "No se pudo crear la cuenta."
      });
    }
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try{
    const authData = await supabaseAuth.signIn(email(req.body.email), String(req.body.password || ""));
    const account = await accountByAuthUser(authData.user);
    if(!account){
      return res.status(403).json({ success: false, error: "La cuenta no está registrada en Mercadia." });
    }

    const nextStatus = account.status === "pending_email" ? "payment_pending" : account.status;
    await pool.query(
      `UPDATE merchant_accounts
       SET supabase_user_id = $1, email_verified = TRUE, status = $2, updated_at = NOW()
       WHERE id = $3`,
      [authData.user.id, nextStatus, account.id]
    );
    account.status = nextStatus;
    account.email_verified = true;

    let adminToken = null;
    if(account.status === "active" && account.store_id){
      adminToken = jwt.sign(
        { merchant_id: account.id, store_id: account.store_id, role: "admin" },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );
    }

    res.json({
      success: true,
      ...sessionPayload(authData),
      admin_token: adminToken,
      merchant: merchantView(account),
      bank: bankDetails()
    });
  }catch(error){
    if(error?.status){
      return res.status(error.status < 500 ? error.status : 502).json({
        success: false,
        error: String(error.message || "No se pudo iniciar sesión.")
      });
    }
    next(error);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try{
    await supabaseAuth.recover(
      email(req.body.email),
      `${req.protocol}://${req.get("host")}/?reset=1`
    );
    res.json({ success: true, message: "Si la cuenta existe, recibirás el correo para cambiar tu contraseña." });
  }catch(error){
    if(error?.status){
      return res.status(error.status < 500 ? error.status : 502).json({ success: false, error: error.message });
    }
    next(error);
  }
};

exports.updatePassword = async (req, res, next) => {
  try{
    const auth = await authUserFromRequest(req);
    const password = String(req.body.password || "");
    if(password.length < 8){
      return res.status(400).json({ success: false, error: "La contraseña debe tener al menos 8 caracteres." });
    }
    await supabaseAuth.updatePassword(auth.token, password);
    res.json({ success: true, message: "Contraseña actualizada." });
  }catch(error){
    if(error?.status){
      return res.status(error.status).json({ success: false, error: error.message });
    }
    next(error);
  }
};

exports.me = async (req, res, next) => {
  try{
    const auth = await authUserFromRequest(req);
    const account = await accountByAuthUser(auth.user);
    if(!account){
      return res.status(404).json({ success: false, error: "Cuenta no encontrada." });
    }

    if(account.status === "pending_email"){
      await pool.query(
        `UPDATE merchant_accounts
         SET status = 'payment_pending', email_verified = TRUE,
             supabase_user_id = $1, updated_at = NOW()
         WHERE id = $2`,
        [auth.user.id, account.id]
      );
      account.status = "payment_pending";
      account.email_verified = true;
    }
    res.json({ success: true, merchant: merchantView(account), bank: bankDetails() });
  }catch(error){
    if(error?.status){
      return res.status(error.status).json({ success: false, error: error.message });
    }
    next(error);
  }
};

exports.reportPayment = async (req, res, next) => {
  try{
    const auth = await authUserFromRequest(req);
    const account = await accountByAuthUser(auth.user);
    if(!account){
      return res.status(404).json({ success: false, error: "Cuenta no encontrada." });
    }
    if(account.status !== "payment_pending"){
      return res.status(409).json({ success: false, error: "La cuenta no está pendiente de pago." });
    }

    const proofUrl = req.file?.path || req.file?.secure_url || null;
    const payment = await pool.query(
      `INSERT INTO merchant_payments
       (merchant_account_id,amount,reference,proof_url,notes,status)
       VALUES ($1,$2,$3,$4,$5,'reported') RETURNING *`,
      [account.id, account.plan_amount, account.payment_reference, proofUrl, clean(req.body.notes, 500) || null]
    );
    await pool.query(
      "UPDATE merchant_accounts SET status = 'payment_reported', updated_at = NOW() WHERE id = $1",
      [account.id]
    );
    res.status(201).json({ success: true, payment: payment.rows[0] });
  }catch(error){
    if(error?.status){
      return res.status(error.status).json({ success: false, error: error.message });
    }
    next(error);
  }
};

exports.adminLogin = async (req, res, next) => {
  try{
    const userEmail = email(req.body.email);
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1 AND role = 'superadmin' LIMIT 1",
      [userEmail]
    );
    const user = result.rows[0];
    if(!user || !(await bcrypt.compare(String(req.body.password || ""), user.password))){
      return res.status(401).json({ success: false, error: "Credenciales incorrectas." });
    }
    const token = jwt.sign(
      { user_id: user.id, role: "superadmin" },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    res.json({ success: true, token });
  }catch(error){
    next(error);
  }
};

exports.listAccounts = async (req, res, next) => {
  try{
    const result = await pool.query(
      `SELECT ma.*, s.slug AS store_slug,
              mp.id AS payment_id, mp.status AS payment_status,
              mp.proof_url, mp.notes AS payment_notes, mp.reported_at
       FROM merchant_accounts ma
       LEFT JOIN stores s ON s.id = ma.store_id
       LEFT JOIN LATERAL (
         SELECT * FROM merchant_payments
         WHERE merchant_account_id = ma.id
         ORDER BY reported_at DESC LIMIT 1
       ) mp ON TRUE
       ORDER BY ma.created_at DESC`
    );
    res.json({ success: true, accounts: result.rows.map(row => ({ ...merchantView(row), payment_id: row.payment_id, payment_status: row.payment_status, proof_url: row.proof_url, payment_notes: row.payment_notes, reported_at: row.reported_at })) });
  }catch(error){
    next(error);
  }
};

async function uniqueSlug(client, requested){
  const base = slugify(requested) || "tienda";
  let candidate = base;
  let suffix = 2;
  while((await client.query("SELECT 1 FROM stores WHERE slug = $1", [candidate])).rows.length){
    candidate = `${base.slice(0, 52)}-${suffix++}`;
  }
  return candidate;
}

exports.reviewAccount = async (req, res, next) => {
  const client = await pool.connect();
  try{
    const merchantId = Number(req.params.id);
    const approve = req.body.approve === true;
    await client.query("BEGIN");
    const result = await client.query(
      "SELECT * FROM merchant_accounts WHERE id = $1 FOR UPDATE",
      [merchantId]
    );
    const account = result.rows[0];
    if(!account){
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, error: "Cuenta no encontrada." });
    }

    if(account.status !== "payment_reported"){
      await client.query("ROLLBACK");
      return res.status(409).json({ success: false, error: "La cuenta no tiene un pago reportado pendiente de revisión." });
    }

    if(!approve){
      const reason = clean(req.body.reason, 500) || "Pago no validado";
      await client.query(
        `UPDATE merchant_payments SET status = 'rejected', rejection_reason = $1,
         reviewed_at = NOW(), reviewed_by = $2
         WHERE id = (SELECT id FROM merchant_payments WHERE merchant_account_id = $3 ORDER BY reported_at DESC LIMIT 1)`,
        [reason, req.user.user_id, account.id]
      );
      await client.query(
        "UPDATE merchant_accounts SET status = 'payment_pending', updated_at = NOW() WHERE id = $1",
        [account.id]
      );
      await client.query("COMMIT");
      return res.json({ success: true, status: "payment_pending" });
    }

    let storeId = account.store_id;
    let storeSlug = null;
    if(!storeId){
      storeSlug = await uniqueSlug(client, account.desired_slug);
      const storeResult = await client.query(
        "INSERT INTO stores (name, slug) VALUES ($1,$2) RETURNING id,slug",
        [account.business_name, storeSlug]
      );
      storeId = storeResult.rows[0].id;
    }else{
      const storeResult = await client.query("SELECT slug FROM stores WHERE id = $1", [storeId]);
      storeSlug = storeResult.rows[0]?.slug;
    }

    await client.query(
      `UPDATE merchant_payments SET status = 'approved', reviewed_at = NOW(), reviewed_by = $1
       WHERE id = (SELECT id FROM merchant_payments WHERE merchant_account_id = $2 ORDER BY reported_at DESC LIMIT 1)`,
      [req.user.user_id, account.id]
    );
    await client.query(
      `UPDATE merchant_accounts SET status = 'active', store_id = $1,
       approved_at = NOW(), approved_by = $2, updated_at = NOW()
       WHERE id = $3`,
      [storeId, req.user.user_id, account.id]
    );
    await client.query("COMMIT");
    res.json({ success: true, status: "active", store_id: storeId, store_url: `/tienda/${storeSlug}` });
  }catch(error){
    await client.query("ROLLBACK");
    next(error);
  }finally{
    client.release();
  }
};

exports.setAccountStatus = async (req, res, next) => {
  try{
    const status = clean(req.body.status, 30);
    if(!["active", "suspended"].includes(status)){
      return res.status(400).json({ success: false, error: "Estado inválido." });
    }
    const result = await pool.query(
      "UPDATE merchant_accounts SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id,status",
      [status, Number(req.params.id)]
    );
    if(!result.rows.length){
      return res.status(404).json({ success: false, error: "Cuenta no encontrada." });
    }
    res.json({ success: true, account: result.rows[0] });
  }catch(error){
    next(error);
  }
};
