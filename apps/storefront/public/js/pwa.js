import { getCustomerSession } from "./customer-session.js";

const API_BASE =
  window.MERCADIA_CONFIG?.API_URL ||
  "https://mercadia-back-production.up.railway.app/api";

let deferredInstallPrompt = null;
let registration = null;

function base64ToBytes(value){
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(char => char.charCodeAt(0)));
}

function getStoreId(){
  const session = getCustomerSession();
  return session?.store_id || sessionStorage.getItem("store_id");
}


let merchantWatcherStarted = false;
let merchantLastOrderId = null;

async function fetchMerchantOrders(){
  const token = localStorage.getItem("mercadia_admin_token");
  if(!token) return [];

  const response = await fetch(`${API_BASE}/orders`,{
    cache:"no-store",
    headers:{ Authorization:`Bearer ${token}` }
  });
  if(!response.ok) return [];
  const data = await response.json().catch(() => null);
  return Array.isArray(data?.orders) ? data.orders : [];
}

async function notifyLatestMerchantOrder(order){
  if(!order || Notification.permission !== "granted" || !registration) return;
  const customer = String(order.customer_name || "").trim();
  await registration.showNotification("Nuevo pedido",{
    body:customer ? `Nuevo pedido de ${customer} (#${order.id}).` : `Tienes un nuevo pedido #${order.id}.`,
    icon:"/icons/mercadia-app.png",
    badge:"/icons/mercadia-app.png",
    tag:`merchant-order-${order.id}`,
    renotify:true,
    data:{ url:"/admin/orders.html" }
  }).catch(() => {});
}

async function startMerchantOrderWatcher(){
  if(merchantWatcherStarted || !isMerchantContext() || Notification.permission !== "granted") return;
  merchantWatcherStarted = true;

  const prime = await fetchMerchantOrders().catch(() => []);
  merchantLastOrderId = Math.max(0,...prime.map(order => Number(order.id || 0)));

  window.setInterval(async () => {
    const orders = await fetchMerchantOrders().catch(() => []);
    const latest = orders
      .map(order => ({...order,id:Number(order.id || 0)}))
      .filter(order => order.id > Number(merchantLastOrderId || 0))
      .sort((a,b) => b.id - a.id)[0];

    if(!latest) return;
    merchantLastOrderId = latest.id;
    await notifyLatestMerchantOrder(latest);
  }, 25000);
}

function isMerchantContext(){
  return document.body.dataset.pwaContext === "platform";
}

function getActions(){
  let actions = document.getElementById("pwa-actions");
  if(actions) return actions;

  actions = document.createElement("div");
  actions.id = "pwa-actions";
  actions.className = "pwa-actions";

  if(isMerchantContext()){
    actions.classList.add("pwa-actions-admin");
    const content = document.querySelector(".content");
    const heading = content?.querySelector(".page-heading,.header,.os-heading-wrap");
    if(heading?.parentElement){
      heading.parentElement.insertBefore(actions, heading.nextSibling);
      return actions;
    }
  }

  document.body.append(actions);
  return actions;
}

function actionButton(id, label, handler){
  const actions = getActions();
  let button = document.getElementById(id);

  if(!button){
    button = document.createElement("button");
    button.id = id;
    button.type = "button";
    button.addEventListener("click", handler);
    actions.append(button);
  }

  button.textContent = label;
  return button;
}

async function enableNotifications(){
  const storeId = getStoreId();
  const session = getCustomerSession(storeId);

  if(!session?.token || !storeId){
    window.location.href = "/mi-cuenta.html" + window.location.search;
    return;
  }

  const permission = await Notification.requestPermission();
  if(permission !== "granted") return;

  const keyResponse = await fetch(
    `${API_BASE}/customer-auth/push/public-key`,
    { cache: "no-store" }
  );
  const keyData = await keyResponse.json();

  if(!keyResponse.ok || !keyData.public_key){
    throw new Error(keyData.error || "Notificaciones no disponibles");
  }

  const subscription =
    await registration.pushManager.getSubscription() ||
    await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64ToBytes(keyData.public_key)
    });

  const response = await fetch(
    `${API_BASE}/customer-auth/push/subscribe`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
        "X-Store-Id": String(storeId)
      },
      body: JSON.stringify({ subscription })
    }
  );

  if(!response.ok){
    const data = await response.json().catch(() => null);
    throw new Error(data?.error || "No se pudo activar");
  }

  actionButton(
    "pwa-notifications",
    "Notificaciones activadas",
    enableNotifications
  ).disabled = true;
}

