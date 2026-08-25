const express = require("express");
const router = express.Router();

const adminController = require("../controllers/adminController");
const auth = require("../middleware/auth");
const upload = require("../config/multer");

router.post("/login",adminController.login);

router.get(
  "/store",
  auth.requireAdmin,
  adminController.getStore
);

router.patch(
  "/store",
  auth.requireAdmin,
  adminController.updateStore
);

router.post(
  "/store/logo",
  auth.requireAdmin,
  upload.single("logo"),
  adminController.updateStoreLogo
);

router.post(
  "/store/hero",
  auth.requireAdmin,
  upload.single("hero"),
  adminController.updateStoreHero
);

router.post(
  "/uploads",
  auth.requireAdmin,
  upload.single("image"),
  adminController.uploadAdminImage
);

router.get(
  "/promotions",
  auth.requireAdmin,
  adminController.getPromotions
);

router.post(
  "/promotions",
  auth.requireAdmin,
  upload.single("image"),
  adminController.createPromotion
);

router.patch(
  "/promotions/:id",
  auth.requireAdmin,
  upload.single("image"),
  adminController.updatePromotion
);

router.delete(
  "/promotions/:id",
  auth.requireAdmin,
  adminController.deletePromotion
);

module.exports = router;
