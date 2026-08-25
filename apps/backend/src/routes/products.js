const express = require("express");
const router = express.Router();

const productController = require("../controllers/productController");
const auth = require("../middleware/auth");
const upload = require("../config/multer");

// catálogo público
router.get("/:store_id", productController.getProducts);

// crear producto
router.post(
  "/",
  auth.requireAdmin,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "color_images", maxCount: 20 }
  ]),
  productController.createProduct
);

// editar producto
router.put(
  "/:id",
  auth.requireAdmin,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "color_images", maxCount: 20 }
  ]),
  productController.updateProduct
);

// eliminar
router.delete(
  "/:id",
  auth.requireAdmin,
  productController.deleteProduct
);

module.exports = router;
