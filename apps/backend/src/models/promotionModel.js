const db = require("../db/db");
const validation = require('../services/commerceValidation');
const fields = ['internal_name','title','description','discount_text','button_text','button_url','image_url','is_active','starts_at','ends_at','type','priority'];
exports.getPromotionsByStore = async storeId => (await db.query('SELECT * FROM store_promotions WHERE store_id = $1 ORDER BY priority DESC, id DESC',[storeId])).rows;
exports.getActivePromotionsByStore = async storeId => (await db.query(`SELECT * FROM store_promotions WHERE store_id = $1 AND is_active = true AND (starts_at IS NULL OR starts_at <= NOW()) AND (ends_at IS NULL OR ends_at >= NOW()) ORDER BY priority DESC, id DESC`,[storeId])).rows;
exports.getActivePromotionByStore = async storeId => (await exports.getActivePromotionsByStore(storeId)).find(p => p.type === 'popup') || null;
exports.createPromotion = async (storeId, data) => {
  const keys = fields.filter(key => data[key] !== undefined);
  return (await db.query(`INSERT INTO store_promotions (store_id, ${keys.join(',')}) VALUES ($1, ${keys.map((_,i) => '$' + (i+2)).join(',')}) RETURNING *`,[storeId,...keys.map(key => data[key])])).rows[0];
};
exports.updatePromotion = async (id, storeId, data) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const current = (await client.query('SELECT * FROM store_promotions WHERE id = $1 AND store_id = $2 FOR UPDATE',[id,storeId])).rows[0];
    if(!current){ await client.query('ROLLBACK'); return null; }
    validation.promotion({starts_at: data.starts_at === undefined ? (current.starts_at ? new Date(current.starts_at).toISOString() : null) : data.starts_at, ends_at: data.ends_at === undefined ? (current.ends_at ? new Date(current.ends_at).toISOString() : null) : data.ends_at});
    const keys = fields.filter(key => data[key] !== undefined);
    if(!keys.length){ await client.query('COMMIT'); return current; }
    const result = await client.query(`UPDATE store_promotions SET ${keys.map((key,i) => key + ' = $' + (i+1)).join(',')}, updated_at = NOW() WHERE id = $${keys.length+1} AND store_id = $${keys.length+2} RETURNING *`,[...keys.map(key => data[key]),id,storeId]);
    await client.query('COMMIT');
    return result.rows[0];
  } catch(error){ await client.query('ROLLBACK'); throw error; } finally { client.release(); }
};
exports.deletePromotion = async (id,storeId) => (await db.query('DELETE FROM store_promotions WHERE id = $1 AND store_id = $2 RETURNING id',[id,storeId])).rows[0] || null;
