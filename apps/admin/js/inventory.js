await window.adminSessionReady;

const API_URL =
  window.MERCADIA_CONFIG?.API_URL ||
  "https://mercadia-back-production.up.railway.app/api";

const token =
  window.getAdminToken?.() || sessionStorage.getItem("token") || localStorage.getItem("mercadia_admin_token");

if(!token){

  window.location = "/?login=1";

}


/* =========================
GLOBAL DATA
========================= */

let inventoryData = [];

let movementsData = [];


/* =========================
PAGINATION INVENTORY
========================= */

let inventoryPage = 1;

let inventoryLimit = 10;

let currentInventoryTotal = 0;

let filterTimer = null;


/* =========================
INIT
========================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    loadInventory();

    loadMovements();

    setupFilters();

  }
);


/* =========================
LOAD INVENTORY ERP
========================= */

async function loadInventory(){

  try{

    const res = await fetch(
      `${API_URL}/inventory`,
      {
        headers:{
          Authorization:
            `Bearer ${token}`
        }
      }
    );

    const data =
      await res.json();

    inventoryData =
      data.inventory || [];

    renderInventoryKPIs(
      inventoryData
    );

    renderInventoryTable(
      inventoryData
    );

  }catch(err){

    console.error(
      "Error inventory",
      err
    );

  }

}


/* =========================
LOAD MOVEMENTS ERP
========================= */

async function loadMovements(){

  try{

    const res = await fetch(
      `${API_URL}/inventory/movements`,
      {
        headers:{
          Authorization:
            `Bearer ${token}`
        }
      }
    );

    const data =
      await res.json();

    movementsData =
      data.movements || [];

    renderMovementsTable(
      movementsData
    );

  }catch(err){

    console.error(
      "Error movements",
      err
    );

  }

}


/* =========================
KPIS
========================= */

function toNumber(value){

  return Number(value || 0);

}


function formatMoney(value){

  return new Intl.NumberFormat(
    "es-MX",
    {
      style:"currency",
      currency:"MXN"
    }
  ).format(
    toNumber(value)
  );

}

