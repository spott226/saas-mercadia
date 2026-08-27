const pool = require("../db/db");
const pushNotifications =
  require("../services/pushNotifications");

const SALES_PIPELINE_STATUSES = [
  "PAID",
  "PREPARING",
  "SHIPPED",
  "DELIVERED"
];

const ALLOWED_ORDER_STATUSES = [
  "PENDING",
  ...SALES_PIPELINE_STATUSES,
  "CANCELLED"
];

const STATUS_TRANSITIONS = {
  PENDING: new Set(["PAID", "PREPARING", "CANCELLED"]),
  PAID: new Set(["PREPARING", "SHIPPED", "CANCELLED"]),
  PREPARING: new Set(["SHIPPED", "CANCELLED"]),
  SHIPPED: new Set(["DELIVERED", "CANCELLED"]),
  DELIVERED: new Set(),
  CANCELLED: new Set()
};

function isSalesPipelineStatus(status){

  return SALES_PIPELINE_STATUSES.includes(
    String(status || "").toUpperCase()
  );

}

function sanitizeText(
  value,
  maxLength = 255
){

  return String(value || "")
    .trim()
    .slice(0, maxLength);

}

function normalizePhone(value){

  return String(value || "")
    .replace(/\D/g, "")
    .slice(0, 30);

}

function normalizeOrderItems(items){

  if(!Array.isArray(items)){
    return [];
  }

  return items
    .map(item => ({
      variant_id:
        Number(item?.variant_id),
      quantity:
        Number(item?.quantity || 0)
    }))
    .filter(item =>
      Number.isInteger(item.variant_id) &&
      item.variant_id > 0 &&
      Number.isInteger(item.quantity) &&
      item.quantity > 0
    );

}


/* =========================
CREAR PEDIDO
========================= */

