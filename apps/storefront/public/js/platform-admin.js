const API = window.MERCADIA_CONFIG?.API_URL || "/api";
const KEY = "mercadia_platform_token";
const dashboard = document.getElementById("platform-dashboard");
const logout = document.getElementById("platform-logout");

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
async function loadAccounts(){
  showDashboard();
  const list=document.getElementById("merchant-list"); list.innerHTML="<p>Cargando cuentas...</p>";
  try{
    const data=await request("/platform/admin/accounts");
    list.innerHTML=data.accounts.length?data.accounts.map(account=>`<article class="merchant-card">
      <div class="merchant-top"><div><h3>${escapeHtml(account.business_name)}</h3><p>${escapeHtml(account.full_name)} · ${escapeHtml(account.email)} · ${escapeHtml(account.phone||"Sin teléfono")}</p></div><span class="status-pill ${account.status==='active'?'active':''}">${statusLabel(account.status)}</span></div>
      <p>Plan: <b>$${Number(account.plan_amount).toFixed(2)}</b> · Referencia: <b class="reference">${escapeHtml(account.payment_reference)}</b></p>
      ${account.payment_notes?`<p>Nota: ${escapeHtml(account.payment_notes)}</p>`:""}
      ${account.proof_url?`<a class="proof-link" href="${escapeHtml(account.proof_url)}" target="_blank" rel="noopener">Ver comprobante</a>`:""}
      ${account.store_url?`<p><a class="proof-link" href="${escapeHtml(account.store_url)}" target="_blank">Abrir tienda</a></p>`:""}
      <div class="merchant-actions">
        ${account.status==='payment_reported'?`<button class="primary" data-review="${account.id}" data-approve="true">Confirmar pago y activar</button><button class="secondary danger" data-review="${account.id}" data-approve="false">Rechazar pago</button>`:""}
        ${account.status==='active'?`<button class="secondary danger" data-status="${account.id}" data-value="suspended">Suspender</button>`:""}
        ${account.status==='suspended'?`<button class="secondary" data-status="${account.id}" data-value="active">Reactivar</button>`:""}
      </div></article>`).join(""):"<div class='status-card'><h2>No hay cuentas registradas</h2></div>";
    bindActions();
  }catch(error){
    if(/token|access/i.test(error.message)){sessionStorage.removeItem(KEY);localStorage.removeItem(KEY);location.replace("/?login=1");return;}
    list.innerHTML=`<p class="form-message">${escapeHtml(error.message)}</p>`;
  }
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
    if(!confirm(`¿Cambiar la cuenta a ${button.dataset.value}?`))return;
    try{await request(`/platform/admin/accounts/${button.dataset.status}/status`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:button.dataset.value})});await loadAccounts();}catch(error){alert(error.message);}
  }));
}
document.getElementById("refresh-accounts").addEventListener("click",loadAccounts);
logout.addEventListener("click",()=>{sessionStorage.removeItem(KEY);localStorage.removeItem(KEY);location.replace("/?login=1");});
if(getToken())loadAccounts();else location.replace("/?login=1");
