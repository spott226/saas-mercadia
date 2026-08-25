export function initChatbot(){

const container = document.getElementById("chatbot-container");

if(!container) return;

const options = window.store?.chatbot_options || [];

if(options.length === 0) return;

let buttonsHTML = "";

options.forEach(opt => {

buttonsHTML += `
<button
class="chatbot-option w-full text-left border border-gray-200 rounded-xl p-3 hover:bg-gray-50"
data-action="${opt.action || "whatsapp"}"
data-message="${opt.message || ""}"
data-response="${opt.response || ""}"
data-type="${opt.type || ""}">
${opt.label}
</button>
`;

});

container.innerHTML = `

<button id="chatbot-fab" class="chatbot-fab">
💬
</button>

<div id="chatbot-box" class="chatbot-box chatbot-hidden">

<div class="bg-black text-white px-4 py-3">

<h4 class="font-bold">Ayuda rápida</h4>

<p class="text-sm text-gray-300">
¿En qué podemos ayudarte?
</p>

</div>

<div class="p-4 space-y-3 text-sm">

${buttonsHTML}

</div>

</div>

`;

const fab = document.getElementById("chatbot-fab");
const box = document.getElementById("chatbot-box");

if(fab && box){

fab.addEventListener("click", () => {

box.classList.toggle("chatbot-hidden");

});

}

document.querySelectorAll(".chatbot-option").forEach(button => {

button.addEventListener("click", () => {

const action = button.dataset.action;

if(action === "products"){

const section = document.getElementById("products");

if(section){
section.scrollIntoView({behavior:"smooth"});
}else{
window.location.href = "#products";
}

}

else if(action === "message"){

const response = button.dataset.response;

alert(response);

}

else if(action === "whatsapp"){

if(!window.store?.whatsapp){

alert("No se encontró el WhatsApp de la tienda.");
return;

}

const phone = String(window.store.whatsapp).replace(/\D/g,"");

// 🔥 AQUÍ ESTÁ EL CAMBIO (mensaje dinámico)
let message = "";

const storeName = window.store?.name || "la tienda";
const productName = window.store?.product_name || "productos";

const type = button.dataset.type;

if(type === "asesor"){
message = `Hola ${storeName}, quiero hablar con un asesor sobre tus ${productName} disponibles`;
}
else if(type === "duda"){
message = `Hola ${storeName}, tengo una duda sobre los ${productName} que venden`;
}
else{
message = button.dataset.message || "Hola, quiero información";
}

const text = encodeURIComponent(message);

window.open(`https://wa.me/${phone}?text=${text}`,"_blank");

}

});

});

}