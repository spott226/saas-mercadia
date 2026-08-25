const Store = require("../models/storeModel");
const Product = require("../models/productModel");
const Promotion = require("../models/promotionModel");

const attachProductAssets = async (products) => {

  const productIds =
    products.map(product => product.id);

  if(productIds.length === 0){
    return products;
  }

  const [
    variants,
    images
  ] = await Promise.all([
    Product.getVariantsByProducts(productIds),
    Product.getImagesByProducts(productIds)
  ]);

  const variantsByProduct = new Map();
  const imagesByProduct = new Map();

  for(const variant of variants){

    const list =
      variantsByProduct.get(
        variant.product_id
      ) || [];

    list.push(variant);

    variantsByProduct.set(
      variant.product_id,
      list
    );

  }

  for(const image of images){

    const list =
      imagesByProduct.get(
        image.product_id
      ) || [];

    list.push(image);

    imagesByProduct.set(
      image.product_id,
      list
    );

  }

  return products.map(product => ({
    ...product,
    variants:
      variantsByProduct.get(product.id) || [],
    images:
      imagesByProduct.get(product.id) || []
  }));

};

/* =========================
   OBTENER TIENDA POR SLUG
========================= */

exports.getStore = async (req, res) => {

  try {

    const { slug } = req.params;

    const store = await Store.getStoreBySlug(slug);

    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }

    res.json(store);

  } catch (error) {

    console.error("Error getting store:", error);
    res.status(500).json({ error: "Server error" });

  }

};


/* =========================
   OBTENER PRODUCTOS DE TIENDA
========================= */

exports.getStoreProducts = async (req, res) => {

  try {

    const { slug } = req.params;

    const store = await Store.getStoreBySlug(slug);

    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }

    const result =
      await Product.getProductsByStore(
        store.id,
        {
          page: 1,
          limit: 9999
        }
      );

    const products =
      await attachProductAssets(
        result.products || []
      );

    const categories =
      await Product.getCategoriesByStore(
        store.id
      );

    res.json({
      products,
      categories,
      pagination: result.pagination
    });

  } catch (error) {

    console.error("Error getting store products:", error);
    res.status(500).json({ error: "Server error" });

  }

};


/* =========================
   OBTENER PROMO ACTIVA
========================= */

exports.getStorePromotion = async (req, res) => {

  try {

    const { slug } = req.params;

    const store = await Store.getStoreBySlug(slug);

    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }

    const promotion =
      await Promotion.getActivePromotionByStore(
        store.id
      );

    res.json({
      success: true,
      promotion
    });

  } catch (error) {

    console.error("Error getting store promotion:", error);
    res.status(500).json({ error: "Server error" });

  }

};
