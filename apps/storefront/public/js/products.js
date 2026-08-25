import { getProducts } from "./api.js";
import { addToCart } from "./cart.js";


// ================================
// GET QUERY PARAM
// ================================

function getQueryParam(param){

  const params =
    new URLSearchParams(
      window.location.search
    );

  return params.get(param);

}

function getProductUrl(product){

  const params =
    new URLSearchParams();

  params.set("id", product.id);

  const slug =
    getQueryParam("slug") ||
    getQueryParam("store");

  if(slug){
    params.set("slug", slug);
  }

  return `/product.html?${params.toString()}`;

}

function getVariantSize(variant, index = 0){
  return (
    variant?.size ||
    variant?.name ||
    variant?.variant_name ||
    variant?.label ||
    `Opción ${index + 1}`
  );
}


// ================================
// IMAGE ZOOM
// ================================

function openImageZoom(image){

  const modal =
    document.createElement("div");

  modal.style = `
    position:fixed;
    inset:0;
    background:rgba(0,0,0,.92);
    display:flex;
    align-items:center;
    justify-content:center;
    z-index:999999;
    cursor:zoom-out;
    padding:20px;
  `;

  modal.innerHTML = `

    <img
      src="${image}"
      style="
        max-width:95%;
        max-height:95%;
        object-fit:contain;
        border-radius:14px;
      "
    >

  `;

  modal.addEventListener(
    "click",
    () => modal.remove()
  );

  document.body.appendChild(modal);

}


// ================================
// LOAD PRODUCTS
// ================================

