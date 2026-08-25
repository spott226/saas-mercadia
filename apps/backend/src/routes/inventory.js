const express = require("express");

const router = express.Router();

const auth =
  require("../middleware/auth");

const {

  getInventory,

  getInventoryMovements

} = require(
  "../controllers/inventory.controller"
);


/* =========================
INVENTARIO ERP
========================= */

router.get(
  "/",
  auth.requireAdmin,
  getInventory
);


/* =========================
MOVIMIENTOS INVENTARIO
========================= */

router.get(
  "/movements",
  auth.requireAdmin,
  getInventoryMovements
);


module.exports = router;
