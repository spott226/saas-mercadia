import { getProducts } from "./api.js";
import { loadProducts } from "./products.js";

const BACKEND_ORIGIN =
  window.MERCADIA_CONFIG?.BACKEND_ORIGIN ||
  (
    window.MERCADIA_CONFIG?.API_URL?.replace(/\/api\/?$/, "")
  ) ||
  (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
      ? "http://localhost:3000"
      : "https://mercadia-back-production.up.railway.app"
  );

const DEFAULT_PRESETS = {
  ecommerce_default: [
    { type: "product_grid" }
  ],
  fashion_editorial_1: [
    { type: "split_showcase", kicker: "Nueva temporada", title: "Piezas listas para elevar el look diario", text: "Una experiencia visual para tiendas de moda con enfoque elegante." },
    { type: "category_tiles", title: "Comprar por categoria" },
    { type: "editorial_banner", title: "Nueva seleccion", text: "Piezas elegidas para elevar tu estilo diario." },
    { type: "product_grid", title: "Nuevos productos" }
  ],
  fashion_editorial_2: [
    { type: "image_banner", title: "Temporada actual", text: "Silhuetas limpias, materiales suaves y detalles sutiles." },
    { type: "product_grid", title: "Lo mas reciente" },
    { type: "category_tiles", title: "Explora colecciones" }
  ],
  streetwear_drop_1: [
    { type: "promo_strip", title: "Drop activo", text: "Disponibilidad limitada." },
    { type: "product_grid", title: "Drop actual" },
    { type: "image_banner", title: "Estilo urbano", text: "Prendas para moverse distinto." }
  ],
  gym_active_1: [
    { type: "category_tiles", title: "Compra por entrenamiento" },
    { type: "product_grid", title: "Favoritos para entrenar" },
    { type: "editorial_banner", title: "Construido para moverte", text: "Ropa funcional para todos los dias." }
  ],
  luxury_minimal_1: [
    { type: "editorial_banner", title: "Menos ruido. Mas presencia.", text: "Una seleccion sobria para vestir mejor." },
    { type: "product_grid", title: "Seleccion destacada" }
  ],
  boutique_grid_1: [
    { type: "category_tiles", title: "Categorias" },
    { type: "product_grid", title: "Catalogo" }
  ],
  lookbook_1: [
    { type: "image_banner", title: "Lookbook", text: "Inspiracion visual para combinar tus prendas." },
    { type: "product_grid", title: "Compra el look" }
  ],
  promo_stack_1: [
    { type: "promo_strip", title: "Promociones activas", text: "Revisa piezas seleccionadas antes de que se agoten." },
    { type: "product_grid", title: "Productos en tendencia" },
    { type: "category_tiles", title: "Tambien puedes explorar" }
  ],
  mobile_first_1: [
    { type: "product_grid", title: "Compra rapido" },
    { type: "image_banner", title: "Desde Instagram hasta tu carrito", text: "Una experiencia rapida y directa." }
  ],
  restaurant_1: [
    { type: "category_tiles", title: "Categorias del menu" },
    { type: "product_grid", title: "Especialidades" }
  ],
  restaurant_2: [
    { type: "promo_strip", title: "Ordena directo", text: "Disponibilidad y entrega se confirman con la tienda." },
    { type: "product_grid", title: "Recomendaciones" }
  ],
  restaurant_3: [
    { type: "split_showcase", kicker: "Mesa lista", title: "Sabores para pedir hoy", text: "Una portada visual para restaurantes con menu directo y facil de explorar." },
    { type: "category_tiles", title: "Explora el menu" },
    { type: "product_grid", title: "Favoritos de la casa" }
  ],
  restaurant_4: [
    { type: "image_banner", kicker: "Especial del dia", title: "Antojos que se ven y se piden rapido", text: "Ideal para comida rapida, cafes y restaurantes con promos activas." },
    { type: "promo_strip", title: "Pedido por WhatsApp", text: "Confirma horario, disponibilidad y entrega directo con la tienda." },
    { type: "product_grid", title: "Mas pedidos" }
  ],
  restaurant_5: [
    { type: "editorial_banner", kicker: "Carta curada", title: "Menu corto, claro y elegante", text: "Pensado para restaurantes boutique, postres, cafes o cocina de autor." },
    { type: "category_tiles", title: "Secciones de la carta" },
    { type: "product_grid", title: "Seleccion del chef" }
  ],
  appointments_1: [
    { type: "category_tiles", title: "Servicios" },
    { type: "product_grid", title: "Servicios destacados" }
  ],
  appointments_2: [
    { type: "split_showcase", kicker: "Agenda abierta", title: "Servicios listos para reservar", text: "Una experiencia clara para consultorios, belleza, wellness y servicios profesionales." },
    { type: "category_tiles", title: "Areas de servicio" },
    { type: "product_grid", title: "Reservar servicio" }
  ],
  appointments_3: [
    { type: "image_banner", kicker: "Citas", title: "Elige servicio y coordina horario", text: "Ideal para negocios donde la confianza y el primer contacto importan." },
    { type: "promo_strip", title: "Confirmacion por WhatsApp", text: "El horario final se coordina directamente con el negocio." },
    { type: "product_grid", title: "Servicios populares" }
  ],
  appointments_4: [
    { type: "editorial_banner", kicker: "Atencion personalizada", title: "Una agenda limpia para vender servicios", text: "Pensada para dentistas, clinicas, spas, barbers y asesores." },
    { type: "category_tiles", title: "Categorias de servicio" },
    { type: "product_grid", title: "Agenda tu cita" }
  ],
  professional_1: [
    { type: "split_showcase", kicker: "Experiencia comprobada", title: "Una solución profesional para tus clientes", text: "Explica con claridad qué haces, para quién y por qué deben elegirte." },
    { type: "category_tiles", title: "Áreas de especialidad" },
    { type: "product_grid", title: "Servicios disponibles" }
  ],
  professional_2: [
    { type: "editorial_banner", kicker: "Ideas que avanzan", title: "Trabajo creativo con resultados", text: "Una portada editorial que pone el mensaje y los proyectos al frente." },
    { type: "image_banner", kicker: "Portafolio", title: "Proyectos que hablan por nosotros", cta: "Ver proyectos", layout: "gallery" },
    { type: "product_grid", title: "Soluciones y paquetes" }
  ],
  professional_3: [
    { type: "promo_strip", title: "Respuesta rápida", text: "Cuéntanos qué necesitas y recibe una propuesta personalizada." },
    { type: "split_showcase", kicker: "Hecho a tu medida", title: "De una necesidad a una solución clara", text: "Ideal para construcción, eventos, consultoría, mantenimiento y servicios por proyecto." },
    { type: "product_grid", title: "¿Qué necesitas cotizar?" }
  ]
};