export async function loadProducts(slug){

  const featuredContainer =
    document.getElementById("products");

  const allContainer =
    document.getElementById("products-list");

  const container =
    featuredContainer || allContainer;

  if(!container) return;

  container.innerHTML =
    Array.from({ length: 8 })
      .map(() => `
        <div class="product-skeleton">
          <div></div>
          <span></span>
          <span></span>
        </div>
      `)
      .join("");

  try{

    const products =
      await getProducts(slug);

    console.log(
      "PRODUCTS:",
      products
    );

    if(
      !products ||
      products.length === 0
    ){

      container.innerHTML = `
        <div class="text-center p-10 opacity-60">
          No hay productos disponibles
        </div>
      `;

      return;

    }

    container.innerHTML = "";

    let productsToShow = products;

    // ================================
    // FEATURED
    // ================================

    if(featuredContainer){

      const featured =
        products.filter(
          p => p.featured === true
        );

      productsToShow =
        featured.length
          ? featured
          : products.slice(0,4);

    }

    // ================================
    // CATEGORY FILTER
    // ================================

    const categoryFilter =
      getQueryParam("category");

    if(categoryFilter){

      productsToShow =
        products.filter(p => {

          const productCategory =
            p.category
              ? String(p.category).toLowerCase().trim()
              : "";

          if(!productCategory)
            return false;

          return productCategory ===
            categoryFilter
              .toLowerCase()
              .trim();

        });

    }

    // ================================
    // EMPTY CATEGORY
    // ================================

    if(productsToShow.length === 0){

      container.innerHTML = `
        <div class="text-center p-10 opacity-60">
          No hay productos en esta categoría
        </div>
      `;

      return;

    }

    // ================================
    // RENDER PRODUCTS
    // ================================

    productsToShow.forEach(product => {

      const card =
        document.createElement("div");

      card.className =
        "product-card";

      card.tabIndex = 0;
      card.setAttribute("role", "link");

      let imageUrl =
        product.image ||
        product.images?.[0]?.image_url ||
        "/assets/images/default.jpg";

      const price =
        Number(
          product.price || 0
        ).toLocaleString();

      // ================================
      // CARD HTML
      // ================================

      card.innerHTML = `

        <div class="product-image">

          <img
            src="${imageUrl}"
            alt="${product.name}"
            loading="lazy"
            onerror="
              this.src='/assets/images/default.jpg'
            "
          >

        </div>

        <div class="product-info">

          <div class="product-title">
            ${product.name || "Producto"}
          </div>

          <div class="product-price">
            $${price}
          </div>

          <button class="product-btn add-cart">
            Añadir
          </button>

        </div>

      `;

      container.appendChild(card);

      // ================================
      // OPEN PRODUCT DETAIL
      // ================================

      card.addEventListener(
        "click",
        () => {
          window.location.href = getProductUrl(product);
        }
      );

      card.addEventListener(
        "keydown",
        event => {
          if(event.key === "Enter"){
            window.location.href = getProductUrl(product);
          }
        }
      );

      // ================================
      // ADD TO CART
      // ================================

      const btn =
        card.querySelector(".add-cart");

      btn.addEventListener(
        "click",
        event => {

          event.stopPropagation();

          console.log(
            "PRODUCT CLICK:",
            product
          );

          console.log(
            "VARIANTS:",
            product.variants
          );

          // ================================
          // HAS VARIANTS
          // ================================

          if(
            product.variants &&
            product.variants.length > 0
          ){

            const options =
              product.variants
                .map((v, index) => {

                  const variantImage =

                    product.images?.find(
                      img =>
                        img.color?.toLowerCase()
                        ===
                        v.color?.toLowerCase()
                    )?.image_url ||

                    imageUrl;

                  return `

                    <button
                      class="variant-option"
                      data-index="${index}"
                    >

                      <img
                        src="${variantImage}"
                      >

                      <div>

                        <div class="variant-option-title">
                          ${String(getVariantSize(v, index)).toUpperCase()}
                        </div>

                        <div class="variant-option-meta">
                          Talla
                        </div>

                        <div class="variant-option-price">
                          $${Number(
                            v.price ||
                            product.price
                          ).toLocaleString()}
                        </div>

                      </div>

                    </button>

                  `;

                })
                .join("");

            const modal =
              document.createElement("div");

            modal.className =
              "variant-modal";

            modal.innerHTML = `

              <div class="variant-panel">

                <div class="variant-header">

                  <div>

                    <div class="variant-title">
                      ${product.name}
                    </div>

                    <div class="variant-subtitle">
                      Selecciona talla
                    </div>

                  </div>

                  <button
                    id="closeVariantModal"
                    class="modal-icon-btn"
                    aria-label="Cerrar variantes"
                  >
                    ×
                  </button>

                </div>

                <div class="variant-list">
                  ${options}
                </div>

              </div>

            `;

            document.body.appendChild(
              modal
            );

            // ================================
            // SELECT VARIANT
            // ================================

            document
              .querySelectorAll(
                ".variant-option"
              )
              .forEach(btnVariant => {

                btnVariant.addEventListener(
                  "click",
                  () => {

                    const index =
                      btnVariant.dataset.index;

                    const variant =
                      product.variants[index];

                    const variantImage =

                      product.images?.find(
                        img =>
                          img.color?.toLowerCase()
                          ===
                          variant.color?.toLowerCase()
                      )?.image_url ||

                      imageUrl;

                    const cartProduct = {

  id: product.id,

  variant_id:
    Number(variant.id || variant.variant_id),

  color: variant.color,

  size:
    getVariantSize(variant, index),

  name:
    `${product.name} - ${String(getVariantSize(variant, index)).toUpperCase()}`,

  price:
    Number(
      variant.price ||
      product.price
    ),

  image:
    variantImage,

  qty: 1

};

                    addToCart(
                      cartProduct
                    );

                    modal.remove();

                  }
                );

              });

            // ================================
            // CLOSE MODAL
            // ================================

            document
              .getElementById(
                "closeVariantModal"
              )
              .addEventListener(
                "click",
                () => {

                  modal.remove();

                }
              );

            return;

          }

          // ================================
          // NORMAL PRODUCT
          // ================================

          const cartProduct = {

            id:
              product.id,

            name:
              product.name,

            price:
              Number(
                product.price
              ),

            image:
              imageUrl,

            quantity: 1

          };

          addToCart(
            cartProduct
          );

        }
      );

    });

  }catch(error){

    console.error(
      "Error cargando productos:",
      error
    );

    container.innerHTML = `
      <div class="text-center p-10 text-red-500">
        Error cargando productos
      </div>
    `;

  }

}
