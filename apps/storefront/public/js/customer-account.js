import { getStore } from "./api.js";
import {
  getCustomerSession,
  setCustomerSession,
  clearCustomerSession,
  saveCustomerProfile
} from "./customer-session.js";

const API_BASE =
  window.MERCADIA_CONFIG?.API_URL ||
  (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
      ? "http://localhost:3000/api"
      : "https://mercadia-back-production.up.railway.app/api"
  );

const BACKEND_ORIGIN =
  API_BASE.replace(/\/api\/?$/, "");

const THEME_KEYS = [
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

const state = {
  store: null,
  session: null,
  customer: null,
  orders: [],
  activeTab: "login"
};

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

  return `${BACKEND_ORIGIN}/uploads/${value}`;

}

function getSlugFromDomain(){

  const params =
    new URLSearchParams(
      window.location.search
    );

  const slugParam =
    params.get("slug") ||
    params.get("store");

  if(slugParam){
    return slugParam;
  }

  const host =
    window.location.hostname;

  if(
    host === "localhost" ||
    host === "127.0.0.1"
  ){
    return "chelispa";
  }

  return host.split(".")[0];

}

function keepLocalSlugInLinks(slug){

  if(!slug) return;

  document
    .querySelectorAll(
      'a[href="/index.html"], a[href="/"], a[href="/products.html"], a[href="/categorias.html"], a[href="/mi-cuenta.html"]'
    )
    .forEach(link => {
      const originalPath =
        link.getAttribute("href");

      if(
        originalPath === "/" ||
        originalPath === "/index.html"
      ){
        link.href =
          `/tienda/${encodeURIComponent(slug)}`;
        return;
      }

      const url = new URL(
        originalPath,
        window.location.origin
      );

      url.searchParams.set(
        "slug",
        slug
      );

      link.href =
        url.pathname + url.search;
    });

}

function applyStoreTheme(store){

  THEME_KEYS.forEach(theme => {
    document.body.classList.remove(
      `theme-${theme}`
    );
  });

  if(
    store?.theme &&
    THEME_KEYS.includes(store.theme)
  ){
    document.body.classList.add(
      `theme-${store.theme}`
    );
  }

}

function formatMoney(value){

  return new Intl.NumberFormat(
    "es-MX",
    {
      style: "currency",
      currency: "MXN"
    }
  ).format(
    Number(value || 0)
  );

}

function formatDate(value){

  if(!value){
    return "-";
  }

  return new Date(value)
    .toLocaleString("es-MX", {
      dateStyle: "medium",
      timeStyle: "short"
    });

}

function getStatusLabel(status){

  const labels = {
    PENDING: "Pendiente",
    PAID: "Confirmado",
    PREPARING: "En preparacion",
    SHIPPED: "En camino",
    DELIVERED: "Entregado",
    CANCELLED: "Cancelado"
  };

  return labels[String(status || "").toUpperCase()] || status || "-";

}

async function customerRequest(
  endpoint,
  options = {}
){

  try{
    const response = await fetch(
      API_BASE + endpoint,
      {
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {})
        },
        ...options
      }
    );

    const data =
      await response.json()
        .catch(() => null);

    if(!response.ok){
      return {
        success: false,
        error:
          data?.error ||
          data?.detail ||
          "No se pudo procesar la solicitud"
      };
    }

    return data;
  }catch(error){
    console.error(
      "Customer request error:",
      error
    );

    return {
      success: false,
      error:
        "No se pudo conectar con el servidor"
    };
  }

}

async function refreshCustomerSession(){
  if(!state.session?.refresh_token){
    return false;
  }

  const data = await customerRequest(
    "/customer-auth/refresh",
    {
      method: "POST",
      body: JSON.stringify({
        refresh_token:
          state.session.refresh_token
      })
    }
  );

  if(!data?.success || !data.token){
    return false;
  }

  state.session = {
    ...state.session,
    ...data
  };
  setCustomerSession(state.session);
  return true;
}

