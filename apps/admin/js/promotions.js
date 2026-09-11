import {adminRequest,showMessage,runSafely,escapeHTML,toDateInput} from './commerce-admin.js';
import {createPromotionCard} from './promotion-card.js';
const promotionTypes = {popup:'Popup/emergente',banner:'Banner',top_notice:'Aviso superior',featured:'Promoción destacada'};
let promotions = [], savedImage = '', previewObjectUrl = '';
const promotionForm = document.getElementById('promotion-form');
function dateValue(id){ const value = document.getElementById(id).value; return value ? new Date(value).toISOString() : ''; }
function localDate(value){ if(!value) return ''; const date = new Date(value); return new Date(date.getTime() - date.getTimezoneOffset()*60000).toISOString().slice(0,16); }
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
      .map(promo=>{

        const visibility =
          getPromotionVisibility(promo);

        return `
        <div class="promotion-item">
          <div class="promotion-info">
            <div class="promotion-title-row">
              <strong>${escapeHTML(promo.internal_name || promo.title || "Promoción")}</strong>
              <span class="status ${visibility.className}">
                ${visibility.label}
              </span>
            </div>
            <p>${escapeHTML(promo.description || "Sin descripción")}</p>
            <div class="promotion-meta">
              <span>${escapeHTML(promotionTypes[promo.type] || 'Popup/emergente')} · Prioridad ${Number(promo.priority || 0)}</span><span>${escapeHTML(promo.discount_text || "Sin descuento")}</span>
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
      `;
      })
      .join("");

}


function getPromotionVisibility(promo){

  if(!promo.is_active){

    return {
      label:"Inactiva",
      className:"status-cancelled"
    };

  }

  const now =
    new Date();

  const startsAt =
    promo.starts_at
    ? new Date(promo.starts_at)
    : null;

  const endsAt =
    promo.ends_at
    ? new Date(promo.ends_at)
    : null;

  if(startsAt && startsAt > now){

    return {
      label:"Programada",
      className:"status-pending"
    };

  }

  if(endsAt && endsAt < now){

    return {
      label:"Vencida",
      className:"status-cancelled"
    };

  }

  return {
    label:"Visible",
    className:"status-paid"
  };

}


function getPromotionFormData(){

  return {
    internal_name:document.getElementById("promo-internal-name").value,
    type:document.getElementById("promo-type").value,
    priority:Number(document.getElementById("promo-priority").value),
    title:document.getElementById("promo-title").value,
    description:document.getElementById("promo-description").value,
    discount_text:document.getElementById("promo-discount").value,
    button_text:document.getElementById("promo-button-text").value,
    button_url:document.getElementById("promo-button-url").value,
    is_active:document.getElementById("promo-active").checked,
    starts_at:dateValue("promo-starts"),
    ends_at:dateValue("promo-ends")
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

  if(payload.body && getPromotionFormData().starts_at && getPromotionFormData().ends_at && getPromotionFormData().starts_at > getPromotionFormData().ends_at){
    throw new Error('La fecha final debe ser posterior al inicio');
  }
  const saveButton = document.getElementById('save-promotion-btn');
  if(saveButton.disabled) return;
  saveButton.disabled = true;
  try {
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
  } finally { saveButton.disabled = false; }

}


function resetPromotionForm(){

  promotionForm.reset();
  savedImage = "";
  document.getElementById("promotion-id").value = "";
  document.getElementById("promo-active").checked = true;
  document.getElementById("save-promotion-btn").textContent =
    "Crear promoción";
  updatePromoPreview();

}


function setPromotionForm(promo){
  savedImage = promo.image_url || "";
  document.getElementById("promo-image").value = "";
  document.getElementById("promo-type").value = promo.type || "popup";
  document.getElementById("promo-internal-name").value = promo.internal_name || "";
  document.getElementById("promo-priority").value = promo.priority || 0;


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
    localDate(promo.starts_at);

  document.getElementById("promo-ends").value =
    localDate(promo.ends_at);

  document.getElementById("promo-active").checked =
    Boolean(promo.is_active);

  document.getElementById("save-promotion-btn").textContent =
    "Guardar cambios";

  updatePromoPreview();

}


function updatePromoPreview(){
  const data = getPromotionFormData();
  const file = document.getElementById('promo-image').files[0];
  if(previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
  previewObjectUrl = file ? URL.createObjectURL(file) : '';
  data.image_url = previewObjectUrl || savedImage;
  const host = document.getElementById('promotion-preview');
  host.replaceChildren(createPromotionCard(data, {preview:true}));
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
  "promo-type",
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

await runSafely(loadPromotions);
updatePromoPreview();
