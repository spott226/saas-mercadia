const express = require("express");

const router = express.Router();

const auth =
  require("../middleware/auth");

const {

  createOrder,

  getOrders,

  updateOrderStatus,

  cancelOrder

} = require("../controllers/orders.controller");


/* =========================
CREAR PEDIDO
========================= */

router.post(
  "/",
  createOrder
);


/* =========================
LISTAR PEDIDOS ERP
========================= */

router.get(
  "/",
  auth.requireAdmin,
  getOrders
);


/* =========================
ACTUALIZAR STATUS
========================= */

router.patch(
  "/:id/status",
  auth.requireAdmin,
  updateOrderStatus
);


/* =========================
CANCELAR PEDIDO
========================= */

router.patch(
  "/:id/cancel",
  auth.requireAdmin,
  cancelOrder
);


module.exports = router;
