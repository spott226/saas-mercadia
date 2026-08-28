import { apiRequest } from "./api.js";

const API_URL =
  window.MERCADIA_CONFIG?.BACKEND_ORIGIN ||
  "https://mercadia-back-production.up.railway.app";

const token =
  window.getAdminToken?.() || sessionStorage.getItem("token") || localStorage.getItem("mercadia_admin_token");

const store_id =
  window.getAdminStoreId?.() || sessionStorage.getItem("store_id") || localStorage.getItem("mercadia_admin_store_id");

if (!token || !store_id) {

  window.location = "login.html";

}

let editingProduct = null;


/* =========================
ERP PAGINATION
========================= */

let currentPage = 1;

let currentLimit = 10;

let currentSearch = "";

let currentCategory = "";

let totalPages = 1;

let searchTimer = null;


/* =========================
VARIANTES ERP
========================= */

let variants = [];

const itemTypeInput = document.getElementById("item-type");
const trackInventoryInput = document.getElementById("track-inventory");
const variantsSection = document.getElementById("variants-section");
const simpleInventory = document.getElementById("simple-inventory");
const simpleStockFields = document.getElementById("simple-stock-fields");

function hasVariantMode(){
  return document.querySelector('[name="selling-mode"]:checked')?.value === "variants";
}

function updateProductMode(){
  const isService = itemTypeInput.value === "service";
  const isDigital = itemTypeInput.value === "digital";
  const advanced = hasVariantMode();

  variantsSection.classList.toggle("is-hidden",!advanced);
  simpleInventory.classList.toggle("is-hidden",advanced);

  if(isService || isDigital){
    trackInventoryInput.checked = false;
    trackInventoryInput.disabled = true;
  }else{
    trackInventoryInput.disabled = false;
  }

  simpleStockFields.classList.toggle("is-hidden",!trackInventoryInput.checked);
  document.getElementById("item-type-help").textContent = isService
    ? "Para consultas, citas, instalaciones o cualquier trabajo que agendas."
    : isDigital
      ? "Para archivos, accesos, cursos o contenido que no usa existencias físicas."
      : "Ideal para artículos que entregas, envías o recogen en tu negocio.";
  document.getElementById("inventory-copy").textContent = trackInventoryInput.checked
    ? "Mercadia avisará cuando queden pocas unidades."
    : "Se podrá solicitar sin limitar la cantidad disponible.";
}

function addVariant(){

  const color =
    document.getElementById(
      "variant-color"
    ).value;

  const sizesInput =
    document.getElementById(
      "variant-size"
    ).value;

  const price =
    document.getElementById(
      "variant-price"
    ).value;

  const stock =
    document.getElementById(
      "variant-stock"
    )?.value || 0;

  const sku =
    document.getElementById(
      "variant-sku"
    )?.value || "";

  const cost =
    document.getElementById(
      "variant-cost"
    )?.value || 0;

  const imageInput =
    document.getElementById(
      "variant-image"
    );


  /* =========================
  VALIDACIÓN ERP
  ========================= */

  if(!color || !sizesInput || !price){
    alert("Completa el nombre de la opción, sus valores y el precio");
    return;
  }


  /* =========================
  INVENTARIO
  ========================= */

  if(editingProduct){

    if(
      !color &&
      variants.length > 0
    ){

      variants[0].stock = stock;

      variants[0].sku = sku;

      variants[0].cost = cost;

      renderVariants();

      alert(
        "Inventario actualizado"
      );

      return;

    }

  }


  /* =========================
  VALIDAR DUPLICADOS
  ========================= */

  const exists = variants.find(
    v => v.color.trim().toLowerCase() === color.trim().toLowerCase()
  );

  if(exists){

    alert(
      "Ese grupo de opciones ya fue agregado"
    );

    return;

  }


  /* =========================
  CREAR VARIANTE
  ========================= */

  const sizes =
    sizesInput
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);

  variants.push({

    color,

    sizes,

    price,

    stock,

    sku,

    cost,

    image:
      imageInput.files[0] || null

  });

  renderVariants();

  document.getElementById(
    "variant-color"
  ).value = "";

  document.getElementById(
    "variant-size"
  ).value = "";

  document.getElementById(
    "variant-price"
  ).value = "";

  if(
    document.getElementById(
      "variant-stock"
    )
  ){

    document.getElementById(
      "variant-stock"
    ).value = "";

  }

  if(
    document.getElementById(
      "variant-sku"
    )
  ){

    document.getElementById(
      "variant-sku"
    ).value = "";

  }

  if(
    document.getElementById(
      "variant-cost"
    )
  ){

    document.getElementById(
      "variant-cost"
    ).value = "";

  }

  imageInput.value = "";

}


