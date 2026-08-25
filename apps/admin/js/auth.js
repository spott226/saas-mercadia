const API =
  window.MERCADIA_CONFIG?.API_URL ||
  "https://mercadia-back-production.up.railway.app/api";

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

window.location.href = "login.html";

}


/* =========================
PROTEGER PÁGINAS
========================= */

function protect(){

const token = sessionStorage.getItem("token");

if(!token){

window.location.href = "login.html";

}

}


/* =========================
EVITAR VOLVER AL LOGIN
========================= */

function checkLogin(){

const token = sessionStorage.getItem("token");

if(token){

window.location.href = "dashboard.html";

}

}
