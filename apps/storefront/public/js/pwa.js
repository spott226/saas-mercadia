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

function getActions(){
  let actions = document.getElementById("pwa-actions");
  if(actions) return actions;

  actions = document.createElement("div");
  actions.id = "pwa-actions";
  actions.className = "pwa-actions";
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

async function init(){
  if(!("serviceWorker" in navigator)) return;

  registration = await navigator.serviceWorker.register("/service-worker.js");

  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    deferredInstallPrompt = event;

    actionButton("pwa-install", "Instalar app", async () => {
      if(!deferredInstallPrompt) return;
      await deferredInstallPrompt.prompt();
      deferredInstallPrompt = null;
      document.getElementById("pwa-install")?.remove();
    });
  });

  if(
    document.body.dataset.pwaContext !== "platform" &&
    "PushManager" in window &&
    "Notification" in window
  ){
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
