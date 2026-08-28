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


function getInventoryValue(item){

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

  return toNumber(
    item.available_stock !== undefined
      ? item.available_stock
      : item.stock
  );

}

function getPotentialRevenue(item){

  return getAvailableStock(item) *
    toNumber(item.price);

}

function getPotentialProfit(item){

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
      data.filter(item => item.has_variants === true).length,

    lowStock:
      data.filter(
        item =>
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
      <td colspan="11" class="empty">
        No hay inventario
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


  /* =========================
  TABLE DATA
  ========================= */

  const rowsHTML =
    paginatedData.map(item=>{

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
        ${item.product_name || "-"}
      </td>

      <td>

        ${
          item.image
          ? `
            <img
              src="${item.image}"
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
        ${item.category || "-"}
      </td>

      <td>
        ${item.has_variants === true
          ? `${item.color || "-"} / ${item.size || "-"}`
          : "Sin variantes"}
      </td>

      <td>
        ${item.sku || "-"}
      </td>

      <td>
        ${stock}
        ${reservedStock > 0
          ? `<small style="display:block;color:#667085">${reservedStock} reservadas</small>`
          : ""}
      </td>

      <td
        style="
          min-width:120px;
          white-space:nowrap;
        "
      >
        ${formatMoney(item.price)}
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

        <span class="${stockClass}">

          ${stockLabel}

        </span>

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