exports.createOrder = async (
  req,
  res,
  next
) => {

  const client =
    await pool.connect();

  try {

    const normalizedCustomerName =
      sanitizeText(
        req.body.customer_name,
        120
      );

    const normalizedCustomerPhone =
      sanitizeText(
        req.body.customer_phone,
        30
      );

    const normalizedPhoneDigits =
      normalizePhone(
        normalizedCustomerPhone
      );

    const normalizedCustomerAddress =
      sanitizeText(
        req.body.customer_address,
        255
      );

    const normalizedItems =
      normalizeOrderItems(
        req.body.items
      );

    if(normalizedItems.length === 0){

      return res.status(400).json({
        error: "No hay productos"
      });

    }

    const store_id =
      Number(req.body.store_id);

    if(!Number.isInteger(store_id)){

      return res.status(400).json({
        error: "store_id requerido"
      });

    }

    if(
      !normalizedCustomerName ||
      !normalizedCustomerPhone ||
      !normalizedCustomerAddress
    ){

      return res.status(400).json({
        error:
          "customer_name, customer_phone y customer_address son requeridos"
      });

    }

    if(!normalizedPhoneDigits){

      return res.status(400).json({
        error:
          "customer_phone invalido"
      });

    }

    const storeResult =
      await client.query(
        `
        SELECT id
        FROM stores
        WHERE id = $1
        LIMIT 1
        `,
        [store_id]
      );

    if(storeResult.rows.length === 0){

      return res.status(404).json({
        error:"store not found"
        });

    }

    await client.query("BEGIN");

    const orderResult =
      await client.query(
        `
        INSERT INTO orders
        (
          store_id,
          customer_name,
          customer_phone,
          customer_address,
          status
        )
        VALUES ($1,$2,$3,$4,'PENDING')
        RETURNING *
        `,
        [
          store_id,
          normalizedCustomerName,
          normalizedCustomerPhone,
          normalizedCustomerAddress
        ]
      );

    const order =
      orderResult.rows[0];

    let total = 0;

    const customerResult =
      await client.query(
        `
        SELECT *
        FROM customers
        WHERE
          store_id = $1
          AND regexp_replace(
            COALESCE(phone, ''),
            '\\D',
            '',
            'g'
          ) = $2
        LIMIT 1
        `,
        [
          store_id,
          normalizedPhoneDigits
        ]
      );

    let customer =
      customerResult.rows[0] || null;

    for (const item of normalizedItems) {

      const variantResult =
        await client.query(
          `
          SELECT pv.*, p.name
          FROM product_variants pv
          JOIN products p
          ON p.id = pv.product_id
          WHERE pv.id = $1
          AND p.store_id = $2
          FOR UPDATE OF pv
          `,
          [
            item.variant_id,
            store_id
          ]
        );

      const variant =
        variantResult.rows[0];

      if (!variant) {

        throw new Error(
          "Variante no encontrada"
        );

      }

      const availableStock =
        Number(variant.stock || 0) -
        Number(variant.reserved_stock || 0);

      if(availableStock < item.quantity){
        const error = new Error(
          `Stock insuficiente para ${variant.name}`
        );
        error.status = 409;
        throw error;
      }

      const subtotal =
        Number(variant.price)
        * Number(item.quantity);

      total += subtotal;

      await client.query(
        `
        INSERT INTO order_items
        (
          order_id,
          variant_id,
          product_name,
          variant_name,
          quantity,
          price,
          subtotal
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        `,
        [
          order.id,
          variant.id,
          variant.name,
          `${variant.color} / ${variant.size}`,
          item.quantity,
          variant.price,
          subtotal
        ]
      );

      await client.query(
        `UPDATE product_variants
         SET reserved_stock = COALESCE(reserved_stock, 0) + $1
         WHERE id = $2`,
        [item.quantity, variant.id]
      );

    }

    if (customer) {

      const updatedCustomer = await client.query(
        `
        UPDATE customers
        SET
          total_orders = total_orders + 1,
          total_spent = total_spent + $1,
          address = COALESCE($2,address)
        WHERE id = $3
        RETURNING *
        `,
        [
          total,
          normalizedCustomerAddress,
          customer.id
        ]
      );

      customer = updatedCustomer.rows[0];

    } else {

      const insertedCustomer = await client.query(
        `
        INSERT INTO customers
        (
          store_id,
          name,
          phone,
          address,
          total_orders,
          total_spent
        )
        VALUES
        (
          $1,$2,$3,$4,$5,$6
        )
        RETURNING *
        `,
        [
          store_id,
          normalizedCustomerName,
          normalizedCustomerPhone,
          normalizedCustomerAddress,
          1,
          total
        ]
      );

      customer = insertedCustomer.rows[0];

    }

    await client.query(
      `
      UPDATE customer_accounts
      SET
        customer_id = COALESCE(customer_id, $1),
        name = $2
      WHERE
        store_id = $3
        AND regexp_replace(
          COALESCE(phone, ''),
          '\\D',
          '',
          'g'
        ) = $4
      `,
      [
        customer.id,
        normalizedCustomerName,
        store_id,
        normalizedPhoneDigits
      ]
    );

    await client.query(
      `
      UPDATE orders
      SET
        subtotal = $1,
        total = $1
      WHERE id = $2
      `,
      [total, order.id]
    );

    await client.query("COMMIT");

    pushNotifications.sendOrderStatus({
      storeId: store_id,
      phone: normalizedCustomerPhone,
      orderId: order.id,
      status: "PENDING"
    }).catch(error => {
      console.error("PUSH NEW ORDER ERROR:", error);
    });

    pushNotifications.sendNewOrderToMerchant({
      storeId:store_id,
      orderId:order.id
    }).catch(error => {
      console.error("PUSH MERCHANT ORDER ERROR:",error);
    });

    res.json({

      success: true,

      order_id: order.id,

      status: "PENDING"

    });

  } catch (err) {

    await client.query("ROLLBACK");

    next(err);

  } finally {

    client.release();

  }

};


