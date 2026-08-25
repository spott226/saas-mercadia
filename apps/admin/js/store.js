const API = "mercadia-back-production.up.railway.app";

async function getStore() {

const store_id = sessionStorage.getItem("store_id");

const res = await fetch(API + "/store/" + store_id);

const store = await res.json();

document.getElementById("store-name").innerText = store.name;

}
