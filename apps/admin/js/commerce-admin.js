const API_URL =
  window.MERCADIA_CONFIG?.API_URL ||
  "https://mercadia-back-production.up.railway.app/api";

await window.adminSessionReady;

const token =
  window.getAdminToken?.() || sessionStorage.getItem("token") || localStorage.getItem("mercadia_admin_token");

if(!token){

  window.location = "/?login=1";

}

const message = document.getElementById("store-message");
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
        cache:"no-store",
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


export {adminRequest,showMessage,runSafely,escapeHTML,toDateInput};
