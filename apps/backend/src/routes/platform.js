const express = require("express");
const controller = require("../controllers/platform.controller");
const auth = require("../middleware/auth");
const upload = require("../config/multer");

const router = express.Router();

router.post("/register", controller.register);
router.post("/login", controller.login);
router.post("/forgot-password", controller.forgotPassword);
router.post("/update-password", controller.updatePassword);
router.get("/me", controller.me);
router.post("/payment", upload.single("proof"), controller.reportPayment);

router.post("/admin/login", controller.adminLogin);
router.get("/admin/accounts", auth.requireSuperadmin, controller.listAccounts);
router.patch("/admin/accounts/:id/review", auth.requireSuperadmin, controller.reviewAccount);
router.patch("/admin/accounts/:id/status", auth.requireSuperadmin, controller.setAccountStatus);

module.exports = router;
