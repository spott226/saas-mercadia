const db = require("../db/db");

exports.getPromotionsByStore = async (
  store_id
) => {

  const result = await db.query(
    `
    SELECT *
    FROM store_promotions
    WHERE store_id = $1
    ORDER BY id DESC
    `,
    [store_id]
  );

  return result.rows;

};

exports.getActivePromotionByStore = async (
  store_id
) => {

  const result = await db.query(
    `
    SELECT *
    FROM store_promotions
    WHERE store_id = $1
    AND is_active = true
    AND (
      starts_at IS NULL
      OR starts_at <= NOW()
    )
    AND (
      ends_at IS NULL
      OR ends_at >= NOW()
    )
    ORDER BY id DESC
    LIMIT 1
    `,
    [store_id]
  );

  return result.rows[0] || null;

};

exports.createPromotion = async (
  store_id,
  data
) => {

  const result = await db.query(
    `
    INSERT INTO store_promotions
    (
      store_id,
      title,
      description,
      discount_text,
      button_text,
      button_url,
      image_url,
      is_active,
      starts_at,
      ends_at
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    RETURNING *
    `,
    [
      store_id,
      data.title,
      data.description,
      data.discount_text,
      data.button_text,
      data.button_url,
      data.image_url,
      data.is_active ?? true,
      data.starts_at,
      data.ends_at
    ]
  );

  return result.rows[0];

};

exports.updatePromotion = async (
  id,
  store_id,
  data
) => {

  const result = await db.query(
    `
    UPDATE store_promotions
    SET
      title = COALESCE($1,title),
      description = COALESCE($2,description),
      discount_text = COALESCE($3,discount_text),
      button_text = COALESCE($4,button_text),
      button_url = COALESCE($5,button_url),
      image_url = COALESCE($6,image_url),
      is_active = COALESCE($7,is_active),
      starts_at = COALESCE($8,starts_at),
      ends_at = COALESCE($9,ends_at),
      updated_at = NOW()
    WHERE id = $10
    AND store_id = $11
    RETURNING *
    `,
    [
      data.title,
      data.description,
      data.discount_text,
      data.button_text,
      data.button_url,
      data.image_url,
      data.is_active,
      data.starts_at,
      data.ends_at,
      id,
      store_id
    ]
  );

  return result.rows[0] || null;

};

exports.deletePromotion = async (
  id,
  store_id
) => {

  const result = await db.query(
    `
    DELETE FROM store_promotions
    WHERE id = $1
    AND store_id = $2
    RETURNING id
    `,
    [
      id,
      store_id
    ]
  );

  return result.rows[0] || null;

};
