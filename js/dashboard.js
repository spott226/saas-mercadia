import { getProducts } from "./api.js";

const API_URL =
  "https://mercadia-back-production.up.railway.app/api";

const token =
  sessionStorage.getItem("token");

const store =
  sessionStorage.getItem("store_id");

if (!store || !token) {

  window.location =
    "login.html";

}


/* =========================
GLOBAL STATS
========================= */

let orders = [];

let monthlySales = 0;

let totalRevenue = 0;

let totalOrders = 0;

let averageTicket = 0;

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


/* =========================
INIT
========================= */

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    await loadDashboardStats();

  }
);


/* =========================
LOAD DASHBOARD STATS
========================= */

async function loadDashboardStats(){

  try {

    /* =========================
    PRODUCTS
    ========================= */

    const response =
      await getProducts(store);

    console.log(
      "PRODUCTS RESPONSE:",
      response
    );

    const products =

      response?.products

      ||

      response

      ||

      [];


    /* =========================
    ORDERS
    ========================= */

    const ordersRes =
      await fetch(
        `${API_URL}/orders`,
        {
          headers:{
            Authorization:
              `Bearer ${token}`
          }
        }
      );

    const ordersData =
      await ordersRes.json();

    console.log(
      "ORDERS DASHBOARD:",
      ordersData
    );

    orders =
      ordersData.orders || [];

    const paidOrders =
      orders.filter(
        isPaidOrder
      );


    /* =========================
    TOTAL PRODUCTS
    ========================= */

    const totalProducts =
      products.length || 0;

    const totalProductsElement =
      document.getElementById(
        "total-products"
      );

    if(totalProductsElement){

      totalProductsElement.innerText =
        totalProducts;

    }


    /* =========================
    LOW STOCK
    ========================= */

    let lowStock = 0;

    products.forEach(product => {

      const variants =
        product.variants || [];

      variants.forEach(v => {

        if(
          Number(v.stock) <= 5
        ){

          lowStock++;

        }

      });

    });

    const lowStockElement =
      document.getElementById(
        "low-stock"
      );

    if(lowStockElement){

      lowStockElement.innerText =
        lowStock;

    }


    /* =========================
    TOTAL ORDERS
    ========================= */

    totalOrders =
      orders.length;

    const ordersElement =
      document.getElementById(
        "total-orders"
      );

    if(ordersElement){

      ordersElement.innerText =
        totalOrders;

    }


    /* =========================
    MONTH SALES
    ========================= */

    const now =
      new Date();

    const currentMonth =
      now.getMonth();

    const currentYear =
      now.getFullYear();

    let monthTotal = 0;

    paidOrders.forEach(order => {

      const orderDate =
        new Date(order.created_at);

      if(

        orderDate.getMonth()
        === currentMonth

        &&

        orderDate.getFullYear()
        === currentYear

      ){

        monthTotal +=
          Number(order.total || 0);

      }

    });

    monthlySales =
      monthTotal;

    const salesElement =
      document.getElementById(
        "month-sales"
      );

    if(salesElement){

      salesElement.innerText =
        formatMoney(monthTotal);

    }


    /* =========================
    TOTAL REVENUE
    ========================= */

    totalRevenue =
      paidOrders.reduce(

        (acc,order)=>

          acc +
          Number(order.total || 0),

        0

      );

    const revenueElement =
      document.getElementById(
        "total-revenue"
      );

    if(revenueElement){

      revenueElement.innerText =
        formatMoney(totalRevenue);

    }


    /* =========================
    AVG TICKET
    ========================= */

    averageTicket =

      paidOrders.length > 0

      ?

      totalRevenue / paidOrders.length

      :

      0;

    const avgElement =
      document.getElementById(
        "average-ticket"
      );

    if(avgElement){

      avgElement.innerText =
        formatMoney(averageTicket);

    }


    /* =========================
    RECENT ORDERS
    ========================= */

    renderRecentOrders(

      orders.slice(0,5)

    );


    /* =========================
    BEST SELLERS
    ========================= */

    renderBestSellers(
      products
    );

  } catch(err){

    console.error(
      "Dashboard error:",
      err
    );

  }

}


/* =========================
RECENT ORDERS
========================= */

function renderRecentOrders(orders){

  const table =
    document.getElementById(
      "recent-orders"
    );

  if(!table) return;

  table.innerHTML = "";

  if(
    !orders ||
    orders.length === 0
  ){

    table.innerHTML = `
    
      <tr>

        <td colspan="5">

          No hay pedidos

        </td>

      </tr>

    `;

    return;

  }

  const rowsHTML =
    orders.map(order=>{

    return `
    
      <tr>

        <td>

          #${order.id}

        </td>

        <td>

          ${order.customer_name || "-"}

        </td>

        <td>

          $${Number(
            order.total || 0
          ).toLocaleString()}

        </td>

        <td>

          ${order.status || "-"}

        </td>

        <td>

          ${
            order.created_at

            ?

            new Date(
              order.created_at
            ).toLocaleDateString()

            :

            "-"

          }

        </td>

      </tr>

    `;

  }).join("");

  table.innerHTML =
    rowsHTML;

}


/* =========================
BEST SELLERS
========================= */

function renderBestSellers(products){

  const container =
    document.getElementById(
      "best-sellers"
    );

  if(!container) return;

  container.innerHTML = "";

  if(
    !products ||
    products.length === 0
  ){

    container.innerHTML = `
      <div class="best-product">
        No hay productos
      </div>
    `;

    return;

  }

  const featured =
    products.filter(
      p => p.featured === true
    );

  const productsToShow =

    featured.length > 0

    ?

    featured

    :

    products.slice(0,5);

  const productsHTML =
    productsToShow.map(product=>{

    const image =
      product.image
      ? `
        <img
          src="${product.image}"
          style="
            width:60px;
            height:60px;
            object-fit:cover;
            border-radius:10px;
            margin-bottom:10px;
          "
        >
      `
      : "";

    return `

      <div class="best-product">

        ${image}

        <strong>

          ${product.name || "-"}

        </strong>

        <br><br>

        Precio:
        $${Number(
          product.price || 0
        ).toLocaleString()}

      </div>

    `;

  }).join("");

  container.innerHTML =
    productsHTML;

}


/* =========================
EXPORT MONTH REPORT
========================= */

window.exportMonthReport = () => {

  const now =
    new Date();

  const report = {

    month:
      now.toLocaleString(
        "es-MX",
        {
          month:"long"
        }
      ),

    totalOrders,

    monthlySales,

    totalRevenue,

    averageTicket,

    generatedAt:
      now.toLocaleString()

  };

  const blob =
    new Blob(

      [
        JSON.stringify(
          report,
          null,
          2
        )
      ],

      {
        type:"application/json"
      }

    );

  const url =
    URL.createObjectURL(blob);

  const a =
    document.createElement("a");

  a.href = url;

  a.download =
    `reporte-${Date.now()}.json`;

  a.click();

  URL.revokeObjectURL(url);

};
