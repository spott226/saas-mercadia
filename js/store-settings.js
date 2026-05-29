const API_URL =
  "https://mercadia-back-production.up.railway.app/api";

const token =
  sessionStorage.getItem("token");

if(!token){

  window.location = "login.html";

}

const templatesByType = {
  ecommerce:[
    {
      value:"ecommerce_default",
      label:"Ecommerce default"
    }
  ],
  restaurant:[
    {
      value:"restaurant_1",
      label:"Restaurante 1"
    },
    {
      value:"restaurant_2",
      label:"Restaurante 2"
    }
  ],
  appointments:[
    {
      value:"appointments_1",
      label:"Citas 1"
    }
  ]
};

let currentStore = null;
let promotions = [];

const message =
  document.getElementById("store-message");

const businessType =
  document.getElementById("business-type");

const templateKey =
  document.getElementById("template-key");

const promotionForm =
  document.getElementById("promotion-form");


function showMessage(text,type = "success"){

  message.textContent = text;
  message.className =
    `admin-message ${type} active`;

  setTimeout(
    () => {
      message.classList.remove("active");
    },
    3500
  );

}


async function runSafely(action){

  try{

    await action();

  }catch(err){

    console.error(err);
    showMessage(
      err.message,
      "error"
    );

  }

}


function escapeHTML(value){

  return String(value ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");

}


function toDateInput(value){

  if(!value) return "";

  return String(value).slice(0,10);

}


async function adminRequest(endpoint,options = {}){

  const headers = {
    Authorization:`Bearer ${token}`,
    ...(options.headers || {})
  };

  const res =
    await fetch(
      `${API_URL}${endpoint}`,
      {
        ...options,
        headers
      }
    );

  const contentType =
    res.headers.get("content-type") || "";

  const data =
    contentType.includes("application/json")
    ? await res.json()
    : await res.text();

  if(!res.ok){

    const errorMessage =
      data?.error ||
      data?.message ||
      "No se pudo completar la acción";

    throw new Error(errorMessage);

  }

  return data;

}


function setImagePreview(img,empty,url){

  if(url){

    img.src = url;
    img.style.display = "block";
    empty.style.display = "none";

    return;

  }

  img.removeAttribute("src");
  img.style.display = "none";
  empty.style.display = "block";

}


function renderStore(store){

  currentStore = store;

  document.getElementById("store-name").textContent =
    store.name || "-";

  document.getElementById("store-slug").textContent =
    store.slug || "-";

  document.getElementById("store-business-type").textContent =
    store.business_type || "-";

  document.getElementById("store-template-key").textContent =
    store.template_key || "-";

  setImagePreview(
    document.getElementById("logo-preview"),
    document.getElementById("logo-empty"),
    store.logo
  );

  setImagePreview(
    document.getElementById("hero-preview"),
    document.getElementById("hero-empty"),
    store.hero
  );

  businessType.value =
    store.business_type || "ecommerce";

  renderTemplateOptions(
    store.template_key
  );

}


function renderTemplateOptions(selectedValue){

  const type =
    businessType.value;

  const options =
    templatesByType[type] ||
    templatesByType.ecommerce;

  templateKey.innerHTML =
    options
      .map(option=>`
        <option value="${option.value}">
          ${option.label}
        </option>
      `)
      .join("");

  const nextValue =
    options.some(
      option => option.value === selectedValue
    )
    ? selectedValue
    : options[0].value;

  templateKey.value =
    nextValue;

}


async function loadStore(){

  const data =
    await adminRequest(
      "/admin/store"
    );

  renderStore(
    data.store || {}
  );

}


async function saveExperience(event){

  event.preventDefault();

  await adminRequest(
    "/admin/store",
    {
      method:"PATCH",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        business_type:businessType.value,
        template_key:templateKey.value
      })
    }
  );

  showMessage(
    "Experiencia actualizada"
  );

  await loadStore();

}