class EcommerceTemplate{
  constructor({ store, slug }){
    this.store = store;
    this.slug = slug;
    this.products = [];
  }

  applyShell(){
    document.body.classList.add(
      "storefront-ecommerce",
      `template-${this.getTemplateKey().replaceAll("_","-")}`
    );

    setText("storefront-featured-title","Productos destacados");
    setText("storefront-primary-link","Productos");
    setText("storefront-category-link","Categorías");
    setText("storefront-hero-cta","Ver catálogo");
  }

  getTemplateKey(){
    return this.store?.template_key || "ecommerce_default";
  }

  getSections(){
    if(Array.isArray(this.store?.homepage_sections)){
      const visibleSections = this.store.homepage_sections.filter(
        section => section?.type !== "site_settings"
      );

      if(visibleSections.length){
        return visibleSections;
      }
    }

    return (
      DEFAULT_PRESETS[this.getTemplateKey()] ||
      DEFAULT_PRESETS.ecommerce_default
    );
  }

  async render(){
    this.applyShell();
    clearDynamicSections();

    this.products =
      await getProducts(this.slug);

    await loadProducts(this.slug);

    renderSections({
      store: this.store,
      slug: this.slug,
      products: this.products,
      sections: this.getSections()
    });
  }
}

class RestaurantTemplateOne extends EcommerceTemplate{
  applyShell(){
    document.body.classList.add(
      "storefront-restaurant",
      "template-restaurant-1"
    );

    setText("storefront-featured-title","Especialidades");
    setText("storefront-primary-link","Menú");
    setText("storefront-category-link","Categorías");
    setText("storefront-hero-cta","Ver menú");
  }
}

