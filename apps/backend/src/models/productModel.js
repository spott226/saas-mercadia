const db = require("../db/db");

/* =========================
   OBTENER PRODUCTOS ERP
   PAGINACIÓN + BÚSQUEDA + FILTRO
========================= */
exports.getProductsByStore = async (
  store_id,
  options = {}
) => {

  try {

    const page =
      parseInt(options.page) || 1;

    const limit =
      parseInt(options.limit) || 10;

    const offset =
      (page - 1) * limit;

    const search =
      options.search || "";

    const category =
      options.category || "";

    let where = `
      WHERE store_id = $1
    `;

    let values = [store_id];

    let index = 2;


    /* =========================
       BÚSQUEDA POR NOMBRE
    ========================= */

    if (search) {

      where += `
        AND LOWER(name)
        LIKE LOWER($${index})
      `;

      values.push(`%${search}%`);

      index++;

    }


    /* =========================
       FILTRO CATEGORÍA
    ========================= */

    if (category) {

      where += `
        AND LOWER(category)
        = LOWER($${index})
      `;

      values.push(category);

      index++;

    }


    /* =========================
       TOTAL PRODUCTOS
    ========================= */

    const totalQuery = await db.query(
      `
      SELECT COUNT(*) AS total
      FROM products
      ${where}
      `,
      values
    );

    const total =
      parseInt(
        totalQuery.rows[0].total
      );


    /* =========================
       PRODUCTOS PAGINADOS
    ========================= */

    const paginatedValues =
      [...values];

    paginatedValues.push(limit);

    paginatedValues.push(offset);

    const result = await db.query(
      `
      SELECT *
      FROM products
      ${where}
      ORDER BY id DESC
      LIMIT $${index}
      OFFSET $${index + 1}
      `,
      paginatedValues
    );

    return {

      products: result.rows,

      pagination: {

        total,

        page,

        limit,

        totalPages:
          Math.ceil(total / limit),

        hasNext:
          page < Math.ceil(total / limit),

        hasPrev:
          page > 1

      }

    };

  } catch (error) {

    console.error(
      "Error getting products:",
      error
    );

    throw error;

  }

};


/* =========================
   OBTENER CATEGORÍAS ÚNICAS
========================= */
exports.getCategoriesByStore = async (
  store_id
) => {

  try {

    const result = await db.query(
      `
      SELECT DISTINCT category
      FROM products
      WHERE store_id = $1
      AND category IS NOT NULL
      AND category != ''
      ORDER BY category ASC
      `,
      [store_id]
    );

    return result.rows;

  } catch (error) {

    console.error(
      "Error getting categories:",
      error
    );

    throw error;

  }

};


/* =========================
   OBTENER PRODUCTOS DESTACADOS
========================= */
exports.getFeaturedProducts = async (
  store_id
) => {

  try {

    const result = await db.query(
      `
      SELECT *
      FROM products
      WHERE store_id = $1
      AND featured = true
      ORDER BY id DESC
      LIMIT 4
      `,
      [store_id]
    );

    return result.rows;

  } catch (error) {

    console.error(
      "Error getting featured products:",
      error
    );

    throw error;

  }

};


/* =========================
   CREAR PRODUCTO
========================= */
exports.createProduct = async (
  data
) => {

  try {

    const {
      name,
      description,
      price,
      image,
      category,
      store_id,
      featured
    } = data;

    const result = await db.query(
      `
      INSERT INTO products
      (
        name,
        description,
        price,
        image,
        category,
        store_id,
        featured
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *
      `,
      [
        name,
        description,
        price,
        image,
        category,
        store_id,
        featured || false
      ]
    );

    return result.rows[0];

  } catch (error) {

    console.error(
      "Error creating product:",
      error
    );

    throw error;

  }

};


/* =========================
   ACTUALIZAR PRODUCTO
========================= */
exports.updateProduct = async (
  id,
  store_id,
  data
) => {

  try {

    const {
      name,
      description,
      price,
      image,
      category,
      featured
    } = data;

    const result = await db.query(
      `
      UPDATE products
      SET
        name=$1,
        description=$2,
        price=$3,
        image=COALESCE($4,image),
        category=$5,
        featured=COALESCE($6,featured)
      WHERE id=$7
      AND store_id=$8
      RETURNING *
      `,
      [
        name,
        description,
        price,
        image,
        category,
        featured,
        id,
        store_id
      ]
    );

    return result.rows[0];

  } catch (error) {

    console.error(
      "Error updating product:",
      error
    );

    throw error;

  }

};