async function enableMerchantNotifications(){
  const token = localStorage.getItem("mercadia_admin_token");
  const storeId = localStorage.getItem("mercadia_admin_store_id");

  if(!token || !storeId){
    throw new Error("Abre primero tu cuenta Mercadia para activar las alertas del negocio.");
  }

  const permission = await Notification.requestPermission();
  if(permission !== "granted") return;

  const keyResponse = await fetch(`${API_BASE}/customer-auth/push/public-key`,{ cache:"no-store" });
  const keyData = await keyResponse.json();
  if(!keyResponse.ok || !keyData.public_key){
    throw new Error(keyData.error || "Notificaciones no disponibles");
  }

  const subscription =
    await registration.pushManager.getSubscription() ||
    await registration.pushManager.subscribe({
      userVisibleOnly:true,
      applicationServerKey:base64ToBytes(keyData.public_key)
    });

  const response = await fetch(`${API_BASE}/admin/push/subscribe`,{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      Authorization:`Bearer ${token}`
    },
    body:JSON.stringify({ subscription })
  });

  if(!response.ok){
    const data = await response.json().catch(() => null);
    throw new Error(data?.error || "No se pudieron activar las alertas");
  }

  localStorage.setItem("mercadia_merchant_push_ready","1");
  startMerchantOrderWatcher().catch(error => console.error("PWA MERCHANT WATCH ERROR:",error));
  await registration.showNotification("Alertas de pedidos activadas",{
    body:"Este dispositivo ya recibirá los pedidos nuevos de tu tienda.",
    icon:"/icons/mercadia-app.png",
    badge:"/icons/mercadia-app.png",
    tag:"merchant-push-ready"
  }).catch(() => {});
  actionButton("pwa-notifications","Alertas de pedidos activadas",enableMerchantNotifications).disabled = true;
}

async function syncMerchantSubscription(subscription){
  const token = localStorage.getItem("mercadia_admin_token");
  if(!token || !subscription) return false;

  const response = await fetch(`${API_BASE}/admin/push/subscribe`,{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      Authorization:`Bearer ${token}`
    },
    body:JSON.stringify({ subscription })
  });

  return response.ok;
}

async function showMerchantNotifications(){
  if(
    document.body.dataset.pwaContext !== "platform" ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) return;

  if(window.adminSessionReady){
    await window.adminSessionReady.catch(() => false);
  }

  if(!localStorage.getItem("mercadia_admin_token")) return;

  const current = await registration?.pushManager?.getSubscription();
  let synced = false;

  if(current && Notification.permission === "granted"){
    synced = await syncMerchantSubscription(current).catch(error => {
      console.error("PWA MERCHANT SYNC ERROR:",error);
      return false;
    });
    if(synced){
      localStorage.setItem("mercadia_merchant_push_ready","1");
    }else{
      localStorage.removeItem("mercadia_merchant_push_ready");
    }
  }

  const button = actionButton(
    "pwa-notifications",
    synced ? "Alertas de pedidos activadas" : "Activar alertas de pedidos",
    () => enableMerchantNotifications().catch(error => window.alert(error.message))
  );
  button.disabled = synced;
  if(synced){
    startMerchantOrderWatcher().catch(error => console.error("PWA MERCHANT WATCH ERROR:",error));
  }
}

window.refreshMerchantNotifications = () => showMerchantNotifications().catch(error => console.error("PWA MERCHANT ERROR:",error));

async function init(){
  if(!("serviceWorker" in navigator)) return;

  registration = await navigator.serviceWorker.register("/service-worker.js?v=20260911-11");
  registration.update?.();

  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    if(isMerchantContext() || window.matchMedia("(display-mode: standalone)").matches){
      return;
    }
    deferredInstallPrompt = event;

    actionButton("pwa-install", "Instalar app", async () => {
      if(!deferredInstallPrompt) return;
      await deferredInstallPrompt.prompt();
      deferredInstallPrompt = null;
      document.getElementById("pwa-install")?.remove();
    });
  });

  if(document.body.dataset.pwaContext === "platform"){
    await showMerchantNotifications();
  }else if(
    "PushManager" in window &&
    "Notification" in window
  ){
    const storeId = getStoreId();
    const session = getCustomerSession(storeId);
    if(!session?.token || !storeId) return;

    const current = await registration.pushManager.getSubscription();
    const button = actionButton(
      "pwa-notifications",
      current ? "Notificaciones activadas" : "Activar notificaciones",
      () => enableNotifications().catch(error => window.alert(error.message))
    );
    button.disabled = Boolean(current);
  }
}

init().catch(error => console.error("PWA ERROR:", error));