function escapeHTML(value){

  return String(value ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");

}

const itemTypeLabels = {
  product:"Producto físico",
  dish:"Platillo o bebida",
  service:"Servicio",
  appointment:"Cita o reservación",
  digital:"Producto digital",
  quote:"Proyecto para cotizar"
};


function getInventoryValue(item){

  if(item.track_inventory === false) return 0;

  const stock =
    toNumber(item.stock);

  const cost =
    toNumber(item.cost);

  if(cost > 0){

    return stock * cost;

  }

  return toNumber(
    item.inventory_value
  );

}

function getAvailableStock(item){

  if(item.track_inventory === false) return 0;

  return toNumber(
    item.available_stock !== undefined
      ? item.available_stock
      : item.stock
  );

}

function getPotentialRevenue(item){

  if(item.track_inventory === false) return 0;

  return getAvailableStock(item) *
    toNumber(item.price);

}

function getPotentialProfit(item){

  if(item.track_inventory === false) return 0;

  return getAvailableStock(item) *
    (toNumber(item.price) - toNumber(item.cost));

}


function getInventoryKPIs(data){

  return {

    totalInventoryValue:
      data.reduce(
        (acc,item)=>
          acc + getInventoryValue(item),
        0
      ),

    totalVariants:
      data.filter(item =>
        item.track_inventory === true &&
        item.has_variants === true
      ).length,

    lowStock:
      data.filter(
        item =>
          item.track_inventory === true &&
          getAvailableStock(item) <= 5
      ).length,

    totalStock:
      data.reduce(
        (acc,item)=>
          acc + getAvailableStock(item),
        0
      ),

    potentialRevenue:
      data.reduce(
        (acc,item) => acc + getPotentialRevenue(item),
        0
      ),

    potentialProfit:
      data.reduce(
        (acc,item) => acc + getPotentialProfit(item),
        0
      )

  };

}


function renderInventoryKPIs(data){

  const kpis =
    getInventoryKPIs(data || []);

  document.getElementById(
    "inventory-value"
  ).innerText =
    formatMoney(
      kpis.totalInventoryValue
    );

  document.getElementById(
    "total-variants"
  ).innerText =
    kpis.totalVariants || 0;

  document.getElementById(
    "low-stock"
  ).innerText =
    kpis.lowStock || 0;

  document.getElementById(
    "total-stock"
  ).innerText =
    kpis.totalStock || 0;

  document.getElementById(
    "potential-revenue"
  ).innerText =
    formatMoney(kpis.potentialRevenue);

  document.getElementById(
    "potential-profit"
  ).innerText =
    formatMoney(kpis.potentialProfit);

}


/* =========================
RENDER INVENTORY
========================= */

function renderInventoryTable(data){

  const table =
    document.getElementById(
      "inventory-table"
    );

  table.innerHTML = "";

  if(data.length === 0){

    table.innerHTML = `
    <tr>
      <td colspan="13" class="empty">
        No hay productos ni servicios publicados
      </td>
    </tr>
    `;

    renderInventoryPagination(0);

    return;

  }


  /* =========================
  PAGINATION
  ========================= */

  const start =
    (inventoryPage - 1)
    * inventoryLimit;

  const end =
    start + inventoryLimit;

  const paginatedData =
    data.slice(start,end);

  const renderedProductActions = new Set();


  /* =========================
  TABLE DATA
  ========================= */

  const rowsHTML =
    paginatedData.map(item=>{

    const productId = Number(item.product_id);
    const showActions = !renderedProductActions.has(productId);
    renderedProductActions.add(productId);

    const stock =
      getAvailableStock(item);

    const reservedStock =
      toNumber(item.reserved_stock);

    const cost =
      toNumber(item.cost);

    const inventoryValue =
      getInventoryValue(item);

    const potentialProfit =
      getPotentialProfit(item);

    const stockClass =
      stock <= 5
      ? "stock-low"
      : "stock-ok";

    const stockLabel =
      stock <= 5
      ? "BAJO"
      : "OK";

    return `
    <tr>

      <td>
        ${escapeHTML(item.product_name || "-")}
      </td>

      <td>
        ${escapeHTML(itemTypeLabels[item.item_type] || "Producto físico")}
      </td>

      <td>

        ${
          item.image
          ? `
            <img
              src="${escapeHTML(item.image)}"
              style="
                width:60px;
                height:60px;
                object-fit:cover;
                border-radius:10px;
              "
            >
          `
          : "-"
        }

      </td>

      <td>
        ${escapeHTML(item.category || "-")}
      </td>

      <td>
        ${item.has_variants === true
          ? `${escapeHTML(item.color || "-")} / ${escapeHTML(item.size || "-")}`
          : "Sin variantes"}
      </td>

      <td>
        ${escapeHTML(item.sku || "-")}
      </td>

      <td>
        ${item.track_inventory === false ? "No aplica" : stock}
        ${item.track_inventory !== false && reservedStock > 0
          ? `<small style="display:block;color:#667085">${reservedStock} reservadas</small>`
          : ""}
      </td>

      <td
        style="
          min-width:120px;
          white-space:nowrap;
        "
      >
        ${item.item_type === "quote" ? "Por cotizar" : formatMoney(item.price)}
      </td>

      <td
        style="
          min-width:120px;
          white-space:nowrap;
        "
      >
        ${formatMoney(cost)}
      </td>

      <td
        style="
          min-width:160px;
          font-weight:600;
          white-space:nowrap;
        "
      >
        ${formatMoney(inventoryValue)}
      </td>

      <td
        style="
          min-width:160px;
          font-weight:700;
          white-space:nowrap;
        "
      >
        ${formatMoney(potentialProfit)}
      </td>

      <td>

        <span class="${item.track_inventory === false ? "" : stockClass}">

          ${item.track_inventory === false ? "Sin control de stock" : stockLabel}

        </span>

      </td>

      <td>
        ${showActions ? `
          <div class="actions">
            <button type="button" class="action-btn edit-btn" onclick="editInventoryProduct(${productId})">Editar</button>
            <button type="button" class="action-btn delete-btn" onclick="deleteInventoryProduct(${productId})">Eliminar</button>
          </div>
        ` : ""}
      </td>

    </tr>
    `;

  }).join("");

  table.innerHTML =
    rowsHTML;

  renderInventoryPagination(
    data.length
  );

}


/* =========================
PAGINATION UI
========================= */

function renderInventoryPagination(totalItems){

  currentInventoryTotal =
    totalItems;

  const totalPages =
    Math.max(
      1,
      Math.ceil(
      totalItems / inventoryLimit
      )
    );

  let pagination =
    document.getElementById(
      "inventory-pagination"
    );

  if(!pagination){

    pagination =
      document.createElement("div");

    pagination.id =
      "inventory-pagination";

    pagination.className =
      "pagination";

    pagination.style.marginTop =
      "20px";

    pagination.style.display =
      "flex";

    pagination.style.justifyContent =
      "center";

    pagination.style.alignItems =
      "center";

    pagination.style.gap =
      "10px";

    document
      .querySelector(".table-card")
      .appendChild(pagination);

  }

  pagination.innerHTML = `

    <button
      ${
        inventoryPage <= 1
        ? "disabled"
        : ""
      }
      onclick="prevInventoryPage()"
    >
      Anterior
    </button>

    <span
      style="
        font-weight:600;
      "
    >
      Página ${inventoryPage}
      de ${totalPages}
    </span>

    <button
      ${
        inventoryPage >= totalPages
        ? "disabled"
        : ""
      }
      onclick="nextInventoryPage()"
    >
      Siguiente
    </button>

  `;

}


/* =========================
NEXT PAGE
========================= */

window.nextInventoryPage = () => {

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        currentInventoryTotal
        / inventoryLimit
      )
    );

  if(
    inventoryPage < totalPages
  ){

    inventoryPage++;

    applyFilters(false);

  }

};


