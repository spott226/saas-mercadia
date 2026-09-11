const API_URL =
  window.MERCADIA_CONFIG?.API_URL ||
  "https://mercadia-back-production.up.railway.app/api";

await window.adminSessionReady;

const BACKEND_ORIGIN =
  window.MERCADIA_CONFIG?.BACKEND_ORIGIN ||
  API_URL.replace(/\/api\/?$/, "") ||
  "https://mercadia-back-production.up.railway.app";

const BACKEND_UPLOADS_URL =
  `${BACKEND_ORIGIN}/uploads/`;

const token =
  window.getAdminToken?.() || sessionStorage.getItem("token") || localStorage.getItem("mercadia_admin_token");

if(!token){

  window.location = "/?login=1";

}

const templatesByType = {
  ecommerce:[
    {
      value:"ecommerce_default",
      label:"Glass 3D",
      description:"Catalogo limpio con hero, categorias y productos destacados.",
      sections:[
        { type:"category_tiles", title:"Comprar por categoria" },
        { type:"product_grid", title:"Productos destacados" }
      ]
    },
    {
      value:"fashion_editorial_1",
      label:"Editorial inclinada",
      description:"Portada editorial, categorias visibles y catalogo con sensacion de marca premium.",
      sections:[
        { type:"split_showcase", eyebrow:"Nueva temporada", title:"Piezas listas para elevar el look diario", text:"Una experiencia visual para tiendas de moda con enfoque elegante." },
        { type:"editorial_banner", eyebrow:"Seleccion curada", title:"Nueva seleccion", text:"Piezas elegidas para elevar tu estilo diario." },
        { type:"category_tiles", title:"Explora colecciones" },
        { type:"product_grid", title:"Seleccion destacada" }
      ]
    },
    {
      value:"fashion_editorial_2",
      label:"Galería asimétrica",
      description:"Mas enfoque en colecciones: imagen fuerte, texto corto y productos al cierre.",
      sections:[
        { type:"image_banner", eyebrow:"Coleccion", title:"Moda con presencia", cta:"Ver productos" },
        { type:"category_tiles", title:"Categorias principales" },
        { type:"promo_strip", title:"Entrega y disponibilidad se confirman por WhatsApp", text:"Compra directa con la tienda." },
        { type:"product_grid", title:"Lo mas nuevo" }
      ]
    },
    {
      value:"streetwear_drop_1",
      label:"Drop brutalista",
      description:"Formato de lanzamientos: directo, visual y con productos como drop principal.",
      sections:[
        { type:"promo_strip", title:"Drop activo", text:"Piezas limitadas disponibles por tiempo corto." },
        { type:"product_grid", title:"Ultimo drop" },
        { type:"category_tiles", title:"Comprar por estilo" }
      ]
    },
    {
      value:"gym_active_1",
      label:"Performance neón",
      description:"Pensado para activewear: dinamico, claro y facil de comprar desde mobile.",
      sections:[
        { type:"image_banner", eyebrow:"Performance", title:"Ropa lista para moverse contigo", cta:"Ver coleccion" },
        { type:"product_grid", title:"Favoritos para entrenar" },
        { type:"category_tiles", title:"Compra por categoria" }
      ]
    },
    {
      value:"luxury_minimal_1",
      label:"Atelier minimal",
      description:"Minimalista y sobria, con aire europeo para boutiques premium.",
      sections:[
        { type:"editorial_banner", eyebrow:"Atelier", title:"Seleccion curada con detalle", text:"Menos ruido, mas producto." },
        { type:"product_grid", title:"Piezas esenciales" },
        { type:"category_tiles", title:"Lineas de producto" }
      ]
    },
    {
      value:"boutique_grid_1",
      label:"Catálogo lateral",
      description:"Mas grid, mas escaneo: ideal para tiendas con muchas categorias.",
      sections:[
        { type:"category_tiles", title:"Categorias" },
        { type:"product_grid", title:"Catalogo completo" },
        { type:"image_banner", eyebrow:"Boutique", title:"Nuevas piezas disponibles", cta:"Comprar ahora" }
      ]
    },
    {
      value:"lookbook_1",
      label:"Lookbook inmersivo",
      description:"Primero inspiracion, luego productos. Bueno para ropa, outfits y colecciones.",
      sections:[
        { type:"image_banner", eyebrow:"Lookbook", title:"Ideas para combinar esta temporada", cta:"Ver looks" },
        { type:"editorial_banner", eyebrow:"Estilo", title:"Crea tu propia combinacion", text:"Piezas faciles de mezclar y comprar." },
        { type:"product_grid", title:"Comprar el look" }
      ]
    },
    {
      value:"promo_stack_1",
      label:"Promos apiladas",
      description:"Ideal para tiendas que empujan ofertas, novedades y comunicados.",
      sections:[
        { type:"promo_strip", title:"Promocion activa", text:"Revisa disponibilidad antes de que se agote." },
        { type:"image_banner", eyebrow:"Oferta", title:"Nuevas oportunidades para comprar", cta:"Ver ofertas" },
        { type:"product_grid", title:"Productos en tendencia" }
      ]
    },
    {
      value:"mobile_first_1",
      label:"App móvil",
      description:"Experiencia ligera y directa para clientes que compran desde celular.",
      sections:[
        { type:"product_grid", title:"Compra rapido" },
        { type:"category_tiles", title:"Encuentra rapido" },
        { type:"promo_strip", title:"Pedido por WhatsApp", text:"Agrega al carrito y coordina directo con la tienda." }
      ]
    }
  ],
  restaurant:[
    {
      value:"restaurant_1",
      label:"Bistró flotante",
      description:"Menu visual para restaurante con productos como platillos.",
      sections:[
        { type:"category_tiles", title:"Categorias del menu" },
        { type:"product_grid", title:"Especialidades" }
      ]
    },
    {
      value:"restaurant_2",
      label:"Carta nocturna lateral",
      description:"Restaurante con foco en recomendaciones y orden rapido.",
      sections:[
        { type:"promo_strip", title:"Ordena directo", text:"Disponibilidad y entrega se confirman con la tienda." },
        { type:"product_grid", title:"Recomendaciones" }
      ]
    },
    {
      value:"restaurant_3",
      label:"Mesa 3D",
      description:"Portada con imagen grande para comida, menu por categorias y favoritos.",
      sections:[
        { type:"split_showcase", eyebrow:"Mesa lista", title:"Sabores para pedir hoy", text:"Una portada visual para restaurantes con menu directo y facil de explorar." },
        { type:"category_tiles", title:"Explora el menu" },
        { type:"product_grid", title:"Favoritos de la casa" }
      ]
    },
    {
      value:"restaurant_4",
      label:"Pop food",
      description:"Ideal para comida rapida, cafes y negocios que empujan especiales del dia.",
      sections:[
        { type:"image_banner", eyebrow:"Especial del dia", title:"Antojos que se ven y se piden rapido", text:"Ideal para comida rapida, cafes y restaurantes con promos activas." },
        { type:"promo_strip", title:"Pedido por WhatsApp", text:"Confirma horario, disponibilidad y entrega directo con la tienda." },
        { type:"product_grid", title:"Mas pedidos" }
      ]
    },
    {
      value:"restaurant_5",
      label:"Cocina editorial",
      description:"Mas sobrio y elegante para carta corta, cocina de autor, postres o cafe.",
      sections:[
        { type:"editorial_banner", eyebrow:"Carta curada", title:"Menu corto, claro y elegante", text:"Pensado para restaurantes boutique, postres, cafes o cocina de autor." },
        { type:"category_tiles", title:"Secciones de la carta" },
        { type:"product_grid", title:"Seleccion del chef" }
      ]
    }
  ],
  appointments:[
    {
      value:"appointments_1",
      label:"Wellness orgánico",
      description:"Servicios y citas con enfoque claro en agendar.",
      sections:[
        { type:"category_tiles", title:"Servicios" },
        { type:"product_grid", title:"Servicios destacados" }
      ]
    },
    {
      value:"appointments_2",
      label:"Agenda glass",
      description:"Portada con imagen principal para servicios, consultorios, belleza y wellness.",
      sections:[
        { type:"split_showcase", eyebrow:"Agenda abierta", title:"Servicios listos para reservar", text:"Una experiencia clara para consultorios, belleza, wellness y servicios profesionales." },
        { type:"category_tiles", title:"Areas de servicio" },
        { type:"product_grid", title:"Reservar servicio" }
      ]
    },
    {
      value:"appointments_3",
      label:"Reserva digital",
      description:"Pensada para que el cliente elija servicio y coordine horario por WhatsApp.",
      sections:[
        { type:"image_banner", eyebrow:"Citas", title:"Elige servicio y coordina horario", text:"Ideal para negocios donde la confianza y el primer contacto importan." },
        { type:"promo_strip", title:"Confirmacion por WhatsApp", text:"El horario final se coordina directamente con el negocio." },
        { type:"product_grid", title:"Servicios populares" }
      ]
    },
    {
      value:"appointments_4",
      label:"Clínica editorial",
      description:"Mas limpio y serio para dentistas, clinicas, spas, barbers y asesores.",
      sections:[
        { type:"editorial_banner", eyebrow:"Atencion personalizada", title:"Una agenda limpia para vender servicios", text:"Pensada para dentistas, clinicas, spas, barbers y asesores." },
        { type:"category_tiles", title:"Categorias de servicio" },
        { type:"product_grid", title:"Agenda tu cita" }
      ]
    }
  ],
  professional:[
    {
      value:"professional_1",
      label:"Corporativo dimensional",
      description:"Presenta confianza, especialidades y servicios con una portada corporativa.",
      sections:[
        { type:"split_showcase", eyebrow:"Experiencia comprobada", title:"Una solución profesional para tus clientes", text:"Explica con claridad qué haces, para quién y por qué deben elegirte." },
        { type:"category_tiles", title:"Áreas de especialidad" },
        { type:"product_grid", title:"Servicios disponibles" }
      ]
    },
    {
      value:"professional_2",
      label:"Estudio inmersivo",
      description:"Una estructura visual y creativa para agencias, estudios, freelancers y proyectos.",
      sections:[
        { type:"editorial_banner", eyebrow:"Ideas que avanzan", title:"Trabajo creativo con resultados", text:"Una portada editorial que pone el mensaje y los proyectos al frente." },
        { type:"image_banner", eyebrow:"Portafolio", title:"Proyectos que hablan por nosotros", cta:"Ver proyectos", layout:"gallery" },
        { type:"product_grid", title:"Soluciones y paquetes" }
      ]
    },
    {
      value:"professional_3",
      label:"Cotización modular",
      description:"Página enfocada en convertir visitas en solicitudes y conversaciones por WhatsApp.",
      sections:[
        { type:"promo_strip", title:"Respuesta rápida", text:"Cuéntanos qué necesitas y recibe una propuesta personalizada." },
        { type:"split_showcase", eyebrow:"Hecho a tu medida", title:"De una necesidad a una solución clara", text:"Ideal para construcción, eventos, consultoría, mantenimiento y servicios por proyecto." },
        { type:"product_grid", title:"¿Qué necesitas cotizar?" }
      ]
    }
  ]
};

