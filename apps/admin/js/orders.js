const API_URL =
  window.MERCADIA_CONFIG?.API_URL ||
  "https://mercadia-back-production.up.railway.app/api";

const token =
  window.getAdminToken?.() || sessionStorage.getItem("token") || localStorage.getItem("mercadia_admin_token");

if(!token){

  window.location =
    "login.html";

}


/* =========================
GLOBAL DATA
========================= */

let allOrders = [];

let filterTimer = null;

const SALES_PIPELINE_STATUSES = [
  "PAID",
  "PREPARING",
  "SHIPPED",
  "DELIVERED"
];

function isConfirmedOrder(order){

  return SALES_PIPELINE_STATUSES.includes(
    String(order?.status || "")
      .toUpperCase()
  );

}

function getStatusClass(status){

  const normalizedStatus =
    String(status || "")
      .toUpperCase();

  if(normalizedStatus === "CANCELLED"){
    return "status-cancelled";
  }

  if(
    normalizedStatus === "PAID" ||
    normalizedStatus === "DELIVERED"
  ){
    return "status-paid";
  }

  return "status-pending";

}

function getStatusLabel(status){

  const labels = {
    PENDING: "Pendiente",
    PAID: "Pagado",
    PREPARING: "Preparando",
    SHIPPED: "Enviado",
    DELIVERED: "Entregado",
    CANCELLED: "Cancelado"
  };

  return labels[
    String(status || "")
      .toUpperCase()
  ] || status || "-";

}


/* =========================
INIT
========================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    loadOrders();

    setupFilters();

  }
);


/* =========================
GET ORDERS ERP
========================= */

async function loadOrders(){

  try{

    const res = await fetch(
      `${API_URL}/orders`,
      {
        headers:{
          Authorization:
            `Bearer ${token}`
        }
      }
    );

    const data =
      await res.json();

    console.log(
      "ORDERS RESPONSE:",
      data
    );


    /* =========================
    FIX RESPONSE
    ========================= */

    allOrders =
      data.orders || [];


    /* =========================
    KPIS
    ========================= */

    renderKPIs(
      allOrders
    );


    /* =========================
    TABLE
    ========================= */

    renderOrders(
      allOrders
    );

  }catch(err){

    console.error(
      "Error cargando pedidos",
      err
    );

  }

}


/* =========================
RENDER KPIS
========================= */

function renderKPIs(orders){

  const totalOrders =
    orders.length;

  const pending =
    orders.filter(
      o => o.status === "PENDING"
    ).length;

  const paid =
    orders.filter(
      isConfirmedOrder
    ).length;

  const totalSales =
    orders
      .filter(
        isConfirmedOrder
      )
      .reduce(
        (acc,o)=>
          acc + Number(o.total || 0),
        0
      );

  document.getElementById(
    "total-orders"
  ).innerText =
    totalOrders;

  document.getElementById(
    "pending-orders"
  ).innerText =
    pending;

  document.getElementById(
    "paid-orders"
  ).innerText =
    paid;

  document.getElementById(
    "total-sales"
  ).innerText =
    `$${totalSales.toFixed(2)}`;

}


/* =========================
RENDER ORDERS ERP
========================= */

