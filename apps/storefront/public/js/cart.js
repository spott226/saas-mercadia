import { createOrder } from "./api.js";
import {
  getCustomerProfile,
  saveCustomerProfile
} from "./customer-session.js";

const CART_KEY = "mercadia_cart";
const DEFAULT_IMAGE = "/assets/images/default.jpg";

function getCart(){
  try{
    const cart = localStorage.getItem(CART_KEY);
    const parsed = cart ? JSON.parse(cart) : [];

    return Array.isArray(parsed) ? parsed : [];
  }catch(error){
    console.error("Error leyendo carrito:", error);
    localStorage.removeItem(CART_KEY);
    return [];
  }
}

function saveCart(cart){
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function formatMoney(value){
  return "$" + Number(value || 0).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function getInputValue(id){
  return document.getElementById(id)?.value.trim() || "";
}

function setInputValue(id, value){
  const input =
    document.getElementById(id);

  if(!input || !value){
    return;
  }

  if(!input.value.trim()){
    input.value = value;
  }
}

function prefillCheckoutForm(){
  const profile =
    getCustomerProfile(
      window.store?.id
    );

  if(!profile){
    return;
  }

  setInputValue("c-name", profile.name);
  setInputValue("c-phone", profile.phone);
  setInputValue("c-address", profile.address);
  setInputValue("c-colony", profile.colony);
  setInputValue("c-city", profile.city);
  setInputValue("c-state", profile.state);
  setInputValue("c-postal", profile.postal);
  setInputValue("c-ref", profile.reference);
}

function appendText(parent, tag, text, className){
  const element = document.createElement(tag);

  if(className){
    element.className = className;
  }

  element.textContent = text;
  parent.appendChild(element);

  return element;
}

/* =======================
AGREGAR AL CARRITO
======================= */

export function addToCart(product){
  const cart = getCart();

  const productId = product.id;
  const color = product.color || null;
  const size = product.size || null;

  const existing = cart.find(
    p =>
      p.id === productId &&
      p.color === color &&
      p.size === size
  );

  if(existing){
    existing.qty += Number(product.qty || product.quantity || 1);
  }else{
    cart.push({
      id: productId,
      variant_id: product.variant_id || null,
      name: product.name || "Producto",
      price: Number(product.price || 0),
      qty: Number(product.qty || product.quantity || 1),
      color,
      size,
      image: product.image || null
    });
  }

  saveCart(cart);
  updateCartCount();
}

/* =======================
CONTADOR
======================= */

export function updateCartCount(){
  const cart = getCart();
  const counter = document.getElementById("cart-count");

  if(!counter) return;

  const totalItems = cart.reduce(
    (acc,item) => acc + Number(item.qty || 0),
    0
  );

  counter.textContent = totalItems;
}

/* =======================
MOSTRAR CARRITO
======================= */

export function openCart(){
  const cart = getCart();
  const container = document.getElementById("cart-items");

  if(!container) return;

  container.replaceChildren();

  let total = 0;

  if(cart.length === 0){
    appendText(
      container,
      "p",
      "Tu carrito esta vacio",
      "text-center text-gray-500 py-4"
    );
  }

  cart.forEach((p,index) => {
    const price = Number(p.price || 0);
    const qty = Number(p.qty || 0);
    const subtotal = price * qty;

    total += subtotal;

    const item = document.createElement("div");
    item.className = "flex gap-3 border-b py-4";

    const image = document.createElement("img");
    image.src = p.image || DEFAULT_IMAGE;
    image.alt = p.name || "Producto";
    image.style.width = "70px";
    image.style.height = "70px";
    image.style.objectFit = "cover";
    image.style.borderRadius = "10px";
    image.onerror = () => {
      image.src = DEFAULT_IMAGE;
    };

    const info = document.createElement("div");
    info.className = "flex-1";

    appendText(info, "p", p.name || "Producto", "font-semibold");

    const details = document.createElement("p");
    details.className = "text-sm opacity-70";

    const lines = [];

    if(p.color){
      lines.push(`Color: ${p.color}`);
    }

    if(p.size){
      lines.push(`Talla: ${p.size}`);
    }

    lines.push(`${formatMoney(price)} x ${qty}`);
    details.textContent = lines.join(" | ");
    info.appendChild(details);

    const actions = document.createElement("div");
    actions.className = "text-right";

    appendText(actions, "p", formatMoney(subtotal), "font-bold");

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "text-red-500 text-sm hover:underline";
    removeButton.textContent = "Eliminar";
    removeButton.addEventListener("click", () => removeItem(index));
    actions.appendChild(removeButton);

    item.append(image, info, actions);
    container.appendChild(item);
  });

  const totalElement = document.getElementById("cart-total");

  if(totalElement){
    totalElement.textContent = formatMoney(total);
  }

  const modal = document.getElementById("cart-modal");

  if(modal){
    modal.classList.remove("hidden");
  }
}

/* =======================
CERRAR CARRITO
======================= */

export function closeCart(){
  const modal = document.getElementById("cart-modal");

  if(modal){
    modal.classList.add("hidden");
  }
}

/* =======================
ELIMINAR PRODUCTO
======================= */

export function removeItem(index){
  const cart = getCart();

  cart.splice(index,1);
  saveCart(cart);
  updateCartCount();
  openCart();
}

/* =======================
ABRIR CHECKOUT
======================= */

export function checkout(){
  const cart = getCart();

  if(cart.length === 0){
    alert("Carrito vacio");
    return;
  }

  const modal = document.getElementById("checkout-modal");

  if(!modal){
    alert("No se encontro el formulario de envio.");
    return;
  }

  prefillCheckoutForm();
  modal.classList.remove("hidden");
}

/* =======================
CERRAR CHECKOUT
======================= */

export function closeCheckout(){
  const modal = document.getElementById("checkout-modal");

  if(modal){
    modal.classList.add("hidden");
  }
}

function buildWhatsappMessage({ cart, orderId, total, customer }){
  const storeName = window.store?.name || "la tienda";

  const productLines = cart.map(p => {
    const price = Number(p.price || 0);
    const qty = Number(p.qty || 0);
    const subtotal = price * qty;

    return [
      `- ${p.name || "Producto"}`,
      p.color ? `Color: ${p.color}` : "",
      p.size ? `Talla: ${p.size}` : "",
      `Cantidad: ${qty}`,
      `Precio: ${formatMoney(price)}`,
      `Subtotal: ${formatMoney(subtotal)}`
    ].filter(Boolean).join("\n");
  }).join("\n\n");

  return [
    `NUEVO PEDIDO - ${storeName}`,
    "",
    "PRODUCTOS",
    productLines,
    "",
    `TOTAL: ${formatMoney(total)}`,
    `Pedido ERP: #${orderId}`,
    "",
    "DATOS DE ENVIO",
    `Nombre: ${customer.name}`,
    `Telefono: ${customer.phone}`,
    `Direccion: ${customer.address}`,
    customer.colony ? `Colonia: ${customer.colony}` : "",
    customer.city ? `Ciudad: ${customer.city}` : "",
    customer.state ? `Estado: ${customer.state}` : "",
    customer.postal ? `Codigo postal: ${customer.postal}` : "",
    customer.reference ? `Referencia: ${customer.reference}` : "",
    "",
    "Gracias por tu compra"
  ].filter(line => line !== "").join("\n");
}

/* =======================
ENVIAR PEDIDO ERP
======================= */

export async function sendCheckout(){
  const submitButton = document.querySelector(
    "#checkout-modal [data-checkout-submit]"
  );

  try{
    const cart = getCart();

    if(cart.length === 0){
      alert("Carrito vacio");
      return;
    }

    const customer = {
      name: getInputValue("c-name"),
      phone: getInputValue("c-phone"),
      address: getInputValue("c-address"),
      colony: getInputValue("c-colony"),
      city: getInputValue("c-city"),
      state: getInputValue("c-state"),
      postal: getInputValue("c-postal"),
      reference: getInputValue("c-ref")
    };

    if(!customer.name || !customer.phone || !customer.address){
      alert("Completa los datos obligatorios");
      return;
    }

    saveCustomerProfile(
      window.store?.id,
      customer
    );

    const items = cart.map(p => ({
      variant_id: p.variant_id,
      product_id: p.id,
      quantity: Number(p.qty || 1)
    }));

    if(submitButton){
      submitButton.disabled = true;
      submitButton.textContent = "Enviando...";
    }

    const data = await createOrder({
      store_id: window.store?.id,
      customer_name: customer.name,
      customer_phone: customer.phone,
      customer_address: [
        customer.address,
        customer.colony,
        customer.city,
        customer.state,
        customer.postal
      ].filter(Boolean).join(", "),
      items
    });

    if(!data || !data.success){
      alert("Error creando pedido");
      return;
    }

    const total = cart.reduce(
      (acc,p) => acc + Number(p.price || 0) * Number(p.qty || 0),
      0
    );

    const whatsapp = window.store?.whatsapp;

    if(!whatsapp){
      alert("Numero de WhatsApp no configurado.");
      return;
    }

    const phone = String(whatsapp).replace(/\D/g,"");

    if(!phone){
      alert("Numero de WhatsApp invalido.");
      return;
    }

    const message = buildWhatsappMessage({
      cart,
      orderId: data.order_id,
      total,
      customer
    });

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if(isMobile){
      window.location.href = url;
    }else{
      const whatsappWindow = window.open(url, "_blank");

      if(!whatsappWindow){
        alert("Permite ventanas emergentes para abrir WhatsApp.");
        return;
      }
    }

    localStorage.removeItem(CART_KEY);
    updateCartCount();
    closeCheckout();
    closeCart();
  }catch(err){
    console.error(err);
    alert(err.message || "Error procesando pedido");
  }finally{
    if(submitButton){
      submitButton.disabled = false;
      submitButton.textContent = "Enviar pedido";
    }
  }
}

/* =======================
INIT
======================= */

document.addEventListener("DOMContentLoaded", updateCartCount);

window.openCart = openCart;
window.closeCart = closeCart;
window.removeItem = removeItem;
window.checkout = checkout;
window.closeCheckout = closeCheckout;
window.sendCheckout = sendCheckout;
