import { getStore } from "./api.js";
import { renderStorefrontExperience } from "./storefront-renderer.js";

let editorDraftStore = null;
let storeInitialized = false;
import { initPromotionPopup } from "./promotion-popup.js";
import { initChatbot } from "./chatbot.js";

let storeData = null;

const BACKEND_ORIGIN =
  window.MERCADIA_CONFIG?.BACKEND_ORIGIN ||
  window.MERCADIA_CONFIG?.API_URL?.replace(/\/api\/?$/, "") ||
  "https://mercadia-back-production.up.railway.app";

const BACKEND_UPLOADS_URL =
  `${BACKEND_ORIGIN}/uploads/`;

function resolveAssetUrl(asset, fallback){

if(!asset){
return fallback;
}

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

return BACKEND_UPLOADS_URL + value;

}


// =================================
// OBTENER SLUG DESDE DOMINIO
// =================================

function getSlugFromDomain(){

const pathMatch = window.location.pathname.match(/^\/tienda\/([^/]+)/i);
if(pathMatch?.[1]){
return decodeURIComponent(pathMatch[1]);
}

const params = new URLSearchParams(window.location.search);
const slugParam = params.get("slug") || params.get("store");

if(slugParam){
console.log("SLUG FROM URL:", slugParam);
return slugParam;
}

const host = window.location.hostname;

console.log("HOST:", host);

// entorno local
if(host === "localhost" || host === "127.0.0.1"){

console.log("LOCAL ENVIRONMENT");
return "chelispa";

}

const parts = host.split(".");

// si hay más subdominios tomar el primero
const slug = parts[0];

console.log("DETECTED SLUG:", slug);

return slug;

}

function keepLocalSlugInLinks(slug){

if(!slug) return;

document
.querySelectorAll(
  'a[href="/index.html"], a[href="/"], a[href="/products.html"], a[href="/categorias.html"], a[href="/mi-cuenta.html"]'
)
.forEach(link => {

const originalPath = link.getAttribute("href");

if(originalPath === "/" || originalPath === "/index.html"){
link.href = `/tienda/${encodeURIComponent(slug)}`;
return;
}

const url = new URL(
  originalPath,
  window.location.origin
);

url.searchParams.set("slug", slug);

link.href =
  url.pathname + url.search;

});

}


// =================================
// INICIALIZAR TIENDA
// =================================