async function ensureFreshSession(){
  if(!state.session?.token){
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  if(
    state.session.expires_at &&
    Number(state.session.expires_at) <= now + 60
  ){
    return refreshCustomerSession();
  }

  return true;
}

function authHeaders(){
  return {
    Authorization:
      `Bearer ${state.session.token}`,
    "X-Store-Id":
      String(state.store.id)
  };
}

function accountRedirectUrl(){
  const url = new URL(
    "/mi-cuenta.html",
    window.location.origin
  );
  url.searchParams.set(
    "slug",
    state.store.slug || getSlugFromDomain()
  );
  return url.toString();
}

function consumeSupabaseRedirect(){
  const hash = new URLSearchParams(
    window.location.hash.replace(/^#/, "")
  );
  const token = hash.get("access_token");

  if(!token){
    return null;
  }

  const expiresIn = Number(
    hash.get("expires_in") || 3600
  );
  const session = {
    token,
    refresh_token:
      hash.get("refresh_token"),
    expires_in: expiresIn,
    expires_at:
      Math.floor(Date.now() / 1000) + expiresIn,
    store_id: state.store.id
  };

  window.history.replaceState(
    {},
    document.title,
    window.location.pathname + window.location.search
  );

  return {
    session,
    recovery:
      hash.get("type") === "recovery"
  };
}

function setMessage(message, type = "neutral"){

  const box =
    document.getElementById("account-message");

  if(!box){
    return;
  }

  box.textContent =
    message || "";

  box.dataset.state =
    type;
}

function setActiveTab(tab){

  state.activeTab = tab;

  document
    .querySelectorAll("[data-account-tab]")
    .forEach(button => {
      button.classList.toggle(
        "account-tab-active",
        button.dataset.accountTab === tab
      );
    });

  document
    .querySelectorAll("[data-account-panel]")
    .forEach(panel => {
      panel.classList.toggle(
        "hidden",
        panel.dataset.accountPanel !== tab
      );
    });

}

function renderOrders(){

  const list =
    document.getElementById(
      "account-orders-list"
    );

  if(!list){
    return;
  }

  if(!state.orders.length){
    list.innerHTML = `
      <div class="account-empty">
        Todavia no tienes pedidos registrados.
      </div>
    `;
    return;
  }

  list.innerHTML =
    state.orders.map(order => {
      const itemsHTML =
        (order.items || [])
          .map(item => `
            <li>
              <span>${item.product_name || "Producto"}</span>
              <strong>${item.quantity} x ${formatMoney(item.price)}</strong>
            </li>
          `)
          .join("");

      return `
        <article class="account-order-card">
          <div class="account-order-head">
            <div>
              <p class="account-order-kicker">Pedido #${order.id}</p>
              <h3>${getStatusLabel(order.status)}</h3>
            </div>
            <strong>${formatMoney(order.total)}</strong>
          </div>
          <p class="account-order-meta">
            Creado: ${formatDate(order.created_at)}
          </p>
          <ul class="account-order-items">
            ${itemsHTML}
          </ul>
        </article>
      `;
    }).join("");

}

function renderDashboard(){

  const authSection =
    document.getElementById(
      "account-auth-section"
    );

  const dashboard =
    document.getElementById(
      "account-dashboard"
    );

  if(!authSection || !dashboard){
    return;
  }

  if(!state.customer){
    authSection.classList.remove("hidden");
    dashboard.classList.add("hidden");
    return;
  }

  authSection.classList.add("hidden");
  dashboard.classList.remove("hidden");

  document.getElementById(
    "account-customer-name"
  ).textContent =
    state.customer.name || "Cliente";

  document.getElementById(
    "account-customer-phone"
  ).textContent =
    state.customer.phone || "-";

  document.getElementById(
    "account-total-orders"
  ).textContent =
    String(
      Number(
        state.customer.total_orders || 0
      )
    );

  document.getElementById(
    "account-total-spent"
  ).textContent =
    formatMoney(
      state.customer.total_spent || 0
    );

  document.getElementById(
    "account-last-login"
  ).textContent =
    formatDate(
      state.customer.last_login_at
    );

  renderOrders();
}

async function loadCustomerData(){

  if(!state.session?.token){
    state.customer = null;
    state.orders = [];
    renderDashboard();
    return;
  }

  if(!await ensureFreshSession()){
    clearCustomerSession();
    state.session = null;
    state.customer = null;
    state.orders = [];
    renderDashboard();
    return;
  }

  const headers = authHeaders();

  const [meData, ordersData] =
    await Promise.all([
      customerRequest(
        "/customer-auth/me",
        { headers }
      ),
      customerRequest(
        "/customer-auth/orders",
        { headers }
      )
    ]);

  if(!meData?.success){
    clearCustomerSession();
    state.session = null;
    state.customer = null;
    state.orders = [];
    renderDashboard();
    setMessage(
      "Tu sesion vencio. Vuelve a iniciar sesion.",
      "error"
    );
    return;
  }

  state.customer =
    meData.customer || null;

  state.orders =
    ordersData?.orders || [];

  saveCustomerProfile(
    state.store?.id,
    {
      name:
        state.customer?.name,
      phone:
        state.customer?.phone,
      address:
        state.customer?.address
    }
  );

  renderDashboard();
}

async function handleRegister(event){

  event.preventDefault();

  if(!state.store?.id){
    setMessage(
      "La tienda aun no esta lista.",
      "error"
    );
    return;
  }

  const form =
    event.currentTarget;

  const name =
    form.querySelector('[name="name"]').value.trim();
  const phone =
    form.querySelector('[name="phone"]').value.trim();
  const email =
    form.querySelector('[name="email"]').value.trim();
  const password =
    form.querySelector('[name="password"]').value;

  const data =
    await customerRequest(
      "/customer-auth/register",
      {
        method: "POST",
        body: JSON.stringify({
          store_id: state.store.id,
          name,
          phone,
          email,
          password,
          redirect_to:
            accountRedirectUrl()
        })
      }
    );

  if(!data?.success){
    setMessage(
      data?.error ||
      "No se pudo crear la cuenta.",
      "error"
    );
    return;
  }

  if(data.email_confirmation_required && !data.token){
    setMessage(
      "Revisa tu correo y confirma la cuenta antes de iniciar sesion.",
      "success"
    );
    form.reset();
    setActiveTab("login");
    return;
  }

  state.session = {
    ...data,
    store_id: state.store.id,
    customer: data.customer
  };

  setCustomerSession(
    state.session
  );

  setMessage(
    "Cuenta creada. Ya puedes revisar tus pedidos.",
    "success"
  );

  form.reset();
  await loadCustomerData();
}

async function handleLogin(event){

  event.preventDefault();

  if(!state.store?.id){
    setMessage(
      "La tienda aun no esta lista.",
      "error"
    );
    return;
  }

  const form =
    event.currentTarget;

  const email =
    form.querySelector('[name="email"]').value.trim();
  const password =
    form.querySelector('[name="password"]').value;

  const data =
    await customerRequest(
      "/customer-auth/login",
      {
        method: "POST",
        body: JSON.stringify({
          store_id: state.store.id,
          email,
          password
        })
      }
    );

  if(!data?.success){
    setMessage(
      data?.error ||
      "No se pudo iniciar sesion.",
      "error"
    );
    return;
  }

  state.session = {
    ...data,
    store_id: state.store.id,
    customer: data.customer
  };

  setCustomerSession(
    state.session
  );

  setMessage(
    "Sesion iniciada.",
    "success"
  );

  form.reset();
  await loadCustomerData();
}

async function handleLogout(){

  try{
    const registration =
      await navigator.serviceWorker?.ready;
    const subscription =
      await registration?.pushManager?.getSubscription();

    if(subscription && state.session?.token){
      await customerRequest(
        "/customer-auth/push/unsubscribe",
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            endpoint: subscription.endpoint
          })
        }
      );
      await subscription.unsubscribe();
    }
  }catch(error){
    console.error("No se pudo retirar push:", error);
  }

  clearCustomerSession();
  state.session = null;
  state.customer = null;
  state.orders = [];
  renderDashboard();
  setActiveTab("login");
  setMessage(
    "Sesion cerrada.",
    "neutral"
  );

}

