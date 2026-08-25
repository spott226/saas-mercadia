const CUSTOMER_SESSION_KEY =
  "mercadia_customer_session";

const CUSTOMER_PROFILE_KEY =
  "mercadia_customer_profile";

function readJSON(key){

  try{
    const value =
      localStorage.getItem(key);

    return value
      ? JSON.parse(value)
      : null;
  }catch(error){
    console.error(
      "Error leyendo storage:",
      error
    );
    localStorage.removeItem(key);
    return null;
  }

}

function writeJSON(key, value){

  localStorage.setItem(
    key,
    JSON.stringify(value)
  );

}

export function getCustomerSession(storeId){

  const session =
    readJSON(
      CUSTOMER_SESSION_KEY
    );

  if(!session){
    return null;
  }

  if(
    storeId &&
    Number(session.store_id) !== Number(storeId)
  ){
    return null;
  }

  return session;

}

export function setCustomerSession(session){

  if(!session){
    return;
  }

  writeJSON(
    CUSTOMER_SESSION_KEY,
    {
      ...session,
      saved_at:
        new Date().toISOString()
    }
  );

}

export function clearCustomerSession(){

  localStorage.removeItem(
    CUSTOMER_SESSION_KEY
  );

}

export function getCustomerProfile(storeId){

  const profile =
    readJSON(
      CUSTOMER_PROFILE_KEY
    );

  if(!profile){
    return null;
  }

  if(
    storeId &&
    Number(profile.store_id) !== Number(storeId)
  ){
    return null;
  }

  return profile;

}

export function saveCustomerProfile(
  storeId,
  customer
){

  if(!storeId || !customer){
    return;
  }

  writeJSON(
    CUSTOMER_PROFILE_KEY,
    {
      store_id: Number(storeId),
      name:
        customer.name || "",
      phone:
        customer.phone || "",
      address:
        customer.address || "",
      colony:
        customer.colony || "",
      city:
        customer.city || "",
      state:
        customer.state || "",
      postal:
        customer.postal || "",
      reference:
        customer.reference || ""
    }
  );

}
