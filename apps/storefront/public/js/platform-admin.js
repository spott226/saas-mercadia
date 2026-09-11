const API = window.MERCADIA_CONFIG?.API_URL || "/api";
const KEY = "mercadia_platform_token";
const dashboard = document.getElementById("platform-dashboard");
const logout = document.getElementById("platform-logout");
const merchantSearch = document.getElementById("merchant-search");
const merchantStatusFilter = document.getElementById("merchant-status-filter");
let accounts = [];

function getToken(){
  const token=sessionStorage.getItem(KEY)||localStorage.getItem(KEY);
  if(token)sessionStorage.setItem(KEY,token);
  return token;
}

function escapeHtml(value){ const div=document.createElement("div"); div.textContent=String(value??""); return div.innerHTML; }
async function request(path, options={}){
  const token=getToken();
  options.headers={...(options.headers||{}),...(token?{Authorization:`Bearer ${token}`}:{})};
  const response=await fetch(`${API}${path}`,options); const data=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(data.error||"No se pudo completar la operación."); return data;
}
function showDashboard(){ dashboard.classList.remove("hidden"); logout.classList.remove("hidden"); }
function statusLabel(status){return ({pending_email:"Correo pendiente",payment_pending:"Pago pendiente",payment_reported:"Pago reportado",active:"Activo",rejected:"Rechazado",suspended:"Suspendido"})[status]||status;}
function statusClass(status){return ({active:"active",payment_reported:"reported",payment_pending:"pending",pending_email:"pending",suspended:"suspended",rejected:"rejected"})[status]||"pending";}
function formatDate(value){return value?new Intl.DateTimeFormat("es-MX",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(value)):"-";}
function storeHost(account){return account.custom_domain || account.store_slug || account.desired_slug || "-";}

async function loadAccounts(){
  showDashboard();
  const list=document.getElementById("merchant-list"); list.innerHTML="<p>Cargando cuentas...</p>";
  try{
    const data=await request("/platform/admin/accounts");
    accounts=data.accounts || [];
    renderAccounts();
  }catch(error){
    if(/token|access/i.test(error.message)){sessionStorage.removeItem(KEY);localStorage.removeItem(KEY);location.replace("/?login=1");return;}
    list.innerHTML=`<p class="form-message">${escapeHtml(error.message)}</p>`;
  }
}

function renderStats(items){
  const stats=document.getElementById("master-stats");
  const count=status=>items.filter(account=>account.status===status).length;
  stats.innerHTML=`
    <article><span>Total</span><strong>${items.length}</strong></article>
    <article><span>Activas</span><strong>${count("active")}</strong></article>
    <article><span>Por revisar</span><strong>${count("payment_reported")}</strong></article>
    <article><span>Suspendidas</span><strong>${count("suspended")}</strong></article>
  `;
}

function actionButtons(account){
  const buttons=[];
  if(account.status==="payment_reported"){
    buttons.push(`<button class="primary" data-review="${account.id}" data-approve="true">Confirmar pago y activar</button>`);
    buttons.push(`<button class="secondary danger" data-review="${account.id}" data-approve="false">Rechazar pago</button>`);
  }
  if(account.status!=="active" && account.status!=="payment_reported"){
    buttons.push(`<button class="primary" data-status="${account.id}" data-value="active">Activar plan</button>`);
  }
  if(account.status==="active"){
    buttons.push(`<button class="secondary danger" data-status="${account.id}" data-value="suspended">Suspender</button>`);
  }
  if(account.status==="suspended"){
    buttons.push(`<button class="secondary" data-status="${account.id}" data-value="active">Reactivar</button>`);
  }
  if(account.status!=="rejected"){
    buttons.push(`<button class="secondary danger" data-status="${account.id}" data-value="rejected">Dar de baja</button>`);
  }
  return buttons.join("");
}

