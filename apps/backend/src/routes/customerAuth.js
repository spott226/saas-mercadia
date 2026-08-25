const express = require("express");
const auth = require("../middleware/auth");
const customerAuthController =
  require("../controllers/customerAuth.controller");
const pushController =
  require("../controllers/push.controller");

const router = express.Router();

router.post(
  "/register",
  customerAuthController.register
);

router.post(
  "/login",
  customerAuthController.login
);

router.post(
  "/refresh",
  customerAuthController.refresh
);

router.post(
  "/forgot-password",
  customerAuthController.forgotPassword
);

router.post(
  "/update-password",
  auth.requireCustomer,
  customerAuthController.updatePassword
);

router.get(
  "/push/public-key",
  pushController.publicKey
);

router.post(
  "/push/subscribe",
  auth.requireCustomer,
  pushController.subscribe
);

router.post(
  "/push/unsubscribe",
  auth.requireCustomer,
  pushController.unsubscribe
);

router.get(
  "/me",
  auth.requireCustomer,
  customerAuthController.me
);

router.get(
  "/orders",
  auth.requireCustomer,
  customerAuthController.getMyOrders
);

module.exports = router;