/* =========================
LISTAR PEDIDOS ERP
========================= */

exports.getOrders = async (
  req,
  res,
  next
) => {

  try {

    const store_id =
      req.user?.store_id;

    if(!store_id){

      return res.status(401).json({
        error:
          "store_id no encontrado en token"
      });

    }

    const result =
      await pool.query(
        `
        SELECT *
        FROM orders
        WHERE store_id = $1
        ORDER BY id DESC
        `,
        [store_id]
      );

    const orders =
      result.rows;

    const orderIds =
      orders.map(o => o.id);

    let allItems = [];

    if(orderIds.length > 0){

      const itemsResult =
        await pool.query(
          `
          SELECT *
          FROM order_items
          WHERE order_id = ANY($1)
          `,
          [orderIds]
        );

      allItems =
        itemsResult.rows || [];

    }

    const itemsByOrder =
      new Map();

    for(const item of allItems){

      const list =
        itemsByOrder.get(
          item.order_id
        ) || [];

      list.push(item);

      itemsByOrder.set(
        item.order_id,
        list
      );

    }

    orders.forEach(order => {

      order.items =
        itemsByOrder.get(
          order.id
        ) || [];

    });

    res.json({

      success: true,

      orders

    });

  } catch (err) {

    next(err);

  }

};


/* =========================
ACTUALIZAR STATUS ERP
========================= */

