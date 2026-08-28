const API =
  window.MERCADIA_CONFIG?.API_URL ||
  "https://mercadia-back-production.up.railway.app/api";

const ADMIN_TOKEN_KEY = "mercadia_admin_token";
const ADMIN_STORE_KEY = "mercadia_admin_store_id";

function getAdminToken(){
  const token = sessionStorage.getItem("token") || localStorage.getItem(ADMIN_TOKEN_KEY);
  const storeId = sessionStorage.getItem("store_id") || localStorage.getItem(ADMIN_STORE_KEY);

  if(token) sessionStorage.setItem("token",token);
  if(storeId) sessionStorage.setItem("store_id",storeId);
  return token;
}

function getAdminStoreId(){
  getAdminToken();
  return sessionStorage.getItem("store_id") || localStorage.getItem(ADMIN_STORE_KEY);
}

window.getAdminToken = getAdminToken;
window.getAdminStoreId = getAdminStoreId;

async function recoverAdminSession(){
  if(getAdminToken() && getAdminStoreId()) return true;

  const ownerToken = localStorage.getItem("mercadia_owner_token");
  const refreshToken = localStorage.getItem("mercadia_owner_refresh");

  if(!ownerToken && !refreshToken) return false;

  const saveRecoveredSession = data => {
    if(data.access_token) localStorage.setItem("mercadia_owner_token",data.access_token);
    if(data.refresh_token) localStorage.setItem("mercadia_owner_refresh",data.refresh_token);
    if(!data.admin_token || !data.merchant?.store_id) return false;

    sessionStorage.setItem("token",data.admin_token);
    sessionStorage.setItem("store_id",data.merchant.store_id);
    localStorage.setItem(ADMIN_TOKEN_KEY,data.admin_token);
    localStorage.setItem(ADMIN_STORE_KEY,data.merchant.store_id);
    return true;
  };

  if(ownerToken){
    try{
      const response = await fetch(`${API}/platform/me`,{
        headers:{ Authorization:`Bearer ${ownerToken}` }
      });
      if(response.ok && saveRecoveredSession(await response.json())) return true;
    }catch(error){
      console.warn("No se pudo renovar la sesión del panel",error);
    }
  }

  if(refreshToken){
    try{
      const response = await fetch(`${API}/platform/refresh`,{
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({ refresh_token:refreshToken })
      });
      if(response.ok && saveRecoveredSession(await response.json())) return true;
    }catch(error){
      console.warn("No se pudo refrescar la sesión del panel",error);
    }
  }

  return false;
}

window.adminSessionReady = recoverAdminSession();

/* =========================
LOGIN
========================= */

async function login(){

const email = document.getElementById("email").value;
const password = document.getElementById("password").value;

try{

const res = await fetch(API + "/admin/login",{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
email,
password
})
});

const data = await res.json();

if(data.token){

if(data.role === "superadmin"){
sessionStorage.removeItem("token");
sessionStorage.removeItem("store_id");
localStorage.removeItem(ADMIN_TOKEN_KEY);
localStorage.removeItem(ADMIN_STORE_KEY);
sessionStorage.setItem("mercadia_platform_token",data.token);
localStorage.setItem("mercadia_platform_token",data.token);
window.location.href = data.redirect || "/platform.html";
return;
}

localStorage.removeItem("token");
localStorage.removeItem("store_id");

sessionStorage.setItem("token",data.token);
sessionStorage.setItem("store_id",data.store_id);
localStorage.setItem(ADMIN_TOKEN_KEY,data.token);
localStorage.setItem(ADMIN_STORE_KEY,data.store_id);
sessionStorage.removeItem("mercadia_platform_token");
localStorage.removeItem("mercadia_platform_token");

window.location.href = data.redirect || "dashboard.html";

}else{

alert("Credenciales incorrectas");

}

}catch(err){

console.error(err);
alert("Error conectando con el servidor");

}

}


/* =========================
LOGOUT
========================= */

function logout(){

localStorage.removeItem("token");
localStorage.removeItem("store_id");
sessionStorage.removeItem("token");
sessionStorage.removeItem("store_id");
localStorage.removeItem(ADMIN_TOKEN_KEY);
localStorage.removeItem(ADMIN_STORE_KEY);

window.location.href = "/?login=1";

}


/* =========================
PROTEGER PÁGINAS
========================= */

function protect(){
window.adminSessionReady.then(ready => {
  if(!ready) window.location.href = "/?login=1";
});

}


/* =========================
EVITAR VOLVER AL LOGIN
========================= */

function checkLogin(){

const token = getAdminToken();

if(token){

window.location.href = "dashboard.html";

}

}