function renderOrders(orders){

  const table =
    document.getElementById(
      "orders-table"
    );

  table.innerHTML = "";

  if(
    !orders ||
    orders.length === 0
  ){

    table.innerHTML = `
    <tr>
      <td colspan="9" class="empty">
        No hay pedidos
      </td>
    </tr>
    `;

    return;

  }

  const rowsHTML =
    orders.map(order=>{

    const productsHTML =
      (order.items || [])
      .map(item => `
        <div class="product-item">

          <strong>
            ${item.product_name || "-"}
          </strong>

          <br>

          ${item.variant_name || "-"}

          <br>

          Cantidad:
          ${item.quantity || 0}

          <br>

          $${Number(
            item.subtotal || 0
          ).toFixed(2)}

        </div>
      `)
      .join("");

    const statusClass =
      getStatusClass(order.status);

    const createdAt =
      order.created_at
      ? new Date(
          order.created_at
        ).toLocaleString()
      : "-";

    return `
    <tr>

      <td>
        #${order.id}
      </td>

      <td>
        ${order.customer_name || "-"}
      </td>

      <td>
        ${order.customer_phone || "-"}
      </td>

      <td>
        ${order.customer_address || "-"}
      </td>

      <td>

        <div class="order-products">

          ${productsHTML}

        </div>

      </td>

      <td>

        $${Number(
          order.total || 0
        ).toFixed(2)}

      </td>

      <td>

        <span class="status ${statusClass}">

          ${getStatusLabel(order.status)}

        </span>

      </td>

      <td>
        ${createdAt}
      </td>

      <td>

        <div class="actions">

          <select
            id="status-${order.id}"
          >

            <option
              value="PENDING"
              ${
                order.status === "PENDING"
                ? "selected"
                : ""
              }
            >
              Pendiente
            </option>

            <option
              value="PAID"
              ${
                order.status === "PAID"
                ? "selected"
                : ""
              }
            >
              Pagado
            </option>

            <option
              value="PREPARING"
              ${
                order.status === "PREPARING"
                ? "selected"
                : ""
              }
            >
              Preparando
            </option>

            <option
              value="SHIPPED"
              ${
                order.status === "SHIPPED"
                ? "selected"
                : ""
              }
            >
              Enviado
            </option>

            <option
              value="DELIVERED"
              ${
                order.status === "DELIVERED"
                ? "selected"
                : ""
              }
            >
              Entregado
            </option>

            <option
              value="CANCELLED"
              ${
                order.status === "CANCELLED"
                ? "selected"
                : ""
              }
            >
              Cancelado
            </option>

          </select>

          <button
            onclick="updateStatus(${order.id})"
          >
            Actualizar
          </button>

        </div>

      </td>

    </tr>
    `;

  }).join("");

  table.innerHTML =
    rowsHTML;

}


/* =========================
UPDATE STATUS ERP
========================= */

window.updateStatus =
  async (orderId) => {

  try{

    const status =
      document.getElementById(
        `status-${orderId}`
      ).value;

    const confirmAction =
      confirm(
        `¿Cambiar pedido #${orderId} a ${status}?`
      );

    if(!confirmAction){

      return;

    }

    const res = await fetch(
      `${API_URL}/orders/${orderId}/status`,
      {

        method:"PATCH",

        headers:{

          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${token}`

        },

        body: JSON.stringify({

          status

        })

      }
    );

    const data =
      await res.json();

    if(!res.ok){

      alert(

        data.error ||

        "Error actualizando pedido"

      );

      return;

    }

    alert(

      data.message ||

      "Pedido actualizado"

    );

    loadOrders();

  }catch(err){

    console.error(err);

    alert(
      "Error actualizando pedido"
    );

  }

};


/* =========================
FILTERS ERP
========================= */

function setupFilters(){

  const searchInput =
    document.getElementById(
      "search-order"
    );

  const statusFilter =
    document.getElementById(
      "filter-status"
    );

  searchInput.addEventListener(
    "keyup",
    () => {

      clearTimeout(filterTimer);

      filterTimer =
        setTimeout(
          applyFilters,
          200
        );

    }
  );

  statusFilter.addEventListener(
    "change",
    applyFilters
  );

}


/* =========================
APPLY FILTERS
========================= */

function applyFilters(){

  const search =
    document
      .getElementById(
        "search-order"
      )
      .value
      .toLowerCase();

  const status =
    document
      .getElementById(
        "filter-status"
      )
      .value;

  let filtered =
    [...allOrders];


  /* =========================
  SEARCH
  ========================= */

  if(search){

    filtered =
      filtered.filter(order =>

        (order.customer_name || "")
        .toLowerCase()
        .includes(search)

        ||

        (order.customer_phone || "")
        .toLowerCase()
        .includes(search)

      );

  }


  /* =========================
  STATUS FILTER
  ========================= */

  if(status){

    filtered =
      filtered.filter(
        order =>
          order.status === status
      );

  }


  /* =========================
  RENDER
  ========================= */

  renderKPIs(filtered);

  renderOrders(filtered);

}