let currentStore = null;

let workingSections = [];
let activeSectionIndex = 0;
let workingSiteSettings = {};
let livePreviewTimer = null;

const message =
  document.getElementById("store-message");

const businessType =
  document.getElementById("business-type");

const templateKey =
  document.getElementById("template-key");

const templatePreview =
  document.getElementById("template-preview");

const templateGallery =
  document.getElementById("template-gallery");

const sectionTitle =
  document.getElementById("section-title");

const sectionKicker =
  document.getElementById("section-kicker");

const sectionText =
  document.getElementById("section-text");

const sectionType =
  document.getElementById("section-type");

const sectionCta =
  document.getElementById("section-cta");

const sectionLayout =
  document.getElementById("section-layout");

const sectionBackground =
  document.getElementById("section-background");

const sectionTextColor =
  document.getElementById("section-text-color");

const sectionList =
  document.getElementById("section-list");

const sectionImages =
  document.getElementById("section-images");

const livePreview =
  document.getElementById("live-store-preview");

const siteTheme = document.getElementById("site-theme");
const siteBackgroundColor = document.getElementById("site-background-color");
const siteTextColor = document.getElementById("site-text-color");
const siteAccentColor = document.getElementById("site-accent-color");
const siteDisplayName = document.getElementById("site-display-name");
const siteHeroTitle = document.getElementById("site-hero-title");
const siteHeroText = document.getElementById("site-hero-text");
const customDomain = document.getElementById("custom-domain");
const customDomainGuide = document.getElementById("custom-domain-guide");

