const API = window.MERCADIA_CONFIG?.API_URL || "/api";
const TOKEN_KEY = "mercadia_owner_token";
const REFRESH_KEY = "mercadia_owner_refresh";

const authDialog = document.getElementById("auth-dialog");
const resetDialog = document.getElementById("reset-dialog");
const message = document.getElementById("auth-message");

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

document.querySelectorAll("[data-open]").forEach(button => button.addEventListener("click", () => {
  showTab(button.dataset.open);
  authDialog.showModal();
}));
document.querySelectorAll("[data-tab]").forEach(button => button.addEventListener("click", () => showTab(button.dataset.tab)));
document.querySelectorAll(".dialog-close").forEach(button => button.addEventListener("click", () => button.closest("dialog").close()));

async function request(path, options = {}){
  const response = await fetch(`${API}${path}`, options);
  const data = await response.json().catch(() => ({}));
  if(!response.ok) throw new Error(data.error || "No se pudo completar la operación.");
  return data;
}

function saveSession(data){
  if(data.access_token) localStorage.setItem(TOKEN_KEY, data.access_token);
  if(data.refresh_token) localStorage.setItem(REFRESH_KEY, data.refresh_token);
  if(data.admin_token){
    sessionStorage.setItem("token", data.admin_token);
    sessionStorage.setItem("store_id", data.merchant.store_id);
    localStorage.setItem("mercadia_admin_token", data.admin_token);
    localStorage.setItem("mercadia_admin_store_id", data.merchant.store_id);
    window.refreshMerchantNotifications?.();
  }
}

function clearSession(){
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("store_id");
  localStorage.removeItem("mercadia_admin_token");
  localStorage.removeItem("mercadia_admin_store_id");
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
  document.getElementById("steps-view").classList.add("hidden");
  document.getElementById("account-view").classList.remove("hidden");
  document.getElementById("account-title").textContent = merchant.business_name;

  if(merchant.status === "active"){
    document.getElementById("account-content").innerHTML = `
      <div class="status-card">
        <span class="status-pill active">${statusText(merchant.status)}</span>
        <h2>Tu tienda está lista</h2>
        <p>Ya puedes configurar la página, cargar productos y empezar a recibir pedidos.</p>
        <div class="action-grid">
          <a class="primary" href="/admin/dashboard.html">Abrir panel de administración</a>
          <a class="secondary" href="${escapeHtml(merchant.store_url)}">Ver mi tienda</a>
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
  const button = event.currentTarget.querySelector("button");
  button.disabled = true;
  button.textContent = "Reportando...";
  try{
    await request("/platform/payment", {
      method: "POST",
      headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` },
      body: new FormData(event.currentTarget)
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
  if(!token) return false;
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

document.getElementById("register-form").addEventListener("submit", async event => {
  event.preventDefault();
  setMessage("Creando cuenta...");
  try{
    const body = Object.fromEntries(new FormData(event.currentTarget));
    const data = await request("/platform/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    saveSession(data);
    if(data.email_confirmation_required){
      setMessage("Cuenta creada. Revisa tu correo y confirma el enlace antes de iniciar sesión.", true);
      event.currentTarget.reset();
    }else{
      authDialog.close();
      renderAccount(data);
    }
  }catch(error){ setMessage(error.message); }
});

document.getElementById("login-form").addEventListener("submit", async event => {
  event.preventDefault();
  setMessage("Iniciando sesión...");
  try{
    const body = Object.fromEntries(new FormData(event.currentTarget));
    const data = await request("/platform/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    saveSession(data);
    authDialog.close();
    renderAccount(data);
  }catch(error){ setMessage(error.message); }
});

document.getElementById("forgot-button").addEventListener("click", async () => {
  const value = document.querySelector('#login-form [name="email"]').value;
  if(!value){ setMessage("Escribe primero tu correo."); return; }
  try{
    const data = await request("/platform/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: value }) });
    setMessage(data.message, true);
  }catch(error){ setMessage(error.message); }
});

document.getElementById("logout-button").addEventListener("click", () => { clearSession(); location.href = "/"; });

const hash = new URLSearchParams(location.hash.replace(/^#/, ""));
if(hash.get("access_token")){
  localStorage.setItem(TOKEN_KEY, hash.get("access_token"));
  if(hash.get("refresh_token")) localStorage.setItem(REFRESH_KEY, hash.get("refresh_token"));
  history.replaceState({}, "", location.pathname + location.search);
  if(hash.get("type") === "recovery") resetDialog.showModal();
}

if(new URLSearchParams(location.search).get("verified") === "1"){
  showTab("login");
  authDialog.showModal();
  setMessage(
    "Correo verificado correctamente. Inicia sesión para continuar con el pago.",
    true
  );
}

document.getElementById("reset-form").addEventListener("submit", async event => {
  event.preventDefault();
  const resetMessage = document.getElementById("reset-message");
  try{
    await request("/platform/update-password", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` }, body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))) });
    resetMessage.textContent = "Contraseña actualizada. Ya puedes iniciar sesión.";
    resetMessage.classList.add("ok");
    setTimeout(() => resetDialog.close(), 1200);
  }catch(error){ resetMessage.textContent = error.message; }
});

loadAccount();