function renderVariants(){

  const list =
    document.getElementById(
      "variants-list"
    );

  if(!list) return;

  list.innerHTML = "";

  const itemsHTML =
    variants.map((v,i)=>`
    <div class="variant-item">

      <div>

        <strong>${v.color}</strong>

        <br>

        Opciones:
        ${v.sizes.join(", ")}

        <br>

        Precio:
        $${v.price}

        <br>

        Stock:
        ${v.stock}

        <br>

        SKU:
        ${v.sku || "-"}

        <br>

        Costo:
        $${v.cost || 0}

      </div>

      <button onclick="removeVariant(${i})">
        Eliminar
      </button>

    </div>
    `).join("");

  list.innerHTML =
    itemsHTML;

}


function removeVariant(index){

  variants.splice(index,1);

  renderVariants();

}

window.addVariant = addVariant;
window.removeVariant = removeVariant;


/* =========================
LOAD PRODUCTS ERP
========================= */

async function loadProducts(){

  try{

    const data =
      await apiRequest(
        `/products/${store_id}?page=${currentPage}&limit=${currentLimit}&search=${encodeURIComponent(currentSearch)}&category=${encodeURIComponent(currentCategory)}`
      );

    const products =
      data.products || [];

    const pagination =
      data.pagination || {};

    const categories =
      data.categories || [];

    totalPages =
      pagination.totalPages || 1;


    /* =========================
    TABLE
    ========================= */

    const table =
      document.getElementById(
        "products-table"
      );

    table.innerHTML = "";

    let rowsHTML = "";


    /* =========================
    PRODUCTS
    ========================= */

    products.forEach(p=>{

      const imageHTML =
        p.image
        ? `<img src="${p.image}" width="60">`
        : "";

      const featuredStar =
        p.featured ? "⭐" : "";

      const totalStock =
        (p.variants || []).reduce(
          (acc,v)=>
            acc + Number(v.stock || 0),
          0
        );

      const stockStatus =
        p.track_inventory === false
        ? `<span class="stock-ok">Sin límite</span>`
        : totalStock <= 5
          ? `<span class="stock-low">Bajo</span>`
          : `<span class="stock-ok">OK</span>`;

      rowsHTML += `
      <tr>

        <td>${p.name || ""}</td>

        <td>$${p.price || 0}</td>

        <td>${p.track_inventory === false ? "No aplica" : totalStock}</td>

        <td>${stockStatus}</td>

        <td>${imageHTML}</td>

        <td>${featuredStar}</td>

        <td>

        <button
          class="action-btn edit-btn"
          onclick='editProduct(
            ${p.id},
            ${JSON.stringify(
              p.name || ""
            )},
            ${JSON.stringify(
              p.description || ""
            )},
            ${p.price || 0},
            ${JSON.stringify(
              p.category || ""
            )},
            ${p.featured},
            ${JSON.stringify(
              p.variants || []
            )},
            ${JSON.stringify(p.item_type || "product")},
            ${p.has_variants === true},
            ${p.track_inventory !== false}
          )'
        >
        Editar
        </button>

        <button
          class="action-btn delete-btn"
          onclick="deleteProduct(${p.id})"
        >
        Eliminar
        </button>

        </td>

      </tr>
      `;

    });

    table.innerHTML =
      rowsHTML;


    /* =========================
    PAGINATION INFO
    ========================= */

    const info =
      document.getElementById(
        "pagination-info"
      );

    if(info){

      const total =
        pagination.total || 0;

      const start =
        total === 0
        ? 0
        : (
            (currentPage - 1)
            * currentLimit
          ) + 1;

      const end =
        Math.min(
          currentPage * currentLimit,
          total
        );

      info.innerText =
        `Mostrando ${start}-${end} de ${total} productos`;

    }


    /* =========================
    CATEGORY FILTER
    ========================= */

    const categorySelect =
      document.getElementById(
        "filter-category"
      );

    if(
      categorySelect &&
      !categorySelect.dataset.loaded
    ){

      categorySelect.innerHTML = `
      <option value="">
        Todas las categorías
      </option>
      `;

      const categoryOptions =
        categories.map(c=>`
        <option value="${c.category}">
          ${c.category}
        </option>
        `).join("");

      categorySelect.innerHTML =
        categorySelect.innerHTML +
        categoryOptions;

      categorySelect.dataset.loaded =
        "true";

    }


    /* =========================
    PAGE INFO
    ========================= */

    const pageInfo =
  document.getElementById(
    "page-info"
  );

    if(pageInfo){

      pageInfo.innerText =
        `Página ${currentPage} de ${totalPages}`;

    }


    /* =========================
    BUTTONS
    ========================= */

    const prevBtn =
      document.getElementById(
        "prev-page"
      );

    const nextBtn =
      document.getElementById(
        "next-page"
      );

    if(prevBtn){

      prevBtn.disabled =
        currentPage <= 1;

    }

    if(nextBtn){

      nextBtn.disabled =
        currentPage >= totalPages;

    }

  }catch(err){

    console.error(
      "Error cargando productos",
      err
    );

  }

}


