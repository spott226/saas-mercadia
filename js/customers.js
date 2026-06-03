const API_URL =
  "https://mercadia-back-production.up.railway.app/api";

const token =
  sessionStorage.getItem("token");

if(!token){

  window.location = "login.html";

}


/* =========================
GLOBAL DATA
========================= */

let customersData = [];

let searchTimer = null;

const SALES_PIPELINE_STATUSES = [
  "PAID",
  "PREPARING",
  "SHIPPED",
  "DELIVERED"
];


function isPaidOrder(order){

  return SALES_PIPELINE_STATUSES.includes(
    String(
    order?.status || ""
  ).toUpperCase()
  );

}


function formatMoney(value){

  return new Intl.NumberFormat(
    "es-MX",
    {
      style:"currency",
      currency:"MXN"
    }
  ).format(
    Number(value || 0)
  );

}


function getPaidOrders(customer){

  return (customer.orders || [])
    .filter(
      isPaidOrder
    );

}


function normalizeCustomer(customer){

  const paidOrders =
    getPaidOrders(customer);

  const totalSpent =
    paidOrders.reduce(
      (acc,order)=>
        acc + Number(order.total || 0),
      0
    );

  return {

    ...customer,

    orders:
      paidOrders,

    total_orders:
      paidOrders.length,

    total_spent:
      totalSpent

  };

}


function getConfirmedCustomers(customers){

  return customers.map(
    normalizeCustomer
  );

}


/* =========================
INIT
========================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    loadCustomers();

    setupSearch();

  }
);


/* =========================
LOAD CUSTOMERS ERP
========================= */

async function loadCustomers(){

  try{

    const res = await fetch(
      `${API_URL}/customers`,
      {
        headers:{
          Authorization:
            `Bearer ${token}`
        }
      }
    );

    const data =
      await res.json();

    customersData =
      getConfirmedCustomers(
        data.customers || []
      );

    renderKPIs(
      customersData
    );

    renderCustomers(
      customersData
    );

  }catch(err){

    console.error(
      "Error loading customers",
      err
    );

  }

}


/* =========================
RENDER KPIS
========================= */

function getCustomerKPIs(customers){

  return {

    totalCustomers:
      customers.length,

    totalRevenue:
      customers.reduce(
        (acc,customer)=>
          acc + Number(customer.total_spent || 0),
        0
      ),

    frequentCustomers:
      customers.filter(
        customer =>
          Number(customer.total_orders || 0) >= 2
      ).length

  };

}


function renderKPIs(customers){

  const kpis =
    getCustomerKPIs(customers || []);

  document.getElementById(
    "total-customers"
  ).innerText =
    kpis.totalCustomers || 0;

  document.getElementById(
    "total-revenue"
  ).innerText =
    formatMoney(
      kpis.totalRevenue
    );

  document.getElementById(
    "frequent-customers"
  ).innerText =
    kpis.frequentCustomers || 0;

}


/* =========================
RENDER CUSTOMERS
========================= */

function renderCustomers(customers){

  const table =
    document.getElementById(
      "customers-table"
    );

  table.innerHTML = "";

  if(customers.length === 0){

    table.innerHTML = `
    <tr>
      <td colspan="8" class="empty">
        No hay clientes
      </td>
    </tr>
    `;

    return;

  }

  const rowsHTML =
    customers.map(customer=>{

    const frequent =
      Number(
        customer.total_orders
      ) >= 2;

    const badge =
      frequent
      ? `
        <span class="badge badge-frequent">
          Frecuente
        </span>
      `
      : Number(customer.total_orders || 0) === 1
      ? `
        <span class="badge badge-normal">
          Activo
        </span>
      `
      : `
        <span class="badge badge-normal">
          Registrado
        </span>
      `;

    const ordersHTML =
      (customer.orders || [])
      .map(order => `
        <div class="order-item">

          <strong>
            Pedido #${order.id}
          </strong>

          <br>

          Estado:
          ${order.status}

          <br>

          Total:
          ${formatMoney(order.total)}

        </div>
      `)
      .join("");

    const createdAt =
      customer.created_at
      ? new Date(
          customer.created_at
        ).toLocaleDateString()
      : "-";

    return `
    <tr>

      <td>
        ${customer.name || "-"}
      </td>

      <td>
        ${customer.phone || "-"}
      </td>

      <td>
        ${customer.address || "-"}
      </td>

      <td>
        ${customer.total_orders || 0}
      </td>

      <td>
        ${formatMoney(
          customer.total_spent
        )}
      </td>

      <td>
        ${badge}
      </td>

      <td>

        <div class="orders-box">

          ${
            ordersHTML ||
            "Sin pedidos"
          }

        </div>

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
SEARCH ERP
========================= */

function setupSearch(){

  const input =
    document.getElementById(
      "search-customer"
    );

  input.addEventListener(
    "keyup",
    () => {

      clearTimeout(searchTimer);

      searchTimer =
        setTimeout(
          applySearch,
          200
        );

    }
  );

}


/* =========================
APPLY SEARCH
========================= */

function applySearch(){

  const search =
    document
      .getElementById(
        "search-customer"
      )
      .value
      .toLowerCase();

  if(!search){

    renderCustomers(
      customersData
    );

    renderKPIs(
      customersData
    );

    return;

  }

  const filtered =
    customersData.filter(customer =>

      (customer.name || "")
      .toLowerCase()
      .includes(search)

      ||

      (customer.phone || "")
      .toLowerCase()
      .includes(search)

    );

  renderCustomers(filtered);

  renderKPIs(filtered);

}
