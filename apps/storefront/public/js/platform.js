const API = window.MERCADIA_CONFIG?.API_URL || "/api";
const TOKEN_KEY = "mercadia_owner_token";
const REFRESH_KEY = "mercadia_owner_refresh";
const RECOVERY_TOKEN_KEY = "mercadia_owner_recovery_token";

const authDialog = document.getElementById("auth-dialog");
const resetDialog = document.getElementById("reset-dialog");
const message = document.getElementById("auth-message");
const registerForm = document.getElementById("register-form");
const loginForm = document.getElementById("login-form");
const forgotButton = document.getElementById("forgot-button");
const logoutButton = document.getElementById("logout-button");
const resetForm = document.getElementById("reset-form");
const guestNav = document.getElementById("guest-nav");
const sessionNav = document.getElementById("session-nav");
const platformToken =
  sessionStorage.getItem("mercadia_platform_token") ||
  localStorage.getItem("mercadia_platform_token");

function setAuthenticatedHeader(authenticated){
  guestNav?.classList.toggle("hidden",authenticated);
  sessionNav?.classList.toggle("hidden",!authenticated);
}

function setMessage(text, ok = false){
  message.textContent = text || "";
  message.classList.toggle("ok", ok);
}

function showTab(tab){
  document.getElementById("login-form").classList.toggle("hidden", tab !== "login");
  document.getElementById("register-form").classList.toggle("hidden", tab !== "register");
  authDialog.querySelectorAll("[data-tab]").forEach(button => button.classList.toggle("active", button.dataset.tab === tab));
  setMessage("");
}

function openCenteredDialog(dialog){
  if(!dialog || dialog.open) return;
  document.documentElement.classList.add("modal-open");
  document.body.classList.add("modal-open");
  dialog.showModal();
}

function closeDialog(dialog){
  if(dialog?.open) dialog.close();
}

document.querySelectorAll("[data-open]").forEach(button => button.addEventListener("click", () => {
  showTab(button.dataset.open);
  openCenteredDialog(authDialog);
}));
document.querySelectorAll("[data-tab]").forEach(button => button.addEventListener("click", () => showTab(button.dataset.tab)));
document.querySelectorAll(".dialog-close").forEach(button => button.addEventListener("click", () => closeDialog(button.closest("dialog"))));
document.querySelectorAll("dialog").forEach(dialog => {
  dialog.addEventListener("close", () => {
    if(!document.querySelector("dialog[open]")){
      document.documentElement.classList.remove("modal-open");
      document.body.classList.remove("modal-open");
    }
  });
  dialog.addEventListener("click", event => {
    if(event.target === dialog) closeDialog(dialog);
  });
});

async function request(path, options = {}){
  const response = await fetch(`${API}${path}`, options);
  const data = await response.json().catch(() => ({}));
  if(!response.ok) throw new Error(data.error || "No se pudo completar la operación.");
  return data;
}

function saveSession(data){
  if(data.role === "superadmin" && data.token){
    clearSession();
    sessionStorage.setItem("mercadia_platform_token",data.token);
    localStorage.setItem("mercadia_platform_token",data.token);
    setAuthenticatedHeader(true);
    return;
  }

  if(data.access_token) localStorage.setItem(TOKEN_KEY, data.access_token);
  if(data.refresh_token) localStorage.setItem(REFRESH_KEY, data.refresh_token);
  if(data.admin_token){
    sessionStorage.setItem("token", data.admin_token);
    sessionStorage.setItem("store_id", data.merchant.store_id);
    localStorage.setItem("mercadia_admin_token", data.admin_token);
    localStorage.setItem("mercadia_admin_store_id", data.merchant.store_id);
    window.refreshMerchantNotifications?.();
  }
  setAuthenticatedHeader(Boolean(data.access_token || localStorage.getItem(TOKEN_KEY)));
}

function clearSession(){
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("store_id");
  localStorage.removeItem("mercadia_admin_token");
  localStorage.removeItem("mercadia_admin_store_id");
  sessionStorage.removeItem("mercadia_platform_token");
  localStorage.removeItem("mercadia_platform_token");
  sessionStorage.removeItem(RECOVERY_TOKEN_KEY);
  setAuthenticatedHeader(false);
}

function escapeHtml(value){
  const div = document.createElement("div");
  div.textContent = String(value ?? "");
  return div.innerHTML;
}