/* =========================
SEARCH
========================= */

window.searchProducts = () => {

  clearTimeout(searchTimer);

  searchTimer =
    setTimeout(
      () => {

        currentSearch =
          document.getElementById(
            "search-product"
          ).value;

        currentPage = 1;

        loadProducts();

      },
      250
    );

};


/* =========================
FILTER CATEGORY
========================= */

window.filterByCategory = () => {

  currentCategory =
    document.getElementById(
      "filter-category"
    ).value;

  currentPage = 1;

  loadProducts();

};


/* =========================
CHANGE LIMIT
========================= */

window.changeLimit = () => {

  currentLimit =
    parseInt(
      document.getElementById(
        "limit-products"
      ).value
    );

  currentPage = 1;

  loadProducts();

};


/* =========================
PAGINATION
========================= */

window.nextPage = () => {

  if(currentPage < totalPages){

    currentPage++;

    loadProducts();

  }

};

window.prevPage = () => {

  if(currentPage > 1){

    currentPage--;

    loadProducts();

  }

};


/* =========================
CREAR / EDITAR PRODUCTO
========================= */

async function createProduct(){

  const name =
    document.getElementById(
      "name"
    ).value;

  const description =
    document.getElementById(
      "description"
    ).value;

  const price =
    document.getElementById(
      "price"
    ).value;

  const category =
    document.getElementById(
      "category"
    ).value;

  const featured =
    document.getElementById(
      "featured"
    ).checked;

  if(!name || !price){

    alert(
      "Nombre y precio son obligatorios"
    );

    return;

  }

  const formData =
    new FormData();

  formData.append("name",name);

  formData.append(
    "description",
    description
  );

  formData.append("price",price);

  formData.append(
    "category",
    category
  );

  formData.append(
    "featured",
    featured
  );

  const itemType = itemTypeInput.value;
  const usesVariants = hasVariantMode();
  const trackInventory = itemType === "product" && trackInventoryInput.checked;
  formData.append("item_type",itemType);
  formData.append("has_variants",usesVariants);
  formData.append("track_inventory",trackInventory);


  /* =========================
  VARIANTES
  ========================= */

  let finalVariants = [];

  if(usesVariants && variants.length === 0){
    alert("Agrega al menos una opción o selecciona ‘una sola opción’.");
    return;
  }

  if(!usesVariants){
    finalVariants.push({
      color:"Única",
      size:"Única",
      price,
      stock:trackInventory ? (document.getElementById("simple-stock").value || 0) : 0,
      sku:document.getElementById("simple-sku").value.trim(),
      cost:document.getElementById("simple-cost").value || 0
    });
  }

  if(usesVariants) variants.forEach(v=>{

    v.sizes.forEach(size=>{

      finalVariants.push({

        color: v.color,

        size: size,

        price: v.price,

        stock: v.stock,

        sku: v.sku,

        cost: v.cost

      });

    });

  });

  formData.append(
    "variants",
    JSON.stringify(finalVariants)
  );


  /* =========================
  IMÁGENES COLOR
  ========================= */

  if(usesVariants) variants.forEach(v=>{

    if(v.image){

      formData.append(
        "color_images",
        v.image
      );

    }

  });

  if(usesVariants &&
    variants.some(v=>v.image)
  ){

    formData.append(
      "image_colors",
      JSON.stringify(
        variants.filter(v => v.image).map(v => v.color)
      )
    );

  }


  /* =========================
  IMAGEN PRINCIPAL
  ========================= */

  const image =
    document.getElementById(
      "image"
    ).files[0];

  if(image){

    formData.append(
      "image",
      image
    );

  }


  /* =========================
  CREATE / UPDATE
  ========================= */

  let url = `/products`;

  let method = "POST";

  if(editingProduct){

    url =
      `/products/${editingProduct}`;

    method = "PUT";

  }

  const res = await fetch(
    `${API_URL}/api${url}`,
    {

      method,

      headers:{
        Authorization:
          `Bearer ${token}`
      },

      body:formData

    }
  );

  if(!res.ok){

    alert(
      "Error al guardar producto"
    );

    return;

  }

  editingProduct = null;

  variants = [];

  renderVariants();

  document
    .getElementById(
      "product-form"
    )
    .reset();

  document
    .getElementById(
      "save-btn"
    )
    .innerText = "Agregar";

  document.querySelector('[name="selling-mode"][value="simple"]').checked = true;
  itemTypeInput.value = "product";
  trackInventoryInput.checked = true;
  updateProductMode();

  loadProducts();

}