/* =========================
PREV PAGE
========================= */

window.prevInventoryPage = () => {

  if(inventoryPage > 1){

    inventoryPage--;

    applyFilters(false);

  }

};


/* =========================
RENDER MOVEMENTS
========================= */

function renderMovementsTable(data){

  const table =
    document.getElementById(
      "movements-table"
    );

  table.innerHTML = "";

  if(data.length === 0){

    table.innerHTML = `
    <tr>
      <td colspan="10" class="empty">
        No hay movimientos
      </td>
    </tr>
    `;

    return;

  }

  const rowsHTML =
    data.map(movement=>{

    let movementClass =
      "movement-adjustment";

    if(
      movement.type === "SALE"
    ){

      movementClass =
        "movement-sale";

    }

    if(
      movement.type ===
      "CANCELLED_ORDER"
    ){

      movementClass =
        "movement-cancelled";

    }

    const createdAt =
      movement.created_at
      ? new Date(
          movement.created_at
        ).toLocaleString()
      : "-";

    return `
    <tr>

      <td>

        <span class="${movementClass}">

          ${movement.type}

        </span>

      </td>

      <td>
        ${movement.product_name || "-"}
      </td>

      <td>
        ${movement.color || "-"}
        /
        ${movement.size || "-"}
      </td>

      <td>
        ${movement.sku || "-"}
      </td>

      <td>
        ${movement.quantity || 0}
      </td>

      <td>
        ${movement.previous_stock || 0}
      </td>

      <td>
        ${movement.new_stock || 0}
      </td>

      <td>

        ${movement.reference_type || "-"}

        #

        ${movement.reference_id || "-"}

      </td>

      <td>
        ${movement.notes || "-"}
      </td>

      <td>
        ${createdAt}
      </td>

    </tr>
    `;

  }).join("");

  table.innerHTML =
    rowsHTML;

}