async function initStore(){

try{

const slug = getSlugFromDomain();

keepLocalSlugInLinks(slug);

console.log("LOADING STORE:", slug);

const store = await getStore(slug);

if(!store){

document.body.innerHTML = `
<div style="text-align:center;margin-top:100px;font-family:sans-serif;">
<h1>Tienda no encontrada</h1>
<p>El dominio no corresponde a ninguna tienda.</p>
</div>
`;

return;

}

const siteSettings = Array.isArray(store.homepage_sections)
  ? store.homepage_sections.find(section => section?.type === "site_settings")
  : null;

if(siteSettings){
  if(siteSettings.display_name) store.name = siteSettings.display_name;
  if(siteSettings.theme) store.theme = siteSettings.theme;
  if(siteSettings.hero_title) store.hero_title = siteSettings.hero_title;
  if(siteSettings.hero_text) store.hero_text = siteSettings.hero_text;
}

storeData = store;


// =================================
// VARIABLES GLOBALES
// =================================

window.store = store;
window.STORE = store;

window.store_id = store.id;
window.store_whatsapp = store.whatsapp;

console.log("STORE DATA:", store);


// =================================
// TITULO PAGINA
// =================================

document.title = store.name || "Mercadia";


// =================================
// THEME DESDE DATABASE (FIX REAL)
// =================================

const validThemes = [
"luxury",
"modern",
"street",
"minimal",
"black",
"gray",
"earth",
"tenis",
"lujo",
"velour"
];

// 🔥 LIMPIAR THEMES ANTES
validThemes.forEach(t => {
document.body.classList.remove(`theme-${t}`);
});

// 🔥 APLICAR SOLO UNO
if(store.theme && validThemes.includes(store.theme)){

document.body.classList.add(`theme-${store.theme}`);

console.log("THEME APPLIED:", store.theme);

}


// =================================
// NOMBRE TIENDA
// =================================

const title = document.getElementById("store-name");

if(title && store.name){

title.textContent = store.name;

}


// =================================
// LOGO
// =================================

const logo = document.getElementById("store-logo");

if(logo){

logo.src =
resolveAssetUrl(
  store.logo,
  "/icons/mercadia-app.png"
);

}


// =================================
// HERO TEXTO
// =================================

const heroTitle = document.getElementById("hero-title");
const heroText = document.getElementById("hero-text");

if(heroTitle && store.hero_title){

heroTitle.textContent = store.hero_title;

}

if(heroText && store.hero_text){

heroText.textContent = store.hero_text;

}


// =================================
// HERO IMAGEN
// =================================

const hero = document.getElementById("hero-image");

if(hero){

hero.src =
resolveAssetUrl(
  store.hero,
  "/assets/images/hero-default.jpg"
);

}


// =================================
// RENDER STOREFRONT
// =================================

await renderStorefrontExperience({
store,
slug
});


// =================================
// PROMOCION ACTIVA
// =================================

initPromotionPopup(slug);


// =================================
// INICIAR CHATBOT (POR TIENDA)
// =================================

initChatbot();

storeInitialized = true;

if(editorDraftStore){
  await applyEditorPreview(editorDraftStore);
}

if(
  window.parent !== window &&
  new URLSearchParams(window.location.search).has("editor")
){
  window.parent.postMessage(
    { type:"mercadia:preview-ready" },
    window.location.origin
  );
}

}catch(error){

console.error("STORE INIT ERROR:", error);

document.body.innerHTML = `
<div style="text-align:center;margin-top:100px;font-family:sans-serif;">
<h1>Error cargando tienda</h1>
<p>Intenta recargar la página.</p>
</div>
`;

}

}


async function applyEditorPreview(previewStore){
  if(!previewStore || typeof previewStore !== "object") return;

  const store = {
    ...(storeData || {}),
    ...previewStore
  };
  const slug = getSlugFromDomain();
  const previewThemes = [
    "luxury","modern","street","minimal","black",
    "gray","earth","tenis","lujo","velour"
  ];

  storeData = store;
  window.store = store;
  window.STORE = store;

  previewThemes.forEach(theme =>
    document.body.classList.remove(`theme-${theme}`)
  );
  if(previewThemes.includes(store.theme)){
    document.body.classList.add(`theme-${store.theme}`);
  }

  document.title = `${store.name || "Mercadia"} · Vista previa`;

  const title = document.getElementById("store-name");
  if(title) title.textContent = store.name || "Mercadia";

  const logo = document.getElementById("store-logo");
  if(logo) logo.src = resolveAssetUrl(store.logo,"/icons/mercadia-app.png");

  const heroTitle = document.getElementById("hero-title");
  if(heroTitle) heroTitle.textContent = store.hero_title || store.name || "";

  const heroText = document.getElementById("hero-text");
  if(heroText && store.hero_text) heroText.textContent = store.hero_text;

  const hero = document.getElementById("hero-image");
  if(hero) hero.src = resolveAssetUrl(store.hero,"/assets/images/hero-default.jpg");

  await renderStorefrontExperience({ store, slug });
}

window.addEventListener("message",event => {
  if(
    !new URLSearchParams(window.location.search).has("editor") ||
    event.origin !== window.location.origin ||
    event.source !== window.parent ||
    event.data?.type !== "mercadia:preview-store"
  ){
    return;
  }

  editorDraftStore = event.data.store;

  if(!storeInitialized){
    return;
  }

  applyEditorPreview(editorDraftStore).catch(error =>
    console.error("STORE PREVIEW ERROR:",error)
  );
});


// =================================
// INICIO
// =================================

document.addEventListener("DOMContentLoaded", initStore);