/* =========================
EDITAR PRODUCTO
========================= */

function editProduct(
  id,
  name,
  description,
  price,
  category,
  featured,
  productVariants,
  itemType = "product",
  hasVariants = false,
  trackInventory = true
){

  editingProduct = id;

  document.getElementById(
    "name"
  ).value = name;

  document.getElementById(
    "description"
  ).value = description;

  document.getElementById(
    "price"
  ).value = price;

  document.getElementById(
    "category"
  ).value = category;

  document.getElementById(
    "featured"
  ).checked = featured;

  itemTypeInput.value = itemType || "product";
  const inferredVariants = hasVariants === true || productVariants.some(v =>
    String(v.color || "").toLowerCase() !== "única" ||
    String(v.size || "").toLowerCase() !== "única"
  );
  document.querySelector(`[name="selling-mode"][value="${inferredVariants ? "variants" : "simple"}"]`).checked = true;
  trackInventoryInput.checked = trackInventory !== false;

  const grouped = {};

  productVariants.forEach(v=>{

    if(!grouped[v.color]){

      grouped[v.color] = {

        color: v.color,

        sizes: [],

        price: v.price,

        stock:
          v.stock || 0,

        sku:
          v.sku || "",

        cost:
          v.cost || 0,

        image: null

      };

    }

    grouped[v.color]
      .sizes
      .push(v.size);

  });

  variants =
    inferredVariants ? Object.values(grouped) : [];

  if(!inferredVariants && productVariants[0]){
    document.getElementById("simple-stock").value = productVariants[0].stock || 0;
    document.getElementById("simple-sku").value = productVariants[0].sku || "";
    document.getElementById("simple-cost").value = productVariants[0].cost || 0;
  }

  updateProductMode();

  renderVariants();

  document
    .getElementById(
      "save-btn"
    )
    .innerText =
      "Guardar cambios";

  document.getElementById("product-form")?.scrollIntoView({
    behavior:"smooth",
    block:"start"
  });

}


/* =========================
ELIMINAR PRODUCTO
========================= */

async function deleteProduct(id){

  const ok =
    confirm(
      "¿Eliminar producto?"
    );

  if(!ok) return;

  await apiRequest(
    `/products/${id}`,
    "DELETE"
  );

  loadProducts();

}


/* =========================
INIT
========================= */

window.editProduct = editProduct;

window.deleteProduct = deleteProduct;

window.createProduct = createProduct;

document.querySelectorAll('[name="selling-mode"]').forEach(input =>
  input.addEventListener("change",updateProductMode)
);
itemTypeInput.addEventListener("change",updateProductMode);
trackInventoryInput.addEventListener("change",updateProductMode);

async function loadProductContext(){
  try{
    const response = await fetch(`${API_URL}/api/admin/store`,{
      headers:{ Authorization:`Bearer ${token}` }
    });
    const data = await response.json();
    const type = data.store?.business_type || "ecommerce";
    const nameLabel = document.querySelector('label[for="name"]');
    const nameInput = document.getElementById("name");
    const categoryInput = document.getElementById("category");

    if(type === "restaurant"){
      nameLabel.textContent = "Nombre del platillo o producto";
      nameInput.placeholder = "Ej. Hamburguesa especial";
      categoryInput.placeholder = "Ej. Bebidas, entradas o postres";
    }else if(type === "appointments" || type === "professional"){
      nameLabel.textContent = "Nombre del servicio";
      nameInput.placeholder = "Ej. Consulta inicial";
      categoryInput.placeholder = "Ej. Consultas, paquetes o tratamientos";
      itemTypeInput.value = "service";
    }
  }catch(error){
    console.warn("No se pudo personalizar el formulario",error);
  }
  updateProductMode();
}

await loadProductContext();
loadProducts();
