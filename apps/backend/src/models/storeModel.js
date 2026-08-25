const db = require("../db/db");

exports.getStoreBySlug = async (slug) => {

  const result = await db.query(
    "SELECT * FROM stores WHERE slug = $1",
    [slug]
  );

  return result.rows[0];

};

exports.getStoreById = async (store_id) => {

  const result = await db.query(
    "SELECT * FROM stores WHERE id = $1",
    [store_id]
  );

  return result.rows[0];

};

exports.getProductLimit = async (store_id) => {

  const result = await db.query(
    "SELECT product_limit FROM stores WHERE id = $1",
    [store_id]
  );

  return result.rows[0].product_limit;

};

exports.updateStoreLogo = async (
  store_id,
  logo
) => {

  const result = await db.query(
    `
    UPDATE stores
    SET logo = $1
    WHERE id = $2
    RETURNING *
    `,
    [
      logo,
      store_id
    ]
  );

  return result.rows[0];

};

exports.updateStoreHero = async (
  store_id,
  hero
) => {

  const result = await db.query(
    `
    UPDATE stores
    SET hero = $1
    WHERE id = $2
    RETURNING *
    `,
    [
      hero,
      store_id
    ]
  );

  return result.rows[0];

};

exports.updateStoreSettings = async (
  store_id,
  data
) => {

  const result = await db.query(
    `
    UPDATE stores
    SET
      business_type = COALESCE($1,business_type),
      template_key = COALESCE($2,template_key),
      homepage_sections = COALESCE($3::jsonb,homepage_sections)
    WHERE id = $4
    RETURNING *
    `,
    [
      data.business_type,
      data.template_key,
      data.homepage_sections
        ? JSON.stringify(data.homepage_sections)
        : null,
      store_id
    ]
  );

  return result.rows[0];

};