function showSpecialPanel(panelId){
  document
    .querySelectorAll("[data-account-panel]")
    .forEach(panel => panel.classList.add("hidden"));

  document
    .getElementById("account-forgot-panel")
    ?.classList.toggle(
      "hidden",
      panelId !== "account-forgot-panel"
    );

  document
    .getElementById("account-reset-panel")
    ?.classList.toggle(
      "hidden",
      panelId !== "account-reset-panel"
    );
}

function showLoginPanel(){
  document
    .getElementById("account-forgot-panel")
    ?.classList.add("hidden");
  document
    .getElementById("account-reset-panel")
    ?.classList.add("hidden");
  setActiveTab("login");
}

async function handleForgotPassword(event){
  event.preventDefault();
  const form = event.currentTarget;
  const email = form
    .querySelector('[name="email"]')
    .value.trim();

  const data = await customerRequest(
    "/customer-auth/forgot-password",
    {
      method: "POST",
      body: JSON.stringify({
        email,
        redirect_to: accountRedirectUrl()
      })
    }
  );

  if(!data?.success){
    setMessage(data?.error || "No se pudo enviar el correo.", "error");
    return;
  }

  setMessage(data.message, "success");
  form.reset();
  showLoginPanel();
}

async function handleResetPassword(event){
  event.preventDefault();
  const password = event.currentTarget
    .querySelector('[name="password"]')
    .value;

  const data = await customerRequest(
    "/customer-auth/update-password",
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ password })
    }
  );

  if(!data?.success){
    setMessage(data?.error || "No se pudo cambiar la contrasena.", "error");
    return;
  }

  setMessage("Contrasena actualizada. Tu sesion ya esta activa.", "success");
  event.currentTarget.reset();
  await loadCustomerData();
}