const sectionImageUrl =
  document.getElementById("section-image-url");

const sectionImageInput =
  document.getElementById("section-image-input");



const editableSectionTypes = [
  "split_showcase",
  "image_banner",
  "editorial_banner"
];


function showMessage(text,type = "success"){

  message.textContent = text;
  message.className =
    `admin-message ${type} active`;

  setTimeout(
    () => {
      message.classList.remove("active");
    },
    3500
  );

}


async function runSafely(action){

  try{

    await action();

  }catch(err){

    console.error(err);
    showMessage(
      err.message,
      "error"
    );

  }

}


function escapeHTML(value){

  return String(value ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");

}


function toDateInput(value){

  if(!value) return "";

  return String(value).slice(0,10);

}


function resolveAssetUrl(asset){

  if(!asset) return "";

  const value =
    String(asset).trim();

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

  if(value.startsWith("/")){

    return value;

  }

  return `${BACKEND_UPLOADS_URL}${value}`;

}


async function adminRequest(endpoint,options = {}){

  const headers = {
    Authorization:`Bearer ${token}`,
    ...(options.headers || {})
  };

  const res =
    await fetch(
      `${API_URL}${endpoint}`,
      {
        cache:"no-store",
        ...options,
        headers
      }
    );

  const contentType =
    res.headers.get("content-type") || "";

  const data =
    contentType.includes("application/json")
    ? await res.json()
    : await res.text();

  if(!res.ok){

    const errorMessage =
      data?.error ||
      data?.message ||
      "No se pudo completar la acción";

    throw new Error(errorMessage);

  }

  return data;

}


function setImagePreview(img,empty,url){

  if(url){

    img.src =
      resolveAssetUrl(url);
    img.style.display = "block";
    empty.style.display = "none";

    return;

  }

  img.removeAttribute("src");
  img.style.display = "none";
  empty.style.display = "block";

}


function renderStore(store){

  currentStore = store;

  customDomain.value = store.custom_domain || "";
  const domainTarget = window.MERCADIA_CONFIG?.CUSTOM_DOMAIN_TARGET || "mercadia-back-production.up.railway.app";
  customDomainGuide.innerHTML = store.custom_domain
    ? `<strong>Dominio registrado: ${escapeHTML(store.custom_domain)}</strong><span>En tu proveedor de dominio crea un registro CNAME para <b>${escapeHTML(store.custom_domain)}</b> apuntando a <b>${escapeHTML(domainTarget)}</b>. Después debe agregarse este dominio al hosting de Mercadia para emitir su certificado HTTPS.</span>`
    : `<strong>Cómo funciona</strong><span>Registra aquí el dominio. Después apunta su CNAME a <b>${escapeHTML(domainTarget)}</b> y solicita la activación del certificado HTTPS.</span>`;

  document.getElementById("store-name").textContent =
    store.name || "-";

  document.getElementById("store-slug").textContent =
    store.slug || "-";

  document.getElementById("store-business-type").textContent =
    store.business_type || "-";

  document.getElementById("store-template-key").textContent =
    store.template_key || "-";

  const previewLink =
    document.getElementById("store-preview-link");

  if(previewLink && store.slug){
    previewLink.href =
      `/tienda/${encodeURIComponent(store.slug)}`;

    if(livePreview){
      const previewUrl =
        `/tienda/${encodeURIComponent(store.slug)}?editor=1`;

      if(livePreview.getAttribute("src") !== previewUrl){
        livePreview.src = previewUrl;
      }
    }
  }

  setImagePreview(
    document.getElementById("logo-preview"),
    document.getElementById("logo-empty"),
    store.logo
  );

  setImagePreview(
    document.getElementById("hero-preview"),
    document.getElementById("hero-empty"),
    store.hero
  );

  businessType.value =
    store.business_type || "ecommerce";

  renderTemplateOptions(
    store.template_key
  );

  setSectionEditorFromSections(
    getCurrentHomepageSections().length
      ? getCurrentHomepageSections()
      : getSelectedTemplate()?.sections
  );

  updateTemplatePreview();

}


function getTemplateOptions(){

  return templatesByType[businessType.value] ||
    templatesByType.ecommerce;

}


function getSelectedTemplate(){

  const options =
    getTemplateOptions();

  return options.find(
    option => option.value === templateKey.value
  ) || options[0];

}


function cloneSections(sections){

  return JSON.parse(
    JSON.stringify(sections || [])
  );

}


function getCurrentHomepageSections(){

  return Array.isArray(currentStore?.homepage_sections)
    ? currentStore.homepage_sections
    : [];

}


function sectionImageList(section){
  const images = Array.isArray(section?.images)
    ? section.images.filter(Boolean)
    : [];
  const primary = section?.image_url || section?.image;

  if(primary && !images.includes(primary)){
    images.unshift(primary);
  }

  return images.slice(0,8);
}


function syncActiveSectionFromInputs(){
  const section = workingSections[activeSectionIndex];
  if(!section) return;

  section.type = sectionType.value;
  section.title = sectionTitle.value.trim();
  section.eyebrow = sectionKicker.value.trim();
  section.kicker = sectionKicker.value.trim();
  section.text = sectionText.value.trim();
  section.cta = sectionCta.value.trim();
  section.layout = sectionLayout.value;
  section.styles = {
    ...(section.styles || {}),
    background_color:sectionBackground.value,
    text_color:sectionTextColor.value
  };

  const directImage = sectionImageUrl.value.trim();
  const images = sectionImageList(section);

  if(directImage){
    section.image_url = directImage;
    section.images = [
      directImage,
      ...images.filter(image => image !== directImage)
    ].slice(0,8);
  }else{
    delete section.image_url;
    section.images = images;
  }
}


function renderSectionList(){
  if(!sectionList) return;

  sectionList.innerHTML = workingSections.map((section,index) => `
    <button type="button" class="section-tab ${index === activeSectionIndex ? "active" : ""}" data-section-index="${index}" role="tab" aria-selected="${index === activeSectionIndex}">
      <span>${index + 1}</span>
      ${escapeHTML(section.title || section.type || "Sección")}
    </button>
  `).join("");
}


function renderSectionImages(){
  if(!sectionImages) return;

  const section = workingSections[activeSectionIndex] || {};
  const images = sectionImageList(section);

  sectionImages.innerHTML = images.length
    ? images.map((image,index) => `
        <figure class="section-image-item">
          <img src="${escapeHTML(resolveAssetUrl(image))}" alt="Imagen ${index + 1} de la sección">
          <button type="button" data-remove-image="${index}" aria-label="Quitar imagen">×</button>
          ${index === 0 ? "<figcaption>Principal</figcaption>" : ""}
        </figure>
      `).join("")
    : `<div class="empty section-images-empty">Esta sección todavía no tiene imágenes propias.</div>`;
}


function loadActiveSection(){
  const section = workingSections[activeSectionIndex] || {};
  const images = sectionImageList(section);

  sectionType.value = section.type || "image_banner";
  sectionTitle.value = section.title || "";
  sectionKicker.value = section.eyebrow || section.kicker || "";
  sectionText.value = section.text || section.description || "";
  sectionCta.value = section.cta || "";
  sectionLayout.value = section.layout || "default";
  sectionBackground.value = section.styles?.background_color || "#ffffff";
  sectionTextColor.value = section.styles?.text_color || "#111827";
  sectionImageUrl.value = section.image_url || section.image || images[0] || "";

  renderSectionList();
  renderSectionImages();
}


function buildHomepageSections(){
  syncActiveSectionFromInputs();
  workingSiteSettings = {
    type:"site_settings",
    theme:siteTheme.value,
    styles:{
      background_color:siteBackgroundColor.value,
      text_color:siteTextColor.value,
      accent_color:siteAccentColor.value
    },
    display_name:siteDisplayName.value.trim(),
    hero_title:siteHeroTitle.value.trim(),
    hero_text:siteHeroText.value.trim()
  };

  return [
    cloneSections([workingSiteSettings])[0],
    ...cloneSections(workingSections)
  ];
}


function setSectionEditorFromSections(sections){
  const clonedSections = cloneSections(sections || []);
  workingSiteSettings = clonedSections.find(section => section.type === "site_settings") || {};
  workingSections = clonedSections.filter(section => section.type !== "site_settings");

  siteTheme.value = workingSiteSettings.theme || currentStore?.theme || "modern";
  siteBackgroundColor.value = workingSiteSettings.styles?.background_color || getTemplateDefaultColors(templateKey.value).background;
  siteTextColor.value = workingSiteSettings.styles?.text_color || getTemplateDefaultColors(templateKey.value).text;
  siteAccentColor.value = workingSiteSettings.styles?.accent_color || getTemplateDefaultColors(templateKey.value).accent;
  siteDisplayName.value = workingSiteSettings.display_name || currentStore?.name || "";
  siteHeroTitle.value = workingSiteSettings.hero_title || currentStore?.hero_title || currentStore?.name || "";
  siteHeroText.value = workingSiteSettings.hero_text || currentStore?.hero_text || "";

  if(!workingSections.length){
    workingSections = [{ type:"image_banner", title:"Nueva sección", images:[] }];
  }

  activeSectionIndex = Math.min(activeSectionIndex,workingSections.length - 1);
  loadActiveSection();
}


function readSiteEditor(){
  return {
    theme:siteTheme.value,
    background_color:siteBackgroundColor.value,
    text_color:siteTextColor.value,
    accent_color:siteAccentColor.value,
    display_name:siteDisplayName.value,
    hero_title:siteHeroTitle.value,
    hero_text:siteHeroText.value
  };
}


function writeSiteEditor(settings){
  siteTheme.value = settings.theme || "modern";
  siteBackgroundColor.value = settings.background_color || siteBackgroundColor.value;
  siteTextColor.value = settings.text_color || siteTextColor.value;
  siteAccentColor.value = settings.accent_color || siteAccentColor.value;
  siteDisplayName.value = settings.display_name || "";
  siteHeroTitle.value = settings.hero_title || "";
  siteHeroText.value = settings.hero_text || "";
}


function postLivePreview(){
  if(!livePreview?.contentWindow || !currentStore) return;

  livePreview.contentWindow.postMessage({
    type:"mercadia:preview-store",
    store:{
      ...currentStore,
      name:siteDisplayName.value.trim() || currentStore.name,
      theme:siteTheme.value,
      site_styles:{
        background_color:siteBackgroundColor.value,
        text_color:siteTextColor.value,
        accent_color:siteAccentColor.value
      },
      hero_title:siteHeroTitle.value.trim(),
      hero_text:siteHeroText.value.trim(),
      business_type:businessType.value,
      template_key:templateKey.value,
      homepage_sections:buildHomepageSections()
    }
  },window.location.origin);
}

function scheduleLivePreview(delay = 70){
  clearTimeout(livePreviewTimer);
  livePreviewTimer = setTimeout(postLivePreview,delay);
}


function updateTemplatePreview(){
  if(!templatePreview) return;

  syncActiveSectionFromInputs();

  const selectedTemplate = getSelectedTemplate();
  const section = workingSections[activeSectionIndex] || {};
  const images = sectionImageList(section);
  const templateClass = `template-${String(selectedTemplate?.value || "ecommerce_default").replaceAll("_","-")}`;
  const navigationLabel = getTemplateNavigationLabel(selectedTemplate?.value);
  const conceptStyle = [
    `--concept-bg:${siteBackgroundColor.value}`,
    `--concept-ink:${siteTextColor.value}`,
    `--concept-accent:${siteAccentColor.value}`
  ].join(";");

  templatePreview.innerHTML = `
    <div class="template-preview-header">
      <strong>${escapeHTML(selectedTemplate?.label || "Diseño personalizado")}</strong>
      <span>${workingSections.length} secciones</span>
    </div>
    <p>${escapeHTML(selectedTemplate?.description || "Edita cada bloque de la página de forma independiente.")}</p>
    <div class="template-concept ${templateClass}" style="${escapeHTML(conceptStyle)}" aria-label="Vista conceptual de ${escapeHTML(selectedTemplate?.label || "la plantilla")}">
      <div class="template-concept-nav"><i></i><span></span><span></span><b>${escapeHTML(navigationLabel)}</b></div>
      <div class="template-concept-stage">
        <div class="template-concept-copy"><small>${escapeHTML(businessType.options[businessType.selectedIndex]?.text || "Tienda")}</small><strong>${escapeHTML(selectedTemplate?.label || "Diseño")}</strong><span></span><button type="button" tabindex="-1">Explorar</button></div>
        <div class="template-concept-object"><i></i><i></i><i></i></div>
      </div>
      <div class="template-concept-grid"><i></i><i></i><i></i></div>
    </div>
    ${images[0] ? `<div class="template-preview-image"><img src="${escapeHTML(resolveAssetUrl(images[0]))}" alt=""></div>` : ""}
    <div class="template-section-list">
      ${workingSections.map(item => `<span>${escapeHTML(item.title || item.type)}</span>`).join("")}
    </div>
  `;

  renderSectionList();
  renderSectionImages();
  scheduleLivePreview();
}


function getTemplateNavigationLabel(templateValue){
  if(["restaurant_2","professional_2","boutique_grid_1"].includes(templateValue)) return "Navegación lateral";
  if(["appointments_3","mobile_first_1","streetwear_drop_1"].includes(templateValue)) return "Navegación inferior";
  if(["restaurant_3","appointments_2","professional_3","ecommerce_default"].includes(templateValue)) return "Navegación flotante";
  return "Navegación superior";
}

function getTemplateDefaultColors(templateValue){
  const key = String(templateValue || "");
  const defaults = {
    ecommerce_default:{ background:"#eef2ff", text:"#101828", accent:"#5b5cf0" },
    fashion_editorial_1:{ background:"#f4efe9", text:"#1b1816", accent:"#1b1816" },
    fashion_editorial_2:{ background:"#f8f8f6", text:"#1b1816", accent:"#cf315c" },
    streetwear_drop_1:{ background:"#dfff00", text:"#090909", accent:"#111111" },
    gym_active_1:{ background:"#080c12", text:"#f5fbff", accent:"#55ff9a" },
    luxury_minimal_1:{ background:"#f6f3ed", text:"#16130f", accent:"#a27b3c" },
    restaurant_4:{ background:"#fff8e7", text:"#201109", accent:"#e54819" },
    professional_2:{ background:"#0c1019", text:"#f6f7fb", accent:"#7c5cff" },
    professional_3:{ background:"#ffffff", text:"#17211d", accent:"#087f5b" }
  };

  return defaults[key] || { background:"#f5f7fb", text:"#101828", accent:"#6d5dfc" };
}


function renderTemplateGallery(){
  if(!templateGallery) return;

  templateGallery.innerHTML = getTemplateOptions().map((option,index) => {
    const templateClass = `template-${option.value.replaceAll("_","-")}`;
    const selected = option.value === templateKey.value;
    return `
      <button type="button" class="template-choice-card ${templateClass} ${selected ? "selected" : ""}" data-template-choice="${option.value}" role="option" aria-selected="${selected}">
        <span class="template-choice-scene"><i></i><i></i><i></i><b>${index + 1}</b></span>
        <strong>${escapeHTML(option.label)}</strong>
        <small>${escapeHTML(getTemplateNavigationLabel(option.value))}</small>
      </button>
    `;
  }).join("");
}


function renderTemplateOptions(selectedValue){

  const options =
    getTemplateOptions();

  templateKey.innerHTML =
    options
      .map(option=>`
        <option value="${option.value}">
          ${option.label}
        </option>
      `)
      .join("");

  const nextValue =
    options.some(
      option => option.value === selectedValue
    )
    ? selectedValue
    : options[0].value;

  templateKey.value =
    nextValue;

  renderTemplateGallery();
  updateTemplatePreview();

}


async function loadStore(){

  const data =
    await adminRequest(
      "/admin/store"
    );

  renderStore(
    data.store || {}
  );

}


async function saveExperience(event){

  event.preventDefault();
  const saveButton = document.getElementById("save-experience-btn");

  if(saveButton?.disabled) return;

  const originalText = saveButton?.textContent || "Guardar experiencia";
  if(saveButton){
    saveButton.disabled = true;
    saveButton.textContent = "Guardando...";
  }

  try{
    await adminRequest(
      "/admin/store",
      {
        method:"PATCH",
        headers:{
          "Content-Type":"application/json"
        },
        body:JSON.stringify({
          business_type:businessType.value,
          template_key:templateKey.value,
          homepage_sections:buildHomepageSections(),
          custom_domain:customDomain.value.trim()
        })
      }
    );

    showMessage(
      "Experiencia actualizada"
    );

    await loadStore();
  }finally{
    if(saveButton){
      saveButton.disabled = false;
      saveButton.textContent = originalText;
    }
  }

}


async function uploadStoreImage(kind,file){

  if(!file) return;

  const formData =
    new FormData();

  formData.append(
    kind,
    file
  );

  await adminRequest(
    `/admin/store/${kind}`,
    {
      method:"POST",
      body:formData
    }
  );

  showMessage(
    `${kind === "logo" ? "Logo" : "Hero"} actualizado`
  );

  await loadStore();

}


async function uploadSectionImages(files){
  const selectedFiles = Array.from(files || []).slice(0,8);
  if(!selectedFiles.length) return;

  syncActiveSectionFromInputs();
  const section = workingSections[activeSectionIndex];
  const uploaded = [];

  for(const file of selectedFiles){
    const formData = new FormData();
    formData.append("image",file);

    const data = await adminRequest(
      "/admin/uploads",
      { method:"POST", body:formData }
    );

    const image = data.image_url || data.url;
    if(image) uploaded.push(image);
  }

  section.images = [
    ...sectionImageList(section),
    ...uploaded
  ].filter((image,index,array) => array.indexOf(image) === index).slice(0,8);
  section.image_url = section.images[0] || "";
  sectionImageUrl.value = section.image_url;

  updateTemplatePreview();
  showMessage(
    `${uploaded.length} imagen${uploaded.length === 1 ? "" : "es"} lista${uploaded.length === 1 ? "" : "s"}. Guarda para publicar.`
  );
}


businessType.addEventListener(
  "change",
  () => {
    const siteDraft = readSiteEditor();
    renderTemplateOptions();
    setSectionEditorFromSections(
      getSelectedTemplate()?.sections
    );
    const colors = getTemplateDefaultColors(templateKey.value);
    writeSiteEditor(siteDraft);
    siteBackgroundColor.value = colors.background;
    siteTextColor.value = colors.text;
    siteAccentColor.value = colors.accent;
    updateTemplatePreview();
  }
);

templateKey.addEventListener(
  "change",
  () => {
    const siteDraft = readSiteEditor();
    setSectionEditorFromSections(
      getSelectedTemplate()?.sections
    );
    const colors = getTemplateDefaultColors(templateKey.value);
    writeSiteEditor(siteDraft);
    siteBackgroundColor.value = colors.background;
    siteTextColor.value = colors.text;
    siteAccentColor.value = colors.accent;
    renderTemplateGallery();
    updateTemplatePreview();
  }
);

templateGallery?.addEventListener("click",event => {
  const choice = event.target.closest("[data-template-choice]");
  if(!choice) return;
  templateKey.value = choice.dataset.templateChoice;
  templateKey.dispatchEvent(new Event("change"));
});

[
  sectionType,
  sectionTitle,
  sectionKicker,
  sectionText,
  sectionImageUrl,
  sectionCta,
  sectionLayout,
  sectionBackground,
  sectionTextColor
].forEach(input => {

  input.addEventListener(
    "input",
    updateTemplatePreview
  );

});

[siteTheme,siteBackgroundColor,siteTextColor,siteAccentColor,siteDisplayName,siteHeroTitle,siteHeroText].forEach(input => {
  input.addEventListener("input",updateTemplatePreview);
  input.addEventListener("change",updateTemplatePreview);
});

document
  .getElementById("experience-form")
  .addEventListener(
    "submit",
    event => runSafely(
      () => saveExperience(event)
    )
  );

document
  .getElementById("logo-input")
  .addEventListener(
    "change",
    event => runSafely(
      () => uploadStoreImage(
        "logo",
        event.target.files[0]
      )
    )
  );

document
  .getElementById("hero-input")
  .addEventListener(
    "change",
    event => runSafely(
      () => uploadStoreImage(
        "hero",
        event.target.files[0]
      )
    )
  );

sectionImageInput.addEventListener(
  "change",
  event => runSafely(
    () => uploadSectionImages(
      event.target.files
    )
  )
);

sectionList.addEventListener("click",event => {
  const button = event.target.closest("[data-section-index]");
  if(!button) return;

  syncActiveSectionFromInputs();
  activeSectionIndex = Number(button.dataset.sectionIndex);
  loadActiveSection();
  updateTemplatePreview();
});

sectionImages.addEventListener("click",event => {
  const button = event.target.closest("[data-remove-image]");
  if(!button) return;

  syncActiveSectionFromInputs();
  const section = workingSections[activeSectionIndex];
  const images = sectionImageList(section);
  images.splice(Number(button.dataset.removeImage),1);
  section.images = images;
  section.image_url = images[0] || "";
  sectionImageUrl.value = section.image_url;
  updateTemplatePreview();
});

document.getElementById("add-section-btn").addEventListener("click",() => {
  syncActiveSectionFromInputs();
  workingSections.push({
    type:"image_banner",
    title:"Nueva sección",
    text:"Describe aquí esta parte de tu página.",
    images:[],
    styles:{ background_color:"#ffffff", text_color:"#111827" }
  });
  activeSectionIndex = workingSections.length - 1;
  loadActiveSection();
  updateTemplatePreview();
});

document.getElementById("duplicate-section").addEventListener("click",() => {
  syncActiveSectionFromInputs();
  const copy = cloneSections([workingSections[activeSectionIndex]])[0];
  copy.title = `${copy.title || "Sección"} copia`;
  workingSections.splice(activeSectionIndex + 1,0,copy);
  activeSectionIndex += 1;
  loadActiveSection();
  updateTemplatePreview();
});

document.getElementById("remove-section").addEventListener("click",() => {
  if(workingSections.length === 1){
    showMessage("La página debe conservar al menos una sección.","error");
    return;
  }

  workingSections.splice(activeSectionIndex,1);
  activeSectionIndex = Math.min(activeSectionIndex,workingSections.length - 1);
  loadActiveSection();
  updateTemplatePreview();
});

function moveActiveSection(direction){
  syncActiveSectionFromInputs();
  const nextIndex = activeSectionIndex + direction;
  if(nextIndex < 0 || nextIndex >= workingSections.length) return;

  [workingSections[activeSectionIndex],workingSections[nextIndex]] =
    [workingSections[nextIndex],workingSections[activeSectionIndex]];
  activeSectionIndex = nextIndex;
  loadActiveSection();
  updateTemplatePreview();
}

document.getElementById("move-section-up").addEventListener("click",() => moveActiveSection(-1));
document.getElementById("move-section-down").addEventListener("click",() => moveActiveSection(1));

document.querySelectorAll("[data-preview-size]").forEach(button => {
  button.addEventListener("click",() => {
    document.querySelectorAll("[data-preview-size]").forEach(item => item.classList.toggle("active",item === button));
    document.getElementById("live-preview-shell").classList.toggle("mobile",button.dataset.previewSize === "mobile");
  });
});

function openMobilePreview(){
  document.body.classList.add("mobile-preview-open");
  document.querySelectorAll("[data-preview-size]").forEach(item =>
    item.classList.toggle("active",item.dataset.previewSize === "mobile")
  );
  document.getElementById("live-preview-shell")?.classList.add("mobile");
  postLivePreview();
}

function closeMobilePreview(){
  document.body.classList.remove("mobile-preview-open");
}

document.getElementById("mobile-preview-toggle")?.addEventListener("click",openMobilePreview);
document.getElementById("mobile-preview-close")?.addEventListener("click",closeMobilePreview);
document.addEventListener("keydown",event => {
  if(event.key === "Escape") closeMobilePreview();
});

window.addEventListener("message",event => {
  if(
    event.origin === window.location.origin &&
    event.source === livePreview?.contentWindow &&
    event.data?.type === "mercadia:preview-ready"
  ){
    postLivePreview();
  }
});

livePreview?.addEventListener("load",() => {
  postLivePreview();
  setTimeout(postLivePreview,180);
  setTimeout(postLivePreview,600);
});

try{

  await loadStore();

}catch(err){

  console.error(err);
  showMessage(
    err.message,
    "error"
  );

}
