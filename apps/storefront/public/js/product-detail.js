import { getProducts } from "./api.js";
import { addToCart } from "./cart.js";

const DEFAULT_IMAGE = "/assets/images/default.jpg";

function getParam(name){
  return new URLSearchParams(window.location.search).get(name);
}

function getSlug(){
  const slugParam = getParam("slug") || getParam("store");

  if(slugParam){
    return slugParam;
  }

  const host = window.location.hostname;

  if(host === "localhost" || host === "127.0.0.1"){
    return "chelispa";
  }

  return host.split(".")[0];
}

function formatMoney(value){
  return "$" + Number(value || 0).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function getProductImage(product, variant){
  const color = variant?.color;

  if(color){
    const imageByColor =
      product.images?.find(
        img =>
          img.color?.toLowerCase() ===
          color.toLowerCase()
      )?.image_url;

    if(imageByColor){
      return imageByColor;
    }
  }

  return (
    product.image ||
    product.images?.[0]?.image_url ||
    DEFAULT_IMAGE
  );
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

function createText(tag, text, className){
  const element = document.createElement(tag);

  if(className){
    element.className = className;
  }

  element.textContent = text;
  return element;
}

function renderProduct(product){
  const container = document.getElementById("product-detail");

  if(!container) return;

  container.replaceChildren();

  let selectedVariant =
    product.variants?.[0] || null;

  const gallery = document.createElement("section");
  gallery.className = "product-detail-gallery";

  const mainImage = document.createElement("img");
  mainImage.className = "product-detail-main-image";
  mainImage.src = getProductImage(product, selectedVariant);
  mainImage.alt = product.name || "Producto";
  mainImage.onerror = () => {
    mainImage.src = DEFAULT_IMAGE;
  };

  const thumbs = document.createElement("div");
  thumbs.className = "product-detail-thumbs";

  const images =
    product.images?.length
      ? product.images
      : [{ image_url: mainImage.src }];

  images.forEach((image, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className =
      index === 0
        ? "product-thumb product-thumb-active"
        : "product-thumb";

    const thumb = document.createElement("img");
    thumb.src = image.image_url || DEFAULT_IMAGE;
    thumb.alt = product.name || "Producto";
    thumb.onerror = () => {
      thumb.src = DEFAULT_IMAGE;
    };

    button.appendChild(thumb);
    button.addEventListener("click", () => {
      mainImage.src = thumb.src;

      thumbs
        .querySelectorAll(".product-thumb")
        .forEach(item => item.classList.remove("product-thumb-active"));

      button.classList.add("product-thumb-active");
    });

    thumbs.appendChild(button);
  });

  gallery.append(mainImage, thumbs);

  const info = document.createElement("section");
  info.className = "product-detail-info";

  const category = createText(
    "p",
    product.category || "Producto",
    "product-detail-category"
  );

  const title = createText(
    "h1",
    product.name || "Producto",
    "product-detail-title"
  );

  const price = createText(
    "p",
    formatMoney(selectedVariant?.price || product.price),
    "product-detail-price"
  );

  const variantLabel = createText(
    "p",
    product.variants?.length
      ? "Selecciona talla"
      : "Disponible",
    "product-detail-variant-label"
  );

  const selectedText = createText(
    "p",
    selectedVariant
      ? getVariantSize(selectedVariant)
      : "",
    "product-detail-selected-variant"
  );

  const variantGrid = document.createElement("div");
  variantGrid.className = "product-detail-variants";

  if(product.variants?.length){
    product.variants.forEach((variant, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className =
        index === 0
          ? "variant-pill variant-pill-active"
          : "variant-pill";
      const size = document.createElement("span");
      size.className = "variant-pill-size";
      size.textContent =
        getVariantSize(variant, index);

      const detail = document.createElement("span");
      detail.className = "variant-pill-detail";
      detail.textContent = "Talla";

      button.append(size, detail);

      button.addEventListener("click", () => {
        selectedVariant = variant;
        mainImage.src = getProductImage(product, selectedVariant);
        price.textContent = formatMoney(variant.price || product.price);
        selectedText.textContent = getVariantSize(variant, index);

        variantGrid
          .querySelectorAll(".variant-pill")
          .forEach(item => item.classList.remove("variant-pill-active"));

        button.classList.add("variant-pill-active");
      });

      variantGrid.appendChild(button);
    });
  }

  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.className = "product-detail-add";
  addButton.textContent = "Anadir al carrito";

  addButton.addEventListener("click", () => {
    const image = getProductImage(product, selectedVariant);
    const variantName =
      selectedVariant
        ? getVariantSize(selectedVariant)
        : "";

    addToCart({
      id: product.id,
      variant_id:
        selectedVariant?.id ||
        selectedVariant?.variant_id ||
        null,
      color: selectedVariant?.color || null,
      size: selectedVariant ? getVariantSize(selectedVariant) : null,
      name: variantName
        ? `${product.name} - ${variantName}`
        : product.name,
      price: Number(selectedVariant?.price || product.price || 0),
      image,
      qty: 1
    });

    addButton.textContent = "Agregado";

    setTimeout(() => {
      addButton.textContent = "Anadir al carrito";
    }, 1200);
  });

  const description = createText(
    "p",
    product.description ||
      "Producto disponible para pedido. Selecciona una variante y agrega al carrito para coordinar tu compra por WhatsApp.",
    "product-detail-description"
  );

  const meta = document.createElement("div");
  meta.className = "product-detail-meta";

  [
    "Entrega y disponibilidad se confirman por WhatsApp",
    "Cambios y detalles se coordinan con la tienda",
    "Pedido conectado al ERP de Mercadia"
  ].forEach(text => {
    meta.appendChild(createText("p", text));
  });

  info.append(
    category,
    title,
    price,
    variantLabel,
    selectedText,
    variantGrid,
    addButton,
    description,
    meta
  );

  container.append(gallery, info);
}

async function initProductDetail(){
  const productId = getParam("id");
  const slug = getSlug();
  const container = document.getElementById("product-detail");

  if(!productId || !container){
    if(container){
      container.innerHTML = `
        <div class="product-detail-empty">
          Producto no encontrado
        </div>
      `;
    }

    return;
  }

  const products = await getProducts(slug);
  const product =
    products.find(
      item => String(item.id) === String(productId)
    );

  if(!product){
    container.innerHTML = `
      <div class="product-detail-empty">
        Producto no encontrado
      </div>
    `;
    return;
  }

  document.title = product.name || "Producto";
  renderProduct(product);
}

document.addEventListener("DOMContentLoaded", initProductDetail);
