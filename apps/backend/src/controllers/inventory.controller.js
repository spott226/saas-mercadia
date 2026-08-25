const pool = require("../db/db");


/* =========================
GET INVENTARIO ERP
========================= */

exports.getInventory = async (
  req,
  res,
  next
) => {

  try {

    /* =========================
    MULTI STORE ERP
    ========================= */

    const store_id =
      req.user.store_id;


    const result =
      await pool.query(
        `
        SELECT

          pv.id,

          pv.product_id,

          pv.color,

          pv.size,

          pv.price,

          pv.stock,

          pv.reserved_stock,

          pv.sku,

          pv.cost,

          pv.created_at,

          p.name AS product_name,

          p.category,

          p.image,

          (
            pv.stock * pv.cost
          ) AS inventory_value

        FROM product_variants pv

        JOIN products p
        ON p.id = pv.product_id

        WHERE p.store_id = $1

        ORDER BY pv.id DESC
        `,
        [store_id]
      );

    const inventory =
      result.rows;


    /* =========================
    KPIS ERP
    ========================= */

    const totalVariants =
      inventory.length;

    const lowStock =
      inventory.filter(
        item =>
          Number(item.stock) <= 5
      ).length;

    const totalInventoryValue =
      inventory.reduce(
        (acc,item)=>
          acc +
          Number(
            item.inventory_value || 0
          ),
        0
      );

    const totalStock =
      inventory.reduce(
        (acc,item)=>
          acc +
          Number(item.stock || 0),
        0
      );


    res.json({

      success: true,

      kpis: {

        totalVariants,

        lowStock,

        totalInventoryValue,

        totalStock

      },

      inventory

    });

  } catch (err) {

    next(err);

  }

};


/* =========================
GET MOVIMIENTOS ERP
========================= */

exports.getInventoryMovements = async (
  req,
  res,
  next
) => {

  try {

    /* =========================
    MULTI STORE ERP
    ========================= */

    const store_id =
      req.user.store_id;


    const result =
      await pool.query(
        `
        SELECT

          im.id,

          im.variant_id,

          im.type,

          im.quantity,

          im.previous_stock,

          im.new_stock,

          im.reference_type,

          im.reference_id,

          im.notes,

          im.created_at,

          pv.color,

          pv.size,

          pv.sku,

          p.name AS product_name,

          p.category

        FROM inventory_movements im

        JOIN product_variants pv
        ON pv.id = im.variant_id

        JOIN products p
        ON p.id = pv.product_id

        WHERE p.store_id = $1

        ORDER BY im.id DESC
        `,
        [store_id]
      );

    const movements =
      result.rows;


    /* =========================
    KPIS MOVIMIENTOS
    ========================= */

    const totalMovements =
      movements.length;

    const sales =
      movements.filter(
        m => m.type === "SALE"
      ).length;

    const cancelled =
      movements.filter(
        m =>
          m.type === "CANCELLED_ORDER"
      ).length;

    const adjustments =
      movements.filter(
        m =>
          m.type === "MANUAL_ADJUSTMENT"
          ||
          m.type === "ADJUSTMENT"
      ).length;


    res.json({

      success: true,

      kpis: {

        totalMovements,

        sales,

        cancelled,

        adjustments

      },

      movements

    });

  } catch (err) {

    next(err);

  }

};