class RestaurantTemplateTwo extends EcommerceTemplate{
  applyShell(){
    document.body.classList.add(
      "storefront-restaurant",
      "template-restaurant-2"
    );

    setText("storefront-featured-title","Recomendaciones");
    setText("storefront-primary-link","Menú");
    setText("storefront-category-link","Categorías");
    setText("storefront-hero-cta","Ordenar ahora");
  }
}

class RestaurantTemplate extends EcommerceTemplate{
  applyShell(){
    document.body.classList.add(
      "storefront-restaurant",
      `template-${this.getTemplateKey().replaceAll("_","-")}`
    );

    setText("storefront-featured-title","Menu destacado");
    setText("storefront-primary-link","Menu");
    setText("storefront-category-link","Categorias");
    setText("storefront-hero-cta","Ver menu");
  }
}

class AppointmentsTemplateOne extends EcommerceTemplate{
  applyShell(){
    document.body.classList.add(
      "storefront-appointments",
      "template-appointments-1"
    );

    setText("storefront-featured-title","Servicios destacados");
    setText("storefront-primary-link","Servicios");
    setText("storefront-category-link","Categorías");
    setText("storefront-hero-cta","Ver servicios");
  }
}

class AppointmentsTemplate extends EcommerceTemplate{
  applyShell(){
    document.body.classList.add(
      "storefront-appointments",
      `template-${this.getTemplateKey().replaceAll("_","-")}`
    );

    setText("storefront-featured-title","Servicios destacados");
    setText("storefront-primary-link","Servicios");
    setText("storefront-category-link","Categorias");
    setText("storefront-hero-cta","Ver servicios");
  }
}

class ProfessionalTemplate extends EcommerceTemplate{
  applyShell(){
    document.body.classList.add(
      "storefront-professional",
      `template-${this.getTemplateKey().replaceAll("_","-")}`
    );

    setText("storefront-featured-title","Servicios y soluciones");
    setText("storefront-primary-link","Servicios");
    setText("storefront-category-link","Especialidades");
    setText("storefront-hero-cta","Solicitar cotización");
  }
}

function setText(id,text){
  const element =
    document.getElementById(id);

  if(element){
    element.textContent = text;
  }
}