/* =========================
   ELIMINAR PRODUCTO ERP
========================= */
exports.deleteProduct = async (
  id,
  store_id
) => {

  const client =
    await db.connect();

  try {

    await client.query(
      "BEGIN"
    );


    /* =========================
       VALIDAR PRODUCTO
    ========================= */

    const exists =
      await client.query(
        `
        SELECT id

        FROM products

        WHERE
        id = $1
        AND store_id = $2
        `,
        [
          id,
          store_id
        ]
      );

    if(
      exists.rows.length === 0
    ){

      await client.query(
        "ROLLBACK"
      );

      return false;

    }


    /* =========================
       INVENTORY MOVEMENTS
    ========================= */

    await client.query(
      `
      DELETE FROM inventory_movements

      WHERE variant_id IN (

        SELECT id

        FROM product_variants

        WHERE product_id = $1

      )
      `,
      [id]
    );


    /* =========================
       ORDER ITEMS
    ========================= */

    await client.query(
      `
      DELETE FROM order_items

      WHERE variant_id IN (

        SELECT id

        FROM product_variants

        WHERE product_id = $1

      )
      `,
      [id]
    );


    /* =========================
       PRODUCT IMAGES
    ========================= */

    await client.query(
      `
      DELETE FROM product_images

      WHERE product_id = $1
      `,
      [id]
    );


    /* =========================
       PRODUCT VARIANTS
    ========================= */

    await client.query(
      `
      DELETE FROM product_variants

      WHERE product_id = $1
      `,
      [id]
    );


    /* =========================
       PRODUCT
    ========================= */

    await client.query(
      `
      DELETE FROM products

      WHERE
      id = $1
      AND store_id = $2
      `,
      [
        id,
        store_id
      ]
    );

    await client.query(
      "COMMIT"
    );

    return true;

  } catch (error) {

    await client.query(
      "ROLLBACK"
    );

    console.error(
      "Error deleting product:",
      error
    );

    throw error;

  } finally {

    client.release();

  }

};


/* =========================
   CONTAR PRODUCTOS POR TIENDA
========================= */
exports.countProductsByStore = async (
  store_id
) => {

  try {

    const result = await db.query(
      `
      SELECT COUNT(*)
      FROM products
      WHERE store_id = $1
      `,
      [store_id]
    );

    return parseInt(
      result.rows[0].count
    );

  } catch (error) {

    console.error(
      "Error counting products:",
      error
    );

    throw error;

  }

};


/* =========================
   CREAR IMAGEN POR COLOR
========================= */
exports.createProductImage = async (
  data
) => {

  const {
    product_id,
    color,
    image_url
  } = data;

  const result = await db.query(
    `
    INSERT INTO product_images
    (
      product_id,
      color,
      image_url
    )
    VALUES ($1,$2,$3)
    RETURNING *
    `,
    [
      product_id,
      color,
      image_url
    ]
  );

  return result.rows[0];

};


/* =========================
   ELIMINAR IMÁGENES
========================= */
exports.deleteImagesByProduct = async (
  product_id
) => {

  await db.query(
    `
    DELETE FROM product_images
    WHERE product_id = $1
    `,
    [product_id]
  );

};


/* =========================
   CREAR VARIANTE ERP
========================= */
exports.createVariant = async (
  data
) => {

  const {
    product_id,
    color,
    size,
    price,
    stock,
    sku,
    cost
  } = data;

  const result = await db.query(
    `
    INSERT INTO product_variants
    (
      product_id,
      color,
      size,
      price,
      stock,
      reserved_stock,
      sku,
      cost
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    RETURNING *
    `,
    [
      product_id,
      color,
      size,
      price,
      stock || 0,
      0,
      sku || null,
      cost || 0
    ]
  );

  return result.rows[0];

};


/* =========================
   OBTENER VARIANTES
========================= */
exports.getVariantsByProduct = async (
  product_id
) => {

  const result = await db.query(
    `
    SELECT *
    FROM product_variants
    WHERE product_id = $1
    `,
    [product_id]
  );

  return result.rows;

};


/* =========================
   OBTENER VARIANTES MASIVO
========================= */
exports.getVariantsByProducts = async (
  productIds
) => {

  try {

    if(
      !productIds ||
      productIds.length === 0
    ){

      return [];

    }

    const result = await db.query(
      `
      SELECT *
      FROM product_variants
      WHERE product_id = ANY($1)
      `,
      [productIds]
    );

    return result.rows;

  } catch (error) {

    console.error(
      "Error getting variants bulk:",
      error
    );

    throw error;

  }

};


/* =========================
   OBTENER IMÁGENES
========================= */
exports.getImagesByProduct = async (
  product_id
) => {

  const result = await db.query(
    `
    SELECT *
    FROM product_images
    WHERE product_id = $1
    `,
    [product_id]
  );

  return result.rows;

};


/* =========================
   OBTENER IMÁGENES MASIVO
========================= */
exports.getImagesByProducts = async (
  productIds
) => {

  try {

    if(
      !productIds ||
      productIds.length === 0
    ){

      return [];

    }

    const result = await db.query(
      `
      SELECT *
      FROM product_images
      WHERE product_id = ANY($1)
      `,
      [productIds]
    );

    return result.rows;

  } catch (error) {

    console.error(
      "Error getting images bulk:",
      error
    );

    throw error;

  }

};


/* =========================
   ELIMINAR VARIANTES
========================= */
exports.deleteVariantsByProduct = async (
  product_id
) => {

  await db.query(
    `
    DELETE FROM product_variants
    WHERE product_id = $1
    `,
    [product_id]
  );

};