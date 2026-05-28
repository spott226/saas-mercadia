const API_URL = "https://mercadia-back-production.up.railway.app/api";

export async function apiRequest(endpoint, method = "GET", body = null) {

const options = {
method,
headers: {
Authorization: "Bearer " + localStorage.getItem("token")
}
};

if(body){

// si es FormData (para imágenes)
if(body instanceof FormData){
options.body = body;
}else{
options.headers["Content-Type"] = "application/json";
options.body = JSON.stringify(body);
}

}

const res = await fetch(API_URL + endpoint, options);

if(!res.ok){

const text = await res.text();
console.error("API ERROR:", text);

throw new Error("API ERROR");

}

return await res.json();

}

export async function getProducts(storeId) {
return apiRequest(`/products/${storeId}`);
}
