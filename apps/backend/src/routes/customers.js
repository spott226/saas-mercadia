const express = require("express");

const router = express.Router();

const auth =
  require("../middleware/auth");

const {

  getCustomers

} = require(
  "../controllers/customers.controller"
);


/* =========================
CUSTOMERS ERP
========================= */

router.get(
  "/",
  auth.requireAdmin,
  getCustomers
);


module.exports = router;
