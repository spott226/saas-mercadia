const pool = require("../db/db");


/* =========================
GET CUSTOMERS ERP
========================= */

exports.getCustomers = async (
  req,
  res,
  next
) => {

  try {

    /* =========================
    VALIDAR AUTH
    ========================= */

    if(
      !req.user ||
      !req.user.store_id
    ){

      return res.status(401).json({

        success: false,

        error:
          "store_id no disponible en token"

      });

    }


    /* =========================
    STORE ID
    ========================= */

    const store_id =
      req.user.store_id;

    /* =========================
    GET CUSTOMERS
    ========================= */

    const result =
      await pool.query(
        `
        SELECT *

        FROM customers

        WHERE store_id = $1

        ORDER BY
          total_spent DESC,
          total_orders DESC,
          id DESC
        `,
        [store_id]
      );

    const customers =
      result.rows;


    /* =========================
    HISTORIAL PEDIDOS
    ========================= */

    const customerPhones =
      [
        ...new Set(
          customers
            .map(customer => customer.phone)
            .filter(Boolean)
        )
      ];

    let orders = [];

    if(customerPhones.length > 0){

      const ordersResult =
        await pool.query(
          `
          SELECT *

          FROM orders

          WHERE
            store_id = $1
            AND customer_phone = ANY($2)

          ORDER BY id DESC
          `,
          [
            store_id,
            customerPhones
          ]
        );

      orders =
        ordersResult.rows;

    }

    const ordersByPhone =
      new Map();

    for(const order of orders){

      const list =
        ordersByPhone.get(
          order.customer_phone
        ) || [];

      list.push(order);

      ordersByPhone.set(
        order.customer_phone,
        list
      );

    }

    for(const customer of customers){

      customer.orders =
        ordersByPhone.get(
          customer.phone
        ) || [];

    }


    /* =========================
    KPIS
    ========================= */

    const totalCustomers =
      customers.length;

    const totalRevenue =
      customers.reduce(
        (acc,c)=>

          acc +

          Number(
            c.total_spent || 0
          ),

        0
      );

    const frequentCustomers =
      customers.filter(
        c =>

          Number(
            c.total_orders || 0
          ) >= 2

      ).length;


    /* =========================
    RESPONSE
    ========================= */

    res.json({

      success: true,

      kpis: {

        totalCustomers,

        totalRevenue,

        frequentCustomers

      },

      customers

    });

  } catch(err){

    console.error(
      "GET CUSTOMERS ERROR:",
      err
    );

    next(err);

  }

};
