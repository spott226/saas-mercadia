import { getProducts } from "./api.js";

await window.adminSessionReady;

const API_URL = window.MERCADIA_CONFIG?.API_URL ||
  "https://mercadia-back-production.up.railway.app/api";
const token = window.getAdminToken?.() || sessionStorage.getItem("token") ||
  localStorage.getItem("mercadia_admin_token");
const store = window.getAdminStoreId?.() || sessionStorage.getItem("store_id") ||
  localStorage.getItem("mercadia_admin_store_id");

if(!store || !token) window.location = "/?login=1";

const SALES_STATUSES = ["PAID","PREPARING","SHIPPED","DELIVERED"];
let orders = [];
let products = [];
let inventory = [];
let currentReport = {};

const toNumber = value => Number(value || 0);
const isPaidOrder = order => SALES_STATUSES.includes(String(order?.status || "").toUpperCase());
const formatMoney = value => new Intl.NumberFormat("es-MX",{
  style:"currency",currency:"MXN"
}).format(toNumber(value));

function setText(id,value){
  const element = document.getElementById(id);
  if(element) element.textContent = value;
}

function localDateValue(date = new Date()){
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2,"0"),
    String(date.getDate()).padStart(2,"0")
  ].join("-");
}

function setupPeriodControls(){
  const now = new Date();
  document.getElementById("report-month").value =
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,"0")}`;
  document.getElementById("report-year").value = now.getFullYear();
  document.getElementById("report-date").value = localDateValue(now);
  document.getElementById("report-from").value = localDateValue(new Date(now.getFullYear(),now.getMonth(),1));
  document.getElementById("report-to").value = localDateValue(now);

  document.getElementById("report-period").addEventListener("change",() => {
    updatePeriodControlVisibility();
    applyDashboardPeriod();
  });
  document.getElementById("apply-period").addEventListener("click",applyDashboardPeriod);
  ["report-month","report-year","report-date","report-from","report-to"]
    .forEach(id => document.getElementById(id).addEventListener("change",applyDashboardPeriod));
  updatePeriodControlVisibility();
}

function updatePeriodControlVisibility(){
  const mode = document.getElementById("report-period").value;
  const visibility = {
    "report-month":mode === "month",
    "report-year":mode === "year",
    "report-date":mode === "date",
    "report-from":mode === "custom",
    "report-to":mode === "custom"
  };
  Object.entries(visibility).forEach(([id,visible]) => {
    document.getElementById(id).style.display = visible ? "block" : "none";
  });
}

function parseLocalDate(value){
  if(!value) return null;
  const [year,month,day] = value.split("-").map(Number);
  return new Date(year,month - 1,day);
}

function getPeriod(){
  const mode = document.getElementById("report-period").value;
  let start = null;
  let end = null;
  let label = "todo el historial";

  if(mode === "month"){
    const [year,month] = document.getElementById("report-month").value.split("-").map(Number);
    start = new Date(year,month - 1,1);
    end = new Date(year,month,1);
    label = start.toLocaleDateString("es-MX",{month:"long",year:"numeric"});
  }else if(mode === "year"){
    const year = Number(document.getElementById("report-year").value) || new Date().getFullYear();
    start = new Date(year,0,1);
    end = new Date(year + 1,0,1);
    label = `el año ${year}`;
  }else if(mode === "date"){
    start = parseLocalDate(document.getElementById("report-date").value);
    if(start){
      end = new Date(start);
      end.setDate(end.getDate() + 1);
      label = start.toLocaleDateString("es-MX",{dateStyle:"long"});
    }
  }else if(mode === "custom"){
    start = parseLocalDate(document.getElementById("report-from").value);
    const lastDay = parseLocalDate(document.getElementById("report-to").value);
    if(lastDay){
      end = new Date(lastDay);
      end.setDate(end.getDate() + 1);
    }
    label = start && lastDay
      ? `del ${start.toLocaleDateString("es-MX")} al ${lastDay.toLocaleDateString("es-MX")}`
      : "el rango seleccionado";
  }
  return {mode,start,end,label};
}

function isWithinPeriod(order,period){
  if(period.mode === "all") return true;
  const date = new Date(order.created_at);
  return !Number.isNaN(date.getTime()) &&
    (!period.start || date >= period.start) && (!period.end || date < period.end);
}

function getOrderCost(order){
  return (order.items || []).reduce((sum,item) =>
    sum + (toNumber(item.unit_cost) * toNumber(item.quantity)),0);
}

function getInventoryMetrics(){
  return inventory.reduce((metrics,item) => {
    const available = toNumber(item.available_stock ?? item.stock);
    const totalStock = toNumber(item.stock);
    const price = toNumber(item.price);
    const cost = toNumber(item.cost);
    metrics.cost += totalStock * cost;
    metrics.potentialRevenue += available * price;
    metrics.potentialProfit += available * (price - cost);
    metrics.availableUnits += available;
    metrics.lowStock += available <= 5 ? 1 : 0;
    metrics.activeVariants += item.has_variants === true && available > 0 ? 1 : 0;
    return metrics;
  },{cost:0,potentialRevenue:0,potentialProfit:0,availableUnits:0,lowStock:0,activeVariants:0});
}

async function fetchJson(url){
  const response = await fetch(url,{headers:{Authorization:`Bearer ${token}`}});
  const data = await response.json();
  if(!response.ok) throw new Error(data.error || "No se pudo cargar la información");
  return data;
}

async function loadDashboardStats(){
  try{
    const [productsResponse,ordersData,inventoryData] = await Promise.all([
      getProducts(store),
      fetchJson(`${API_URL}/orders`),
      fetchJson(`${API_URL}/inventory`)
    ]);
    products = productsResponse?.products || productsResponse || [];
    orders = ordersData.orders || [];
    inventory = inventoryData.inventory || [];
    applyDashboardPeriod();
  }catch(error){
    console.error("Dashboard error:",error);
    setText("period-summary","No se pudieron cargar todas las estadísticas. Intenta nuevamente.");
  }
}

function applyDashboardPeriod(){
  const period = getPeriod();
  const periodOrders = orders.filter(order => isWithinPeriod(order,period));
  const paidOrders = periodOrders.filter(isPaidOrder);
  const allPaidOrders = orders.filter(isPaidOrder);
  const periodSales = paidOrders.reduce((sum,order) => sum + toNumber(order.total),0);
  const periodCost = paidOrders.reduce((sum,order) => sum + getOrderCost(order),0);
  const periodProfit = periodSales - periodCost;
  const totalRevenue = allPaidOrders.reduce((sum,order) => sum + toNumber(order.total),0);
  const averageTicket = paidOrders.length ? periodSales / paidOrders.length : 0;
  const stock = getInventoryMetrics();

  setText("total-orders",periodOrders.length);
  setText("period-sales",formatMoney(periodSales));
  setText("period-profit",formatMoney(periodProfit));
  setText("total-products",products.length);
  setText("low-stock",stock.lowStock);
  setText("total-revenue",formatMoney(totalRevenue));
  setText("average-ticket",formatMoney(averageTicket));
  setText("inventory-cost",formatMoney(stock.cost));
  setText("inventory-profit",formatMoney(stock.potentialProfit));
  setText("inventory-revenue",formatMoney(stock.potentialRevenue));
  setText("available-units",stock.availableUnits.toLocaleString("es-MX"));
  setText("active-variants",stock.activeVariants.toLocaleString("es-MX"));
  setText("period-summary",`Mostrando ${period.label}. ${paidOrders.length} pedidos cuentan como venta.`);

  renderRecentOrders(periodOrders.slice(0,5));
  renderBestSellers(paidOrders);
  currentReport = {
    periodo:period.label,
    pedidos:periodOrders.length,
    pedidosPagados:paidOrders.length,
    ventas:periodSales,
    utilidadBrutaEstimada:periodProfit,
    ticketPromedio:averageTicket,
    inventarioAlCosto:stock.cost,
    ventaPotencialInventario:stock.potentialRevenue,
    gananciaPotencialInventario:stock.potentialProfit,
    unidadesDisponibles:stock.availableUnits,
    generado:new Date().toLocaleString("es-MX")
  };
}

function renderRecentOrders(data){
  const table = document.getElementById("recent-orders");
  if(!data.length){
    table.innerHTML = '<tr><td colspan="5">No hay pedidos en este periodo</td></tr>';
    return;
  }
  table.innerHTML = data.map(order => `
    <tr><td>#${order.id}</td><td>${order.customer_name || "-"}</td>
    <td>${formatMoney(order.total)}</td><td>${order.status || "-"}</td>
    <td>${order.created_at ? new Date(order.created_at).toLocaleDateString("es-MX") : "-"}</td></tr>
  `).join("");
}

function renderBestSellers(paidOrders){
  const container = document.getElementById("best-sellers");
  const summary = new Map();
  paidOrders.forEach(order => (order.items || []).forEach(item => {
    const key = item.product_name || `Producto ${item.variant_id}`;
    const current = summary.get(key) || {name:key,units:0,sales:0};
    current.units += toNumber(item.quantity);
    current.sales += toNumber(item.subtotal) || (toNumber(item.price) * toNumber(item.quantity));
    summary.set(key,current);
  }));
  const best = [...summary.values()].sort((a,b) => b.units - a.units).slice(0,5);
  container.innerHTML = best.length ? best.map(item => `
    <div class="best-product"><strong>${item.name}</strong>
    <span>${item.units} unidades vendidas</span><b>${formatMoney(item.sales)}</b></div>
  `).join("") : '<div class="best-product">No hay ventas en este periodo</div>';
}

window.exportMonthReport = () => {
  const blob = new Blob([JSON.stringify(currentReport,null,2)],{type:"application/json"});
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `reporte-mercadia-${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
};

document.addEventListener("DOMContentLoaded",async () => {
  setupPeriodControls();
  await loadDashboardStats();
});