function statusText(status){
  return ({
    pending_email: "Falta confirmar el correo",
    payment_pending: "Pago pendiente",
    payment_reported: "Pago reportado · en revisión",
    active: "Cuenta activa",
    rejected: "Solicitud rechazada",
    suspended: "Cuenta suspendida"
  })[status] || status;
}

function renderAccount(data){
  const merchant = data.merchant;
  document.getElementById("marketing-view").classList.add("hidden");
  document.querySelectorAll("[data-marketing-only]").forEach(section => section.classList.add("hidden"));
  const accountView = document.getElementById("account-view");
  accountView.classList.remove("hidden");
  accountView.classList.toggle("active-merchant", merchant.status === "active");
  document.getElementById("account-title").textContent = merchant.business_name;
  setAuthenticatedHeader(true);

  if(merchant.status === "active"){
    document.getElementById("account-content").innerHTML = `
      <div class="active-account-card">
        <div class="active-account-icon"><img src="/icons/mercadia-app.png" alt=""></div>
        <span class="active-account-kicker">TU ESPACIO MERCADIA</span>
        <h2>¿A dónde quieres ir?</h2>
        <p>Tu tienda está activa y lista para seguir vendiendo.</p>
        <div class="active-account-actions">
          <a class="account-action admin-action" href="/admin/dashboard.html"><span>Administrar mi negocio<small>Productos, pedidos, diseño y clientes</small></span><b>→</b></a>
          <a class="account-action store-action" href="${escapeHtml(merchant.store_url)}"><span>Ver mi tienda<small>Abre la experiencia que ven tus clientes</small></span><b>↗</b></a>
        </div>
      </div>`;
    return;
  }

  if(merchant.status === "payment_reported"){
    document.getElementById("account-content").innerHTML = `
      <div class="status-card">
        <span class="status-pill">${statusText(merchant.status)}</span>
        <h2>Estamos revisando tu transferencia</h2>
        <p>Tu referencia es <strong class="reference">${escapeHtml(merchant.payment_reference)}</strong>. Cuando se confirme el pago, tu panel quedará habilitado.</p>
      </div>`;
    return;
  }

  const bank = data.bank || {};
  document.getElementById("account-content").innerHTML = `
    <div class="status-card">
      <span class="status-pill">${statusText(merchant.status)}</span>
      <h2>Activa tu tienda por $${Number(merchant.plan_amount).toFixed(2)}</h2>
      <p>Realiza la transferencia y usa exactamente la referencia indicada.</p>
      <div class="bank-card">
        <h3>Datos para transferir</h3>
        <div class="bank-grid">
          <div><span>Banco</span><b>${escapeHtml(bank.bank_name || "Por configurar")}</b></div>
          <div><span>Cuenta / CLABE</span><b>${escapeHtml(bank.bank_account || "Por configurar")}</b></div>
          <div><span>Beneficiario</span><b>${escapeHtml(bank.bank_beneficiary || "Por configurar")}</b></div>
        </div>
        <p>Concepto obligatorio: <strong class="reference">${escapeHtml(merchant.payment_reference)}</strong></p>
      </div>
      <form class="payment-form" id="payment-form">
        <label>Comprobante (opcional)<input name="proof" type="file" accept="image/png,image/jpeg,image/webp"></label>
        <label>Nota o folio (opcional)<textarea name="notes" maxlength="500" rows="3"></textarea></label>
        <button class="primary">Ya realicé la transferencia</button>
      </form>
    </div>`;

  document.getElementById("payment-form").addEventListener("submit", reportPayment);
}