async function uploadStoreImage(kind,file){

  if(!file) return;

  const formData =
    new FormData();

  formData.append(
    kind,
    file
  );

  await adminRequest(
    `/admin/store/${kind}`,
    {
      method:"POST",
      body:formData
    }
  );

  showMessage(
    `${kind === "logo" ? "Logo" : "Hero"} actualizado`
  );

  await loadStore();

}


async function loadPromotions(){

  const data =
    await adminRequest(
      "/admin/promotions"
    );

  promotions =
    Array.isArray(data)
    ? data
    : (
        data.promotions ||
        data.data ||
        []
      );

  renderPromotions();

}


function renderPromotions(){

  const container =
    document.getElementById("promotions-list");

  if(!promotions.length){

    container.innerHTML =
      `<div class="empty">No hay promociones</div>`;

    return;

  }

  container.innerHTML =
    promotions
      .map(promo=>`
        <div class="promotion-item">
          <div class="promotion-info">
            <div class="promotion-title-row">
              <strong>${escapeHTML(promo.title || "Promoción")}</strong>
              <span class="status ${promo.is_active ? "status-paid" : "status-cancelled"}">
                ${promo.is_active ? "Activa" : "Inactiva"}
              </span>
            </div>
            <p>${escapeHTML(promo.description || "Sin descripción")}</p>
            <div class="promotion-meta">
              <span>${escapeHTML(promo.discount_text || "Sin descuento")}</span>
              <span>${escapeHTML(toDateInput(promo.starts_at) || "Sin inicio")}</span>
              <span>${escapeHTML(toDateInput(promo.ends_at) || "Sin fin")}</span>
            </div>
          </div>
          <div class="promotion-actions">
            <button type="button" class="action-btn edit-btn" onclick="editPromotion(${promo.id})">
              Editar
            </button>
            <button type="button" class="action-btn ${promo.is_active ? "delete-btn" : "edit-btn"}" onclick="togglePromotion(${promo.id})">
              ${promo.is_active ? "Desactivar" : "Activar"}
            </button>
            <button type="button" class="action-btn delete-btn" onclick="deletePromotion(${promo.id})">
              Eliminar
            </button>
          </div>
        </div>
      `)
      .join("");

}


function getPromotionFormData(){

  return {
    title:document.getElementById("promo-title").value,
    description:document.getElementById("promo-description").value,
    discount_text:document.getElementById("promo-discount").value,
    button_text:document.getElementById("promo-button-text").value,
    button_url:document.getElementById("promo-button-url").value,
    is_active:document.getElementById("promo-active").checked,
    starts_at:document.getElementById("promo-starts").value,
    ends_at:document.getElementById("promo-ends").value
  };

}


function buildPromotionBody(data,file){

  if(file){

    const formData =
      new FormData();

    Object.entries(data)
      .forEach(([key,value])=>{
        formData.append(key,value);
      });

    formData.append(
      "image",
      file
    );

    return {
      body:formData,
      headers:{}
    };

  }

  return {
    body:JSON.stringify(data),
    headers:{
      "Content-Type":"application/json"
    }
  };

}


async function savePromotion(event){

  event.preventDefault();

  const id =
    document.getElementById("promotion-id").value;

  const file =
    document.getElementById("promo-image").files[0];

  const payload =
    buildPromotionBody(
      getPromotionFormData(),
      file
    );

  await adminRequest(
    id
    ? `/admin/promotions/${id}`
    : "/admin/promotions",
    {
      method:id ? "PATCH" : "POST",
      headers:payload.headers,
      body:payload.body
    }
  );

  showMessage(
    id ? "Promoción actualizada" : "Promoción creada"
  );

  resetPromotionForm();

  await loadPromotions();

}


function resetPromotionForm(){

  promotionForm.reset();
  document.getElementById("promotion-id").value = "";
  document.getElementById("promo-active").checked = true;
  document.getElementById("save-promotion-btn").textContent =
    "Crear promoción";
  updatePromoPreview();

}