exports.updateOrderStatus = async (
  req,
  res,
  next
) => {

  const client =
    await pool.connect();

  try {

    const orderId =
      Number(req.params.id);

    const nextStatus =
      String(req.body.status || "")
        .trim()
        .toUpperCase();

    if(!Number.isInteger(orderId)){

      return res.status(400).json({
        error:"Id de pedido inválido"
      });

    }

    if(
      !ALLOWED_ORDER_STATUSES.includes(
        nextStatus
      )
    ){

      return res.status(400).json({
        error: "Status inválido"
      });

    }

    await client.query("BEGIN");

    const orderResult =
      await client.query(
        `
        SELECT *
        FROM orders
        WHERE id = $1
        AND store_id = $2
        `,
        [
          orderId,
          req.user.store_id
        ]
      );

    const order =
      orderResult.rows[0];

    if (!order) {

      throw new Error(
        "Pedido no encontrado"
      );

    }

    const currentStatus =
      String(order.status || "")
        .toUpperCase();

    if (currentStatus === nextStatus) {

      throw new Error(
        `Pedido ya está en estado ${nextStatus}`
      );

    }

    if(!STATUS_TRANSITIONS[currentStatus]?.has(nextStatus)){
      const error = new Error(
        `No se puede cambiar un pedido de ${currentStatus} a ${nextStatus}`
      );
      error.status = 409;
      throw error;
    }

    const itemsResult =
      await client.query(
        `
        SELECT *
        FROM order_items
        WHERE order_id = $1
        `,
        [orderId]
      );

    const items =
      itemsResult.rows;

    if(
      !isSalesPipelineStatus(
        currentStatus
      )
      &&
      isSalesPipelineStatus(
        nextStatus
      )
    ) {

      for (const item of items) {

        const variantResult =
          await client.query(
            `
            SELECT pv.*
            FROM product_variants pv
            JOIN products p ON p.id = pv.product_id
            WHERE pv.id = $1 AND p.store_id = $2
            FOR UPDATE OF pv
            `,
            [item.variant_id, req.user.store_id]
          );

        const variant =
          variantResult.rows[0];

        if (!variant) {

          throw new Error(
            "Variante no encontrada"
          );

        }

        if(Number(variant.reserved_stock || 0) < Number(item.quantity)){

          throw new Error(
            `La reserva de stock del pedido está incompleta para la variante ${variant.id}`
          );

        }

        const previousStock =
          Number(variant.stock);

        const newStock =
          previousStock
          - Number(item.quantity);

        await client.query(
          `
          UPDATE product_variants
          SET stock = $1,
              reserved_stock = GREATEST(COALESCE(reserved_stock,0) - $2, 0)
          WHERE id = $3
          `,
          [
            newStock,
            item.quantity,
            variant.id
          ]
        );

        await client.query(
          `
          INSERT INTO inventory_movements
          (
            variant_id,
            type,
            quantity,
            previous_stock,
            new_stock,
            reference_type,
            reference_id,
            notes
          )
          VALUES
          (
            $1,'SALE',$2,$3,$4,'ORDER',$5,$6
          )
          `,
          [
            variant.id,
            item.quantity,
            previousStock,
            newStock,
            order.id,
            `Venta pedido #${order.id}`
          ]
        );

      }

    }

    if(
      currentStatus === "PENDING" &&
      nextStatus === "CANCELLED"
    ){
      for(const item of items){
        const variantResult = await client.query(
          `SELECT pv.*
           FROM product_variants pv
           JOIN products p ON p.id = pv.product_id
           WHERE pv.id = $1 AND p.store_id = $2
           FOR UPDATE OF pv`,
          [item.variant_id, req.user.store_id]
        );
        const variant = variantResult.rows[0];
        if(!variant){
          throw new Error("Variante no encontrada");
        }
        const releaseQuantity = Math.min(
          Number(variant.reserved_stock || 0),
          Number(item.quantity)
        );
        await client.query(
          `UPDATE product_variants
           SET reserved_stock = GREATEST(COALESCE(reserved_stock,0) - $1, 0)
           WHERE id = $2`,
          [releaseQuantity, variant.id]
        );
      }
    }

    if (
      isSalesPipelineStatus(
        currentStatus
      )
      &&
      nextStatus === "CANCELLED"
    ) {

      for (const item of items) {

        const variantResult =
          await client.query(
            `
            SELECT pv.*
            FROM product_variants pv
            JOIN products p ON p.id = pv.product_id
            WHERE pv.id = $1 AND p.store_id = $2
            FOR UPDATE OF pv
            `,
            [item.variant_id, req.user.store_id]
          );

        const variant =
          variantResult.rows[0];

        if (!variant) {

          throw new Error(
            "Variante no encontrada"
          );

        }

        const previousStock =
          Number(variant.stock);

        const newStock =
          previousStock
          + Number(item.quantity);

        await client.query(
          `
          UPDATE product_variants
          SET stock = $1
          WHERE id = $2
          `,
          [
            newStock,
            variant.id
          ]
        );

        await client.query(
          `
          INSERT INTO inventory_movements
          (
            variant_id,
            type,
            quantity,
            previous_stock,
            new_stock,
            reference_type,
            reference_id,
            notes
          )
          VALUES
          (
            $1,'CANCELLED_ORDER',$2,$3,$4,'ORDER',$5,$6
          )
          `,
          [
            variant.id,
            item.quantity,
            previousStock,
            newStock,
            order.id,
            `Cancelación pedido #${order.id}`
          ]
        );

      }

    }

    await client.query(
      `
      UPDATE orders
      SET status = $1
      WHERE id = $2
      `,
      [
        nextStatus,
        order.id
      ]
    );

    await client.query("COMMIT");

    pushNotifications.sendOrderStatus({
      storeId: req.user.store_id,
      phone: order.customer_phone,
      orderId: order.id,
      status: nextStatus
    }).catch(error => {
      console.error("PUSH ORDER STATUS ERROR:", error);
    });

    res.json({

      success: true,

      message:
        `Pedido actualizado a ${nextStatus}`

    });

  } catch (err) {

    await client.query("ROLLBACK");

    next(err);

  } finally {

    client.release();

  }

};


/* =========================
CANCELAR PEDIDO
========================= */

exports.cancelOrder = async (
  req,
  res,
  next
) => {

  req.body.status =
    "CANCELLED";

  return exports.updateOrderStatus(
    req,
    res,
    next
  );

};
