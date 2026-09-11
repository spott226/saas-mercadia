const express = require("express");
const router = express.Router();

const storeController = require("../controllers/storeController");

router.get("/:slug", storeController.getStore);

router.get("/:slug/products", storeController.getStoreProducts);

router.get("/:slug/promotion", storeController.getStorePromotion);

router.get("/:slug/promotions", storeController.getStorePromotions);
module.exports = router;
