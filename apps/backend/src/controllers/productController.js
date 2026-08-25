const Product = require("../models/productModel");
const Store = require("../models/storeModel");

/* =========================
OBTENER PRODUCTOS ERP
PAGINACIÓN + BÚSQUEDA + FILTRO
========================= */
exports.getProducts = async (req, res) => {

  try {

    const { store_id } = req.params;

    const page =
      parseInt(req.query.page) || 1;

    const limit =
      parseInt(req.query.limit) || 9999;

    const search =
      req.query.search || "";

    const category =
      req.query.category || "";


    /* =========================
    PRODUCTOS PAGINADOS
    ========================= */

    const result =
      await Product.getProductsByStore(
        store_id,
        {
          page,
          limit,
          search,
          category
        }
      );

    const products =
      result.products;

    const pagination =
      result.pagination;


    /* =========================
    CATEGORÍAS
    ========================= */

    const categories =
      await Product.getCategoriesByStore(
        store_id
      );


    /* =========================
    VARIANTES E IMÁGENES
    ========================= */

    const productIds =
      products.map(
        product => product.id
      );

    const [
      variants,
      images
    ] = await Promise.all([

      Product.getVariantsByProducts(
        productIds
      ),

      Product.getImagesByProducts(
        productIds
      )

    ]);

    const variantsByProduct =
      new Map();

    const imagesByProduct =
      new Map();

    for (const variant of variants) {

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

    for (const image of images) {

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

    for (const product of products) {

      product.variants =
        variantsByProduct.get(
          product.id
        ) || [];

      product.images =
        imagesByProduct.get(
          product.id
        ) || [];

    }


    /* =========================
    RESPONSE ERP
    ========================= */

    res.json({

      products,

      pagination,

      categories

    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: "server error"
    });

  }

};


/* =========================
CREAR PRODUCTO
========================= */
exports.createProduct = async (req, res) => {

  try {

    const store_id =
      req.user.store_id;

    const count =
      await Product.countProductsByStore(
        store_id
      );

    const limit =
      await Store.getProductLimit(
        store_id
      );

    if (count >= limit) {

      return res.status(403).json({
        error: "product limit reached"
      });

    }

    let image = null;


    /* =========================
    IMAGEN PRINCIPAL
    ========================= */

    if (req.files?.image?.[0]) {

      image =
        req.files.image[0].path ||
        req.files.image[0].secure_url;

    }

    const featured =
      req.body.featured === "true" ||
      req.body.featured === true ||
      req.body.featured === "on";

    const data = {

      name: req.body.name,

      description:
        req.body.description,

      price:
        req.body.price,

      category:
        req.body.category,

      image,

      store_id,

      featured

    };

    const product =
      await Product.createProduct(
        data
      );

    const product_id =
      product.id;


    /* =========================
    IMÁGENES POR COLOR
    ========================= */

    const colorImages =
      req.files?.color_images || [];

    let imageColors = [];

    if (req.body.image_colors) {

      try {

        imageColors =
          JSON.parse(
            req.body.image_colors
          );

      } catch (e) {

        imageColors = [];

      }

    }

    for (
      let i = 0;
      i < colorImages.length;
      i++
    ) {

      const file =
        colorImages[i];

      const imageUrl =
        file.path ||
        file.secure_url;

      const color =
        imageColors[i] || "default";

      await Product.createProductImage({

        product_id,

        color,

        image_url: imageUrl

      });

    }


    /* =========================
    VARIANTES ERP
    ========================= */

    if (req.body.variants) {

      let variants =
        req.body.variants;

      if (
        typeof variants === "string"
      ) {

        variants =
          JSON.parse(variants);

      }

      for (
        let i = 0;
        i < variants.length;
        i++
      ) {

        const variant =
          variants[i];

        if (
          !variant.color ||
          !variant.size
        ) {
          continue;
        }

        await Product.createVariant({

          product_id,

          color:
            variant.color,

          size:
            variant.size,

          price:
            variant.price,

          stock:
            variant.stock,

          sku:
            variant.sku,

          cost:
            variant.cost

        });

      }

    }

    res.status(201).json(product);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: "server error"
    });

  }

};


/* =========================
ACTUALIZAR PRODUCTO
========================= */
exports.updateProduct = async (
  req,
  res
) => {

  try {

    const { id } = req.params;

    let image = null;


    /* =========================
    IMAGEN PRINCIPAL
    ========================= */

    if (req.files?.image?.[0]) {

      image =
        req.files.image[0].path ||
        req.files.image[0].secure_url;

    }

    let featured = null;

    if (
      req.body.featured !== undefined
    ) {

      featured =
        req.body.featured === "true" ||
        req.body.featured === true ||
        req.body.featured === "on";

    }

    const data = {

      name:
        req.body.name,

      description:
        req.body.description,

      price:
        req.body.price,

      category:
        req.body.category,

      image,

      featured

    };

    const product =
      await Product.updateProduct(
        id,
        req.user.store_id,
        data
      );

    if (!product) {

      return res.status(403).json({
        error: "not allowed"
      });

    }


    /* =========================
    VARIANTES ERP
    ========================= */

    if (
      req.body.variants !== undefined
    ) {

      let variants =
        req.body.variants;

      if (
        typeof variants === "string"
      ) {

        try {

          variants =
            JSON.parse(variants);

        } catch (e) {

          variants = [];

        }

      }

      await Product.deleteVariantsByProduct(
        id
      );

      for (
        let i = 0;
        i < variants.length;
        i++
      ) {

        const variant =
          variants[i];

        if (
          !variant.color ||
          !variant.size
        ) {
          continue;
        }

        await Product.createVariant({

          product_id: id,

          color:
            variant.color,

          size:
            variant.size,

          price:
            variant.price,

          stock:
            variant.stock,

          sku:
            variant.sku,

          cost:
            variant.cost

        });

      }

    }


    /* =========================
    IMÁGENES POR COLOR
    ========================= */

    const colorImages =
      req.files?.color_images || [];

    let imageColors = [];

    if (req.body.image_colors) {

      try {

        imageColors =
          JSON.parse(
            req.body.image_colors
          );

      } catch (e) {

        imageColors = [];

      }

    }

    if (colorImages.length > 0) {

      await Product.deleteImagesByProduct(
        id
      );

      for (
        let i = 0;
        i < colorImages.length;
        i++
      ) {

        const file =
          colorImages[i];

        const imageUrl =
          file.path ||
          file.secure_url;

        const color =
          imageColors[i] || "default";

        await Product.createProductImage({

          product_id: id,

          color,

          image_url: imageUrl

        });

      }

    }

    res.json(product);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: "server error"
    });

  }

};


/* =========================
ELIMINAR PRODUCTO
========================= */
exports.deleteProduct = async (
  req,
  res
) => {

  try {

    const { id } = req.params;

    const deleted =
      await Product.deleteProduct(
        id,
        req.user.store_id
      );

    if (!deleted) {

      return res.status(403).json({
        error: "not allowed"
      });

    }

    res.json({
      message: "product deleted"
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: "server error"
    });

  }

};