/* =========================
FILTERS
========================= */

function setupFilters(){

  const searchInput =
    document.getElementById(
      "search-inventory"
    );

  const movementFilter =
    document.getElementById(
      "filter-movement"
    );

  const offerTypeFilter =
    document.getElementById(
      "filter-offer-type"
    );

  searchInput.addEventListener(
    "keyup",
    () => {

      clearTimeout(filterTimer);

      filterTimer =
        setTimeout(
          () => applyFilters(),
          200
        );

    }
  );

  movementFilter.addEventListener(
    "change",
    applyFilters
  );

  offerTypeFilter.addEventListener(
    "change",
    applyFilters
  );

}


/* =========================
APPLY FILTERS
========================= */

function applyFilters(resetPage = true){

  const search =
    document
      .getElementById(
        "search-inventory"
      )
      .value
      .toLowerCase();

  const movementType =
    document
      .getElementById(
        "filter-movement"
      )
      .value;

  const offerType =
    document
      .getElementById(
        "filter-offer-type"
      )
      .value;


  /* =========================
  INVENTORY FILTER
  ========================= */

  let filteredInventory =
    [...inventoryData];

  if(search){

    filteredInventory =
      filteredInventory.filter(item =>

        (item.product_name || "")
        .toLowerCase()
        .includes(search)

        ||

        (item.sku || "")
        .toLowerCase()
        .includes(search)

        ||

        (item.category || "")
        .toLowerCase()
        .includes(search)

      );

  }

  if(offerType){

    filteredInventory =
      filteredInventory.filter(
        item => item.item_type === offerType
      );

  }

  if(resetPage){

    inventoryPage = 1;

  }

  renderInventoryKPIs(
    filteredInventory
  );

  renderInventoryTable(
    filteredInventory
  );


  /* =========================
  MOVEMENTS FILTER
  ========================= */

  let filteredMovements =
    [...movementsData];

  if(search){

    filteredMovements =
      filteredMovements.filter(m =>

        (m.product_name || "")
        .toLowerCase()
        .includes(search)

        ||

        (m.sku || "")
        .toLowerCase()
        .includes(search)

      );

  }

  if(movementType){

    filteredMovements =
      filteredMovements.filter(
        m =>
          m.type === movementType
      );

  }

  renderMovementsTable(
    filteredMovements
  );

}


function getEditableProduct(productId){

  const rows = inventoryData.filter(
    item => Number(item.product_id) === Number(productId)
  );

  const first = rows[0];
  if(!first) return null;

  return {
    id:first.product_id,
    name:first.product_name,
    description:first.description,
    price:first.price,
    category:first.category,
    featured:first.featured,
    item_type:first.item_type,
    has_variants:first.has_variants,
    track_inventory:first.track_inventory,
    variants:rows
      .filter(item => item.id)
      .map(item => ({
        id:item.id,
        color:item.color,
        size:item.size,
        price:item.price,
        stock:item.stock,
        reserved_stock:item.reserved_stock,
        sku:item.sku,
        cost:item.cost
      }))
  };

}


window.editInventoryProduct = productId => {

  const product = getEditableProduct(productId);
  if(!product) return;

  sessionStorage.setItem(
    "mercadia_edit_product",
    JSON.stringify(product)
  );

  window.location.href =
    `products.html?edit=${encodeURIComponent(productId)}`;

};


window.deleteInventoryProduct = async productId => {

  if(!window.confirm("¿Eliminar este producto o servicio?")) return;

  const response = await fetch(
    `${API_URL}/products/${encodeURIComponent(productId)}`,
    {
      method:"DELETE",
      headers:{
        Authorization:`Bearer ${token}`
      }
    }
  );

  if(!response.ok){
    const data = await response.json().catch(() => null);
    window.alert(data?.error || "No se pudo eliminar");
    return;
  }

  await loadInventory();
  applyFilters();

};