function escapeHTML(value){
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function clearStorefrontClasses(){
  document.body.className =
    document.body.className
      .split(" ")
      .filter(className =>
        !className.startsWith("storefront-") &&
        !className.startsWith("template-")
      )
      .join(" ");
}

function clearDynamicSections(){
  document
    .querySelectorAll(".storefront-dynamic-section")
    .forEach(section => section.remove());
}

function getInsertionPoint(){
  const products =
    document.getElementById("products");

  return products?.closest("section") || null;
}

function getCategoryUrl(slug, category){
  const params = new URLSearchParams();

  const host = window.location.hostname;
  const isLocal =
    host === "localhost" ||
    host === "127.0.0.1";

  if(isLocal && slug){
    params.set("slug", slug);
  }

  params.set("category", category);

  return `/products.html?${params.toString()}`;
}

function getCategories(products){
  return [
    ...new Set(
      products
        .map(product => product.category)
        .filter(Boolean)
        .map(category => String(category).trim())
        .filter(Boolean)
    )
  ];
}

function createSection(className){
  const section = document.createElement("section");
  section.className =
    `storefront-dynamic-section ${className}`;
  return section;
}

function resolveAssetUrl(asset){
  if(!asset) return "";

  const value = String(asset).trim();

  if(
    value.startsWith("http://") ||
    value.startsWith("https://")
  ){
    return value;
  }

  if(value.startsWith("/uploads/")){
    return `${BACKEND_ORIGIN}${value}`;
  }

  if(value.startsWith("uploads/")){
    return `${BACKEND_ORIGIN}/${value}`;
  }

  return value;
}

function getSectionImages(sectionConfig){
  const images = Array.isArray(sectionConfig?.images)
    ? sectionConfig.images.filter(Boolean)
    : [];
  const primary = sectionConfig?.image_url || sectionConfig?.image;

  if(primary && !images.includes(primary)) images.unshift(primary);
  return images.slice(0,8);
}

function safeColor(value,fallback){
  return /^#[0-9a-f]{3,8}$/i.test(String(value || ""))
    ? value
    : fallback;
}

function applySectionPresentation(section,sectionConfig){
  const layouts = ["default","image-left","image-right","gallery"];
  const layout = layouts.includes(sectionConfig?.layout)
    ? sectionConfig.layout
    : "default";

  section.classList.add(`section-layout-${layout}`);
  section.style.setProperty(
    "--section-background",
    safeColor(sectionConfig?.styles?.background_color,"transparent")
  );
  section.style.setProperty(
    "--section-text",
    safeColor(sectionConfig?.styles?.text_color,"")
  );
}

function renderSectionMedia(images,className){
  if(!images.length) return "";

  return `
    <div class="${className} section-media-count-${Math.min(images.length,4)}">
      ${images.map((image,index) => `
        <img src="${escapeHTML(resolveAssetUrl(image))}" loading="lazy" alt="" data-section-image="${index}">
      `).join("")}
    </div>
  `;
}

function renderSections({ store, slug, products, sections }){
  const insertionPoint = getInsertionPoint();

  if(!insertionPoint){
    return;
  }

  const productSectionIndex =
    sections.findIndex(section => section.type === "product_grid");

  let afterAnchor = insertionPoint;

  sections
    .forEach((sectionConfig, index) => {
      if(sectionConfig.type === "product_grid"){
        return;
      }

      const section = renderSection({
        sectionConfig,
        store,
        slug,
        products
      });

      if(!section){
        return;
      }

      if(
        productSectionIndex === -1 ||
        index > productSectionIndex
      ){
        afterAnchor.insertAdjacentElement("afterend", section);
        afterAnchor = section;

        return;
      }

      insertionPoint.insertAdjacentElement("beforebegin", section);
    });

  const productSection =
    sections.find(section => section.type === "product_grid");

  if(productSection?.title){
    setText("storefront-featured-title", productSection.title);
  }
}

function renderSection({ sectionConfig, store, slug, products }){
  if(sectionConfig.type === "category_tiles"){
    return renderCategoryTiles({
      sectionConfig,
      slug,
      products
    });
  }

  if(sectionConfig.type === "image_banner"){
    return renderImageBanner({
      sectionConfig,
      store
    });
  }

  if(sectionConfig.type === "editorial_banner"){
    return renderEditorialBanner(sectionConfig);
  }

  if(sectionConfig.type === "split_showcase"){
    return renderSplitShowcase({
      sectionConfig,
      store
    });
  }

  if(sectionConfig.type === "promo_strip"){
    return renderPromoStrip(sectionConfig);
  }

  return null;
}

function renderCategoryTiles({ sectionConfig, slug, products }){
  const categories = getCategories(products).slice(0, 6);

  if(categories.length === 0){
    return null;
  }

  const section = createSection("storefront-category-tiles");
  applySectionPresentation(section,sectionConfig);
  section.innerHTML = `
    <div class="storefront-section-inner">
      <div class="storefront-section-heading">
        ${escapeHTML(sectionConfig.title || "Categorias")}
      </div>
      <div class="storefront-category-grid">
        ${categories.map(category => `
          <a href="${getCategoryUrl(slug, category)}">
            <span>${escapeHTML(category)}</span>
          </a>
        `).join("")}
      </div>
    </div>
  `;

  return section;
}

function renderImageBanner({ sectionConfig, store }){
  const images = getSectionImages(sectionConfig);

  const section = createSection("storefront-image-banner");
  applySectionPresentation(section,sectionConfig);
  section.innerHTML = `
    ${renderSectionMedia(images,"storefront-section-gallery")}
    <div>
      <p>${escapeHTML(sectionConfig.kicker || sectionConfig.eyebrow || "")}</p>
      <h2>${escapeHTML(sectionConfig.title || store?.name || "")}</h2>
      <span>${escapeHTML(sectionConfig.text || sectionConfig.description || "")}</span>
      ${sectionConfig.cta ? `<a href="/products.html">${escapeHTML(sectionConfig.cta)}</a>` : ""}
    </div>
  `;

  return section;
}

function renderSplitShowcase({ sectionConfig, store }){
  const images = getSectionImages(sectionConfig);

  const section = createSection("storefront-split-showcase");
  applySectionPresentation(section,sectionConfig);
  section.innerHTML = `
    <div class="storefront-split-copy">
      <p>${escapeHTML(sectionConfig.kicker || sectionConfig.eyebrow || "Nueva seleccion")}</p>
      <h2>${escapeHTML(sectionConfig.title || store?.name || "")}</h2>
      <span>${escapeHTML(sectionConfig.text || sectionConfig.description || "")}</span>
    </div>
    ${renderSectionMedia(images,"storefront-split-image storefront-section-gallery")}
  `;

  return section;
}

function renderEditorialBanner(sectionConfig){
  const section = createSection("storefront-editorial-banner");
  applySectionPresentation(section,sectionConfig);
  section.innerHTML = `
    <div>
      <p>${escapeHTML(sectionConfig.kicker || sectionConfig.eyebrow || "Editorial")}</p>
      <h2>${escapeHTML(sectionConfig.title || "")}</h2>
    </div>
    <p>${escapeHTML(sectionConfig.text || sectionConfig.description || "")}</p>
  `;

  return section;
}

function renderPromoStrip(sectionConfig){
  const section = createSection("storefront-promo-strip");
  applySectionPresentation(section,sectionConfig);
  section.innerHTML = `
    <strong>${escapeHTML(sectionConfig.title || "")}</strong>
    <span>${escapeHTML(sectionConfig.text || sectionConfig.description || "")}</span>
  `;

  return section;
}

export async function renderStorefrontExperience({ store, slug }){

  clearStorefrontClasses();

  const businessType =
    store?.business_type || "ecommerce";

  const templateKey =
    store?.template_key || "ecommerce_default";

  let template;

  if(
    businessType === "restaurant" &&
    templateKey === "restaurant_1"
  ){
    template = new RestaurantTemplateOne({ store, slug });
  }else if(
    businessType === "restaurant" &&
    templateKey === "restaurant_2"
  ){
    template = new RestaurantTemplateTwo({ store, slug });
  }else if(
    businessType === "appointments" &&
    templateKey === "appointments_1"
  ){
    template = new AppointmentsTemplateOne({ store, slug });
  }else if(
    businessType === "restaurant"
  ){
    template = new RestaurantTemplate({ store, slug });
  }else if(
    businessType === "appointments"
  ){
    template = new AppointmentsTemplate({ store, slug });
  }else if(
    businessType === "professional"
  ){
    template = new ProfessionalTemplate({ store, slug });
  }else{
    template = new EcommerceTemplate({ store, slug });
  }

  await template.render();

}
