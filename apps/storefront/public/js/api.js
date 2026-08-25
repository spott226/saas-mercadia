// ================================
// API CONFIG
// ================================

const API_BASE =
  window.MERCADIA_CONFIG?.API_URL ||
  (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
      ? "http://localhost:3000/api"
      : "https://mercadia-back-production.up.railway.app/api"
  );

const productsCache = new Map();


// ================================
// REQUEST GENERICO
// ================================

async function apiRequest(endpoint, options = {}) {

  try {

    const url = API_BASE + endpoint;

    console.log("API CALL:", url);

    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      },
      ...options
    });

    if (!response.ok) {

      const text = await response.text();

      console.error(
        "HTTP ERROR:",
        response.status,
        text
      );

      throw new Error(
        text || "Error API"
      );

    }

    const data = await response.json();

    console.log("API RESPONSE:", data);

    return data;

  } catch (error) {

    console.error("API ERROR:", error);

    return null;

  }

}

function normalizeProductsResponse(response){

  if(!response){
    return [];
  }

  const products = Array.isArray(response)
    ? response
    : (
      response.products ||
      response.data ||
      response.items ||
      response.results ||
      []
    );

  return products.map(p => ({
    ...p,
    category:
      p.category ||
      p.category_name ||
      p.categoryName ||
      p.category_title ||
      p.categoryTitle ||
      null,
    images: p.images || [],
    variants:
      p.variants ||
      p.product_variants ||
      p.productVariants ||
      []
  }));

}

function mergeProducts(...productGroups){

  const merged = new Map();

  productGroups
    .flat()
    .filter(Boolean)
    .forEach(product => {
      const key =
        product.id ||
        product.product_id ||
        product.slug ||
        product.name;

      if(!key){
        return;
      }

      merged.set(String(key), {
        ...(merged.get(String(key)) || {}),
        ...product,
        images:
          product.images?.length
            ? product.images
            : (merged.get(String(key))?.images || []),
        variants:
          product.variants?.length
            ? product.variants
            : (merged.get(String(key))?.variants || [])
      });
    });

  return Array.from(merged.values());

}


// ================================
// STORE
// ================================

export async function getStore(slug) {

  if (!slug) {
    console.error("STORE ERROR: slug vacio");
    return null;
  }

  return await apiRequest(`/stores/${slug}`);

}


// ================================
// PRODUCTS
// ================================

export async function getProducts(slug) {

  if (!slug) {
    console.error("PRODUCTS ERROR: slug vacio");
    return [];
  }

  if(productsCache.has(slug)){
    return productsCache.get(slug);
  }

  const store = await getStore(slug);

  const [
    storefrontResponse,
    legacyResponse
  ] = await Promise.all([
    apiRequest(`/stores/${slug}/products`),
    store?.id
      ? apiRequest(`/products/${store.id}`)
      : Promise.resolve(null)
  ]);

  const products =
    mergeProducts(
      normalizeProductsResponse(storefrontResponse),
      normalizeProductsResponse(legacyResponse)
    );

  if(!products.length && (!store || !store.id)){
    console.error("STORE NOT FOUND");
  }

  productsCache.set(slug, products);

  return products;

}


// ================================
// PROMOTION
// ================================

export async function getActivePromotion(slug){

  if(!slug){
    return null;
  }

  const response =
    await apiRequest(`/stores/${slug}/promotion`);

  if(!response || !response.success){
    return null;
  }

  return response.promotion || null;

}


// ================================
// CREATE ORDER ERP
// ================================

export async function createOrder(orderData){

  if(!orderData){
    console.error("ORDER ERROR: datos vacios");
    return null;
  }

  return await apiRequest("/orders", {

    method: "POST",

    body: JSON.stringify(orderData)

  });

}
