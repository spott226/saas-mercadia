const jwt = require("jsonwebtoken");
const { JWT_SECRET } =
  require("../config/auth");
const db = require("../db/db");
const supabaseAuth =
  require("../services/supabaseAuth");

function getBearerToken(req, res){
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ error: "token required" });
    return null;
  }

  const parts = authHeader.split(" ");

  if (parts.length !== 2 || parts[0] !== "Bearer") {
    res.status(401).json({ error: "invalid token format" });
    return null;
  }

  return parts[1];
}

function getTokenPayload(req, res){
  const token = getBearerToken(req, res);
  if(!token) return null;

  try {
    return jwt.verify(
      token,
      JWT_SECRET
    );
  } catch (err) {
    res.status(401).json({ error: "invalid token" });
    return null;
  }
}

function authenticate(req, res, next) {
  const decoded =
    getTokenPayload(req, res);

  if(!decoded){
    return;
  }

  req.user = decoded;
  next();
}

function requireAdmin(req, res, next){
  const decoded =
    getTokenPayload(req, res);

  if(!decoded){
    return;
  }

  if(
    decoded.role &&
    decoded.role !== "admin"
  ){
    return res.status(403).json({
      error: "admin access required"
    });
  }

  req.user = decoded;
  next();
}

async function requireCustomer(req, res, next){
  if(!supabaseAuth.isConfigured()){
    const decoded = getTokenPayload(req, res);

    if(!decoded) return;

    if(decoded.role !== "customer"){
      return res.status(403).json({
        error: "customer access required"
      });
    }

    req.user = decoded;
    return next();
  }

  const token = getBearerToken(req, res);
  if(!token) return;

  const storeId = Number(
    req.headers["x-store-id"] ||
    req.query.store_id
  );

  if(!Number.isInteger(storeId)){
    return res.status(400).json({
      error: "store id required"
    });
  }

  try{
    const authUser = await supabaseAuth.getUser(token);
    const result = await db.query(
      `
      SELECT id, store_id, phone
      FROM customer_accounts
      WHERE store_id = $1
        AND supabase_user_id = $2
        AND is_active = TRUE
      LIMIT 1
      `,
      [storeId, authUser.id]
    );
    const account = result.rows[0];

    if(!account){
      return res.status(403).json({
        error: "customer access required"
      });
    }

    req.accessToken = token;
    req.authUser = authUser;
    req.user = {
      role: "customer",
      customer_account_id: account.id,
      store_id: account.store_id,
      phone: account.phone
    };
    next();
  }catch(error){
    return res.status(401).json({
      error: "invalid or expired token"
    });
  }
}

module.exports = authenticate;
module.exports.requireAdmin = requireAdmin;
module.exports.requireCustomer = requireCustomer;