async function reportPayment(event){
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector("button");
  button.disabled = true;
  button.textContent = "Reportando...";
  try{
    await request("/platform/payment", {
      method: "POST",
      headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` },
      body: new FormData(form)
    });
    await loadAccount();
  }catch(error){
    alert(error.message);
    button.disabled = false;
    button.textContent = "Ya realicé la transferencia";
  }
}

async function loadAccount(){
  const token = localStorage.getItem(TOKEN_KEY);
  if(!token){
    setAuthenticatedHeader(false);
    return false;
  }
  setAuthenticatedHeader(true);
  try{
    const data = await request("/platform/me", { headers: { Authorization: `Bearer ${token}` } });
    saveSession(data);
    renderAccount(data);
    return true;
  }catch(error){
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if(!refreshToken){
      clearSession();
      return false;
    }

    try{
      const data = await request("/platform/refresh",{
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({ refresh_token:refreshToken })
      });
      saveSession(data);
      renderAccount(data);
      return true;
    }catch(refreshError){
      clearSession();
      return false;
    }
  }
}

registerForm?.addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget;
  setMessage("Creando cuenta...");
  try{
    const body = Object.fromEntries(new FormData(form));
    const data = await request("/platform/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    saveSession(data);
    if(data.email_confirmation_required){
      setMessage("Cuenta creada. Revisa tu correo y confirma el enlace antes de iniciar sesión.", true);
      form.reset();
    }else{
      authDialog?.close?.();
      renderAccount(data);
    }
  }catch(error){ setMessage(error.message); }
});

loginForm?.addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget;
  setMessage("Iniciando sesión...");
  try{
    const body = Object.fromEntries(new FormData(form));
    const data = await request("/platform/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    saveSession(data);
    if(data.role === "superadmin"){
      location.href = data.redirect || "/platform.html";
      return;
    }
    authDialog?.close?.();
    renderAccount(data);
  }catch(error){ setMessage(error.message); }
});

forgotButton?.addEventListener("click", async () => {
  const value = loginForm?.querySelector('[name="email"]')?.value || "";
  if(!value){ setMessage("Escribe primero tu correo."); return; }
  try{
    const data = await request("/platform/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: value }) });
    setMessage(data.message, true);
  }catch(error){ setMessage(error.message); }
});

logoutButton?.addEventListener("click", () => { clearSession(); location.href = "/"; });

const hash = new URLSearchParams(location.hash.replace(/^#/, ""));
function getRecoveryToken(hashParams){
  if(hashParams.get("type") !== "recovery") return null;
  const token = String(hashParams.get("access_token") || "").trim();
  return token.split(".").length === 3 ? token : null;
}

const recoveryToken = getRecoveryToken(hash);
const isRecoveryFlow = Boolean(recoveryToken);
const resetRequested = new URLSearchParams(location.search).get("reset") === "1";

if(recoveryToken){
  sessionStorage.setItem(RECOVERY_TOKEN_KEY,recoveryToken);
  history.replaceState({}, "", location.pathname + location.search);
  openCenteredDialog(resetDialog);
}else if(hash.get("error")){
  history.replaceState({}, "", location.pathname + location.search);
  showTab("login");
  openCenteredDialog(authDialog);
  setMessage("El enlace para cambiar la contraseña venció o ya fue utilizado. Solicita uno nuevo.");
}else if(hash.get("type") === "recovery"){
  history.replaceState({}, "", location.pathname + location.search);
  showTab("login");
  openCenteredDialog(authDialog);
  setMessage("El enlace para cambiar la contraseña llegó incompleto. Solicita uno nuevo.");
}else if(resetRequested){
  showTab("login");
  openCenteredDialog(authDialog);
  setMessage("El enlace para cambiar la contraseña venció o está incompleto. Solicita uno nuevo.");
}

if(new URLSearchParams(location.search).get("verified") === "1"){
  showTab("login");
  openCenteredDialog(authDialog);
  setMessage(
    "Correo verificado correctamente. Inicia sesión para continuar con el pago.",
    true
  );
}

if(new URLSearchParams(location.search).get("login") === "1"){
  showTab("login");
  openCenteredDialog(authDialog);
}

resetForm?.addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const resetMessage = document.getElementById("reset-message");
  try{
    const token = sessionStorage.getItem(RECOVERY_TOKEN_KEY);
    if(!token) throw new Error("El enlace para cambiar la contraseña venció. Solicita uno nuevo.");
    await request("/platform/update-password", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
    clearSession();
    resetMessage.textContent = "Contraseña actualizada. Ya puedes iniciar sesión.";
    resetMessage.classList.add("ok");
    form.reset();
    setTimeout(() => {
      resetDialog.close();
      showTab("login");
      openCenteredDialog(authDialog);
      setMessage("Contraseña actualizada. Inicia sesión con tu nueva contraseña.",true);
    }, 1200);
  }catch(error){ resetMessage.textContent = error.message; }
});

if(isRecoveryFlow){
  setAuthenticatedHeader(false);
}else if(platformToken){
  location.replace("/platform.html");
}else{
  const hasOwnerSession = Boolean(localStorage.getItem(TOKEN_KEY));
  setAuthenticatedHeader(hasOwnerSession);
  if(hasOwnerSession) document.body.classList.add("checking-session");
  loadAccount().finally(() => document.body.classList.remove("checking-session"));
}
