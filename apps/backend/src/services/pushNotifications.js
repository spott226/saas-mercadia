const webpush = require("web-push");
const db = require("../db/db");

const publicKey = process.env.VAPID_PUBLIC_KEY || "";
const privateKey = process.env.VAPID_PRIVATE_KEY || "";
const subject = process.env.VAPID_SUBJECT || "mailto:soporte@mercadia.app";

const configured = Boolean(publicKey && privateKey);

if(configured){
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

function getPublicKey(){
  return configured ? publicKey : null;
}

function ensureConfigured(){
  if(configured) return;
  const error = new Error("notificaciones no configuradas");
  error.status = 503;
  throw error;
}

async function saveSubscription(storeId, accountId, subscription){
  const endpoint = String(subscription?.endpoint || "");
  const p256dh = String(subscription?.keys?.p256dh || "");
  const auth = String(subscription?.keys?.auth || "");

  if(!endpoint || !p256dh || !auth){
    const error = new Error("suscripcion push invalida");
    error.status = 400;
    throw error;
  }

  await db.query(
    `INSERT INTO push_subscriptions
       (store_id, customer_account_id, endpoint, p256dh, auth, updated_at)
     VALUES ($1,$2,$3,$4,$5,NOW())
     ON CONFLICT (endpoint)
     DO UPDATE SET
       store_id = EXCLUDED.store_id,
       customer_account_id = EXCLUDED.customer_account_id,
       p256dh = EXCLUDED.p256dh,
       auth = EXCLUDED.auth,
       updated_at = NOW()`,
    [storeId, accountId, endpoint, p256dh, auth]
  );
}

async function removeSubscription(endpoint, accountId){
  await db.query(
    `DELETE FROM push_subscriptions
     WHERE endpoint = $1 AND customer_account_id = $2`,
    [String(endpoint || ""), accountId]
  );
}

async function saveMerchantSubscription(storeId, merchantId, subscription, adminUserId = null){
  const endpoint = String(subscription?.endpoint || "");
  const p256dh = String(subscription?.keys?.p256dh || "");
  const auth = String(subscription?.keys?.auth || "");

  if(!endpoint || !p256dh || !auth){
    const error = new Error("suscripcion push invalida");
    error.status = 400;
    throw error;
  }

  await db.query(
    `INSERT INTO merchant_push_subscriptions
       (store_id, merchant_account_id, admin_user_id, endpoint, p256dh, auth, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,NOW())
     ON CONFLICT (endpoint)
     DO UPDATE SET
       store_id = EXCLUDED.store_id,
       merchant_account_id = EXCLUDED.merchant_account_id,
       admin_user_id = EXCLUDED.admin_user_id,
       p256dh = EXCLUDED.p256dh,
       auth = EXCLUDED.auth,
       updated_at = NOW()`,
    [storeId, merchantId || null, adminUserId || null, endpoint, p256dh, auth]
  );
}

async function deliver(rows,payload,tableName){
  const stats = { sent:0, removed:0, failed:0 };

  await Promise.allSettled(
    rows.map(async row => {
      try{
        await webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: { p256dh: row.p256dh, auth: row.auth }
          },
          payload
        );
        stats.sent += 1;
      }catch(error){
        if(error.statusCode === 404 || error.statusCode === 410){
          await db.query(`DELETE FROM ${tableName} WHERE id = $1`,[row.id]);
          stats.removed += 1;
          return;
        }
        stats.failed += 1;
        console.error("PUSH ERROR:",error.message);
      }
    })
  );

  return stats;
}

async function getMerchantSubscriptions(storeId, endpoint = null){
  const params = [storeId];
  let endpointFilter = "";
  if(endpoint){
    params.push(String(endpoint));
    endpointFilter = " AND mps.endpoint = $2";
  }

  const result = await db.query(
    `SELECT mps.id,mps.endpoint,mps.p256dh,mps.auth,s.name AS store_name
     FROM merchant_push_subscriptions mps
     JOIN stores s ON s.id = mps.store_id
     WHERE mps.store_id = $1${endpointFilter}`,
    params
  );
  return result.rows;
}

async function sendMerchantPayload(storeId,payload,endpoint = null){
  ensureConfigured();
  const rows = await getMerchantSubscriptions(storeId,endpoint);
  if(!rows.length){
    const error = new Error("No hay dispositivos del negocio suscritos para recibir alertas.");
    error.status = 409;
    throw error;
  }
  return deliver(rows,JSON.stringify(payload),"merchant_push_subscriptions");
}

async function sendMerchantTest(storeId,endpoint = null){
  return sendMerchantPayload(storeId,{
    title:"Mercadia",
    body:"Este dispositivo recibirá los pedidos nuevos de tu tienda.",
    url:"/admin/orders.html",
    tag:"merchant-push-test"
  },endpoint);
}

async function sendNewOrderToMerchant({ storeId, orderId, customerName }){
  if(!configured) return { sent:0, removed:0, failed:0, skipped:"not_configured" };

  const rows = await getMerchantSubscriptions(storeId);
  if(!rows.length){
    console.warn("PUSH MERCHANT ORDER SKIPPED: no subscriptions",{ storeId, orderId });
    return { sent:0, removed:0, failed:0, skipped:"no_subscriptions" };
  }

  const cleanCustomerName = String(customerName || "").trim();
  const payload = JSON.stringify({
    title:rows[0]?.store_name || "Mercadia",
    body:cleanCustomerName
      ? `Nuevo pedido de ${cleanCustomerName} (#${orderId}).`
      : `Tienes un nuevo pedido #${orderId}.`,
    url:"/admin/orders.html",
    tag:`merchant-order-${orderId}`
  });

  return deliver(rows,payload,"merchant_push_subscriptions");
}

const statusLabels = {
  PENDING: "recibido",
  PAID: "confirmado",
  PREPARING: "en preparacion",
  SHIPPED: "en camino",
  DELIVERED: "entregado",
  CANCELLED: "cancelado"
};

async function sendOrderStatus({ storeId, phone, orderId, status }){
  if(!configured || !phone) return { sent:0, removed:0, failed:0, skipped:"not_configured" };

  const result = await db.query(
    `SELECT ps.id, ps.endpoint, ps.p256dh, ps.auth, s.name AS store_name
     FROM push_subscriptions ps
     JOIN customer_accounts ca ON ca.id = ps.customer_account_id
     JOIN stores s ON s.id = ps.store_id
     WHERE ps.store_id = $1
       AND regexp_replace(COALESCE(ca.phone, ''), '\\D', '', 'g') =
           regexp_replace($2, '\\D', '', 'g')`,
    [storeId, phone]
  );

  const label = statusLabels[String(status || "").toUpperCase()] || status;
  const payload = JSON.stringify({
    title: result.rows[0]?.store_name || "Mercadia",
    body: `Tu pedido #${orderId} esta ${label}.`,
    url: "/mi-cuenta.html",
    tag: `order-${orderId}`
  });

  return deliver(result.rows,payload,"push_subscriptions");
}

module.exports = {
  getPublicKey,
  saveSubscription,
  saveMerchantSubscription,
  removeSubscription,
  sendOrderStatus,
  sendNewOrderToMerchant,
  sendMerchantTest
};
