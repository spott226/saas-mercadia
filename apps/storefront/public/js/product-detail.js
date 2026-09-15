import { getProducts } from "./api.js";
import { addToCart, syncCartWithProducts } from "./cart.js?v=20260915-5";

const DEFAULT_IMAGE = "/assets/images/product-placeholder.svg";

function getParam(name){
  return new URLSearchParams(window.location.search).get(name);
}

function getSlug(){
  const configuredSlug = window.MERCADIA_CONFIG?.STORE_SLUG;
  if(configuredSlug) return configuredSlug;

  const pathMatch =
    window.location.pathname.match(/^\/tienda\/([^/]+)/i);

  if(pathMatch?.[1]){
    return decodeURIComponent(pathMatch[1]);
  }

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

function isDirectRequest(product){
  return ["appointment","quote"].includes(product?.item_type);
}

function openWhatsAppRequest(product){
  const phone = String(
    window.store?.whatsapp || window.STORE?.whatsapp || window.store_whatsapp || ""
  ).replace(/\D/g,"");

  if(!phone){
    alert("Este negocio todavía no ha configurado su WhatsApp.");
    return;
  }

  const message = product.item_type === "appointment"
    ? `Hola, quiero solicitar la cita o reservación: ${product.name}. ¿Me comparten los horarios disponibles?`
    : `Hola, quiero cotizar: ${product.name}. ¿Qué información necesitan para preparar la cotización?`;

  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`,"_blank","noopener,noreferrer");
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

  const images = [
    { image_url:getProductImage(product,null), color:"main" },
    ...(product.images || [])
  ].filter((image,index,list) =>
    image.image_url && list.findIndex(entry => entry.image_url === image.image_url) === index
  );

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

  const directRequest = isDirectRequest(product);
  const isQuote = product.item_type === "quote";
  const price = createText(
    "p",
    isQuote
      ? "Precio por cotizar"
      : product.item_type === "appointment"
        ? "Horario por confirmar"
      : formatMoney(selectedVariant?.price || product.price),
    "product-detail-price"
  );

  const variantLabel = createText(
    "p",
    directRequest
      ? "La solicitud se envía directamente al negocio"
      : product.has_variants === true && product.variants?.length
      ? "Selecciona una opción"
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

  if(!directRequest && product.has_variants === true && product.variants?.length){
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
      detail.textContent = variant.color || "Opción";

      button.append(size, detail);

      button.addEventListener("click", () => {
        selectedVariant = variant;
        mainImage.src = getProductImage(product, selectedVariant);
        price.textContent = isQuote
          ? "Precio por cotizar"
          : formatMoney(variant.price || product.price);
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
  const actionLabel = product.item_type === "quote"
    ? "Solicitar cotización"
    : product.item_type === "appointment"
      ? "Solicitar cita"
      : product.item_type === "service"
        ? "Solicitar servicio"
    : product.item_type === "digital"
      ? "Comprar"
      : "Añadir al carrito";
  addButton.textContent = actionLabel;

  addButton.addEventListener("click", () => {
    if(directRequest){
      openWhatsAppRequest(product);
      return;
    }

    const image = getProductImage(product, selectedVariant);
    const variantName =
      product.has_variants === true && selectedVariant
        ? getVariantSize(selectedVariant)
        : "";

    addToCart({
      id: product.id,
      variant_id:
        selectedVariant?.id ||
        selectedVariant?.variant_id ||
        null,
      color: product.has_variants === true ? selectedVariant?.color || null : null,
      size: product.has_variants === true && selectedVariant ? getVariantSize(selectedVariant) : null,
      name: variantName
        ? `${product.name} - ${variantName}`
        : product.name,
      price: Number(selectedVariant?.price || product.price || 0),
      image,
      qty: 1
    });

    addButton.textContent = "Agregado";

    setTimeout(() => {
      addButton.textContent = actionLabel;
    }, 1200);
  });

  const description = createText(
    "p",
    product.description || (
      product.item_type === "quote"
        ? "Solicita una cotización y coordina los detalles del proyecto con el negocio."
        : product.item_type === "appointment"
          ? "Solicita esta cita y confirma la fecha y el horario directamente por WhatsApp."
        : product.item_type === "service"
          ? "Disponible para solicitud. Agrega el servicio y coordina los detalles con el negocio."
          : "Disponible para pedido. Agrégalo y coordina los detalles con la tienda."
    ),
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
  syncCartWithProducts(products);
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