function filteredAccounts(){
  const term=String(merchantSearch?.value || "").trim().toLowerCase();
  const status=merchantStatusFilter?.value || "";
  return accounts.filter(account=>{
    const haystack=[
      account.business_name,
      account.store_name,
      account.full_name,
      account.email,
      account.phone,
      account.store_slug,
      account.custom_domain,
      account.payment_reference
    ].join(" ").toLowerCase();
    return (!status || account.status===status) && (!term || haystack.includes(term));
  });
}

function renderAccounts(){
  const list=document.getElementById("merchant-list");
  const items=filteredAccounts();
  renderStats(accounts);
  list.innerHTML=items.length?items.map(account=>`<article class="merchant-card store-card">
    <div class="merchant-top">
      <div>
        <span class="store-kicker">${escapeHtml(account.store_slug || account.desired_slug || "sin slug")}</span>
        <h3>${escapeHtml(account.business_name || account.store_name || "Tienda")}</h3>
        <p>${escapeHtml(account.full_name)} · ${escapeHtml(account.email)} · ${escapeHtml(account.phone||"Sin teléfono")}</p>
      </div>
      <span class="status-pill ${statusClass(account.status)}">${statusLabel(account.status)}</span>
    </div>
    <div class="store-meta-grid">
      <div><span>Plan</span><b>$${Number(account.plan_amount || 0).toFixed(2)}</b></div>
      <div><span>Tienda</span><b>${escapeHtml(storeHost(account))}</b></div>
      <div><span>Productos</span><b>${account.product_limit ?? "-"}</b></div>
      <div><span>Alta</span><b>${formatDate(account.created_at)}</b></div>
    </div>
    <div class="store-links">
      ${account.store_url?`<a class="proof-link" href="${escapeHtml(account.store_url)}" target="_blank" rel="noopener">Ver tienda</a>`:""}
      ${account.admin_url && account.status==="active"?`<a class="proof-link" href="${escapeHtml(account.admin_url)}" target="_blank" rel="noopener">Abrir admin</a>`:""}
      ${account.proof_url?`<a class="proof-link" href="${escapeHtml(account.proof_url)}" target="_blank" rel="noopener">Comprobante</a>`:""}
    </div>
    <p class="store-reference">Referencia: <b class="reference">${escapeHtml(account.payment_reference || "-")}</b>${account.payment_notes?` · Nota: ${escapeHtml(account.payment_notes)}`:""}</p>
    <div class="merchant-actions">${actionButtons(account)}</div>
  </article>`).join(""):"<div class='status-card'><h2>No hay tiendas con ese filtro</h2></div>";
  bindActions();
}

function bindActions(){
  document.querySelectorAll("[data-review]").forEach(button=>button.addEventListener("click",async()=>{
    const approve=button.dataset.approve==="true";
    const reason=approve?"":prompt("Motivo del rechazo:","Pago no recibido");
    if(!approve&&reason===null)return;
    button.disabled=true;
    try{await request(`/platform/admin/accounts/${button.dataset.review}/review`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({approve,reason})});await loadAccounts();}catch(error){alert(error.message);button.disabled=false;}
  }));
  document.querySelectorAll("[data-status]").forEach(button=>button.addEventListener("click",async()=>{
    if(!confirm(`¿Cambiar la cuenta a ${statusLabel(button.dataset.value)}?`))return;
    button.disabled=true;
    try{await request(`/platform/admin/accounts/${button.dataset.status}/status`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:button.dataset.value})});await loadAccounts();}catch(error){alert(error.message);button.disabled=false;}
  }));
}
document.getElementById("refresh-accounts").addEventListener("click",loadAccounts);
merchantSearch?.addEventListener("input",renderAccounts);
merchantStatusFilter?.addEventListener("change",renderAccounts);
logout.addEventListener("click",()=>{sessionStorage.removeItem(KEY);localStorage.removeItem(KEY);location.replace("/?login=1");});
if(getToken())loadAccounts();else location.replace("/?login=1");