function bindEvents(){

  document
    .querySelectorAll("[data-account-tab]")
    .forEach(button => {
      button.addEventListener(
        "click",
        () => setActiveTab(
          button.dataset.accountTab
        )
      );
    });

  document
    .getElementById("account-login-form")
    ?.addEventListener(
      "submit",
      handleLogin
    );

  document
    .getElementById("account-register-form")
    ?.addEventListener(
      "submit",
      handleRegister
    );

  document
    .getElementById("account-logout-btn")
    ?.addEventListener(
      "click",
      handleLogout
    );

  document
    .getElementById("account-forgot-btn")
    ?.addEventListener(
      "click",
      () => showSpecialPanel("account-forgot-panel")
    );

  document
    .getElementById("account-back-login-btn")
    ?.addEventListener(
      "click",
      showLoginPanel
    );

  document
    .getElementById("account-forgot-form")
    ?.addEventListener(
      "submit",
      handleForgotPassword
    );

  document
    .getElementById("account-reset-form")
    ?.addEventListener(
      "submit",
      handleResetPassword
    );

  const menuButton =
    document.getElementById("menu-btn");
  const mobileMenu =
    document.getElementById("mobile-menu");

  menuButton?.addEventListener(
    "click",
    () => mobileMenu?.classList.toggle("hidden")
  );

}

async function init(){

  bindEvents();
  setActiveTab("login");

  const slug =
    getSlugFromDomain();

  keepLocalSlugInLinks(slug);

  const store =
    await getStore(slug);

  if(!store){
    setMessage(
      "No se pudo cargar la tienda.",
      "error"
    );
    return;
  }

  state.store = store;
  state.session =
    getCustomerSession(store.id);

  const redirect = consumeSupabaseRedirect();
  if(redirect){
    state.session = redirect.session;
    setCustomerSession(state.session);

    if(redirect.recovery){
      showSpecialPanel("account-reset-panel");
      setMessage(
        "Escribe una nueva contrasena para terminar la recuperacion.",
        "neutral"
      );
    }else{
      setMessage(
        "Correo confirmado correctamente.",
        "success"
      );
    }
  }

  document.title =
    `${store.name || "Mercadia"} | Mi cuenta`;

  const name =
    document.getElementById("store-name");
  const logo =
    document.getElementById("store-logo");
  const title =
    document.getElementById("account-store-title");

  if(name){
    name.textContent =
      store.name || "Tienda";
  }

  if(logo){
    logo.src =
      resolveAssetUrl(
        store.logo,
        "/icons/mercadia-app.png"
      );
  }

  if(title){
    title.textContent =
      store.name || "Tu tienda";
  }

  applyStoreTheme(store);

  if(redirect?.recovery){
    return;
  }

  await loadCustomerData();
}

document.addEventListener(
  "DOMContentLoaded",
  init
);