function setPromotionForm(promo){

  document.getElementById("promotion-id").value =
    promo.id;

  document.getElementById("promo-title").value =
    promo.title || "";

  document.getElementById("promo-description").value =
    promo.description || "";

  document.getElementById("promo-discount").value =
    promo.discount_text || "";

  document.getElementById("promo-button-text").value =
    promo.button_text || "";

  document.getElementById("promo-button-url").value =
    promo.button_url || "";

  document.getElementById("promo-starts").value =
    toDateInput(promo.starts_at);

  document.getElementById("promo-ends").value =
    toDateInput(promo.ends_at);

  document.getElementById("promo-active").checked =
    Boolean(promo.is_active);

  document.getElementById("save-promotion-btn").textContent =
    "Guardar cambios";

  updatePromoPreview(promo.image);

}


function updatePromoPreview(imageUrl = ""){

  const data =
    getPromotionFormData();

  document.getElementById("preview-title").textContent =
    data.title || "Nuevo usuario";

  document.getElementById("preview-description").textContent =
    data.description || "Regístrate y obtén un 10% de descuento";

  document.getElementById("preview-discount").textContent =
    data.discount_text || "10% OFF";

  document.getElementById("preview-button").textContent =
    data.button_text || "Registrarme";

  const imageInput =
    document.getElementById("promo-image");

  const previewImage =
    document.getElementById("preview-image");

  const file =
    imageInput.files[0];

  if(file){

    previewImage.src =
      URL.createObjectURL(file);
    previewImage.style.display = "block";

    return;

  }

  if(imageUrl){

    previewImage.src = imageUrl;
    previewImage.style.display = "block";

    return;

  }

  previewImage.removeAttribute("src");
  previewImage.style.display = "none";

}


window.editPromotion = (id) => {

  const promo =
    promotions.find(
      item => Number(item.id) === Number(id)
    );

  if(!promo) return;

  setPromotionForm(promo);

  promotionForm.scrollIntoView({
    behavior:"smooth",
    block:"start"
  });

};


async function togglePromotionStatus(id){

  const promo =
    promotions.find(
      item => Number(item.id) === Number(id)
    );

  if(!promo) return;

  await adminRequest(
    `/admin/promotions/${id}`,
    {
      method:"PATCH",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        is_active:!promo.is_active
      })
    }
  );

  showMessage(
    promo.is_active
    ? "Promoción desactivada"
    : "Promoción activada"
  );

  await loadPromotions();

}


window.togglePromotion = (id) => runSafely(
  () => togglePromotionStatus(id)
);


async function removePromotion(id){

  if(!confirm("¿Eliminar promoción?")){

    return;

  }

  await adminRequest(
    `/admin/promotions/${id}`,
    {
      method:"DELETE"
    }
  );

  showMessage(
    "Promoción eliminada"
  );

  await loadPromotions();

}


window.deletePromotion = (id) => runSafely(
  () => removePromotion(id)
);


businessType.addEventListener(
  "change",
  () => renderTemplateOptions()
);

document
  .getElementById("experience-form")
  .addEventListener(
    "submit",
    event => runSafely(
      () => saveExperience(event)
    )
  );

document
  .getElementById("logo-input")
  .addEventListener(
    "change",
    event => runSafely(
      () => uploadStoreImage(
        "logo",
        event.target.files[0]
      )
    )
  );

document
  .getElementById("hero-input")
  .addEventListener(
    "change",
    event => runSafely(
      () => uploadStoreImage(
        "hero",
        event.target.files[0]
      )
    )
  );

promotionForm.addEventListener(
  "submit",
  event => runSafely(
    () => savePromotion(event)
  )
);

document
  .getElementById("reset-promotion-btn")
  .addEventListener(
    "click",
    resetPromotionForm
  );

[
  "promo-title",
  "promo-description",
  "promo-discount",
  "promo-button-text",
  "promo-button-url",
  "promo-active"
].forEach(id=>{

  document
    .getElementById(id)
    .addEventListener(
      "input",
      () => updatePromoPreview()
    );

});

document
  .getElementById("promo-image")
  .addEventListener(
    "change",
    () => updatePromoPreview()
  );

try{

  await loadStore();
  await loadPromotions();
  updatePromoPreview();

}catch(err){

  console.error(err);
  showMessage(
    err.message,
    "error"
  );

}
