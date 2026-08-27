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

async function saveMerchantSubscription(storeId, merchantId, subscription){
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
       (store_id, merchant_account_id, endpoint, p256dh, auth, updated_at)
     VALUES ($1,$2,$3,$4,$5,NOW())
     ON CONFLICT (endpoint)
     DO UPDATE SET
       store_id = EXCLUDED.store_id,
       merchant_account_id = EXCLUDED.merchant_account_id,
       p256dh = EXCLUDED.p256dh,
       auth = EXCLUDED.auth,
       updated_at = NOW()`,
    [storeId, merchantId, endpoint, p256dh, auth]
  );
}

async function deliver(rows,payload,tableName){
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
      }catch(error){
        if(error.statusCode === 404 || error.statusCode === 410){
          await db.query(`DELETE FROM ${tableName} WHERE id = $1`,[row.id]);
          return;
        }
        console.error("PUSH ERROR:",error.message);
      }
    })
  );
}

async function sendNewOrderToMerchant({ storeId, orderId }){
  if(!configured) return;

  const result = await db.query(
    `SELECT mps.id,mps.endpoint,mps.p256dh,mps.auth,s.name AS store_name
     FROM merchant_push_subscriptions mps
     JOIN stores s ON s.id = mps.store_id
     WHERE mps.store_id = $1`,
    [storeId]
  );

  const payload = JSON.stringify({
    title:result.rows[0]?.store_name || "Mercadia",
    body:`Tienes un nuevo pedido #${orderId}.`,
    url:"/admin/orders.html",
    tag:`merchant-order-${orderId}`
  });

  await deliver(result.rows,payload,"merchant_push_subscriptions");
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
  if(!configured || !phone) return;

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

  await Promise.allSettled(
    result.rows.map(async row => {
      try{
        await webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: {
              p256dh: row.p256dh,
              auth: row.auth
            }
          },
          payload
        );
      }catch(error){
        if(error.statusCode === 404 || error.statusCode === 410){
          await db.query(
            "DELETE FROM push_subscriptions WHERE id = $1",
            [row.id]
          );
          return;
        }
        console.error("PUSH ERROR:", error.message);
      }
    })
  );
}

module.exports = {
  getPublicKey,
  saveSubscription,
  saveMerchantSubscription,
  removeSubscription,
  sendOrderStatus,
  sendNewOrderToMerchant
};
