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

  if(!editingProduct){

    if(
      !color ||
      !sizesInput ||
      !price
    ){

      alert(
        "Completa color, tallas y precio"
      );

      return;

    }

    if(!imageInput.files[0]){

      alert(
        "Selecciona imagen para ese color"
      );

      return;

    }

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

  const exists =
    variants.find(
      v => v.color === color
    );

  if(exists){

    alert(
      "Ese color ya fue agregado"
    );

    return;

  }


  /* =========================
  CREAR VARIANTE
  ========================= */

  const sizes =
    sizesInput
      .split(",")
      .map(s => s.trim());

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

        Tallas:
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
        totalStock <= 5
        ? `<span class="stock-low">Bajo</span>`
        : `<span class="stock-ok">OK</span>`;

      rowsHTML += `
      <tr>

        <td>${p.name || ""}</td>

        <td>$${p.price || 0}</td>

        <td>${totalStock}</td>

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
            )}
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


  /* =========================
  VARIANTES
  ========================= */

  let finalVariants = [];

  variants.forEach(v=>{

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

  variants.forEach(v=>{

    if(v.image){

      formData.append(
        "color_images",
        v.image
      );

    }

  });

  if(
    variants.some(v=>v.image)
  ){

    formData.append(
      "image_colors",
      JSON.stringify(
        variants.map(v => v.color)
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
  productVariants
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
    Object.values(grouped);

  renderVariants();

  document
    .getElementById(
      "save-btn"
    )
    .innerText =
      "Guardar cambios";

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

loadProducts();
