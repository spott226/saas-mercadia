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

localStorage.removeItem("token");
localStorage.removeItem("store_id");

sessionStorage.setItem("token",data.token);
sessionStorage.setItem("store_id",data.store_id);
localStorage.setItem(ADMIN_TOKEN_KEY,data.token);
localStorage.setItem(ADMIN_STORE_KEY,data.store_id);

window.location.href = "dashboard.html";

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

window.location.href = "login.html";

}


/* =========================
PROTEGER PÁGINAS
========================= */

function protect(){

const token = getAdminToken();

if(!token){

window.location.href = "login.html";

}

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
