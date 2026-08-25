const SUPABASE_URL = String(
  process.env.SUPABASE_URL || ""
).replace(/\/$/, "");

const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  "";

function isConfigured(){
  return Boolean(
    SUPABASE_URL &&
    SUPABASE_ANON_KEY
  );
}

function requireConfiguration(){
  if(!isConfigured()){
    const error = new Error(
      "Supabase Auth no esta configurado"
    );
    error.status = 503;
    throw error;
  }
}

async function request(
  endpoint,
  {
    method = "POST",
    body,
    accessToken
  } = {}
){
  requireConfiguration();

  const response = await fetch(
    `${SUPABASE_URL}/auth/v1${endpoint}`,
    {
      method,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
        ...(accessToken
          ? {
              Authorization:
                `Bearer ${accessToken}`
            }
          : {})
      },
      ...(body !== undefined
        ? { body: JSON.stringify(body) }
        : {})
    }
  );

  const data = await response
    .json()
    .catch(() => null);

  if(!response.ok){
    const error = new Error(
      data?.msg ||
      data?.message ||
      data?.error_description ||
      data?.error ||
      "Error de autenticacion"
    );
    error.status = response.status;
    error.code = data?.error_code || data?.code;
    throw error;
  }

  return data;
}

function signUp({
  email,
  password,
  name,
  phone,
  storeId,
  redirectTo
}){
  const query = redirectTo
    ? `?redirect_to=${encodeURIComponent(redirectTo)}`
    : "";

  return request(
    `/signup${query}`,
    {
      body: {
        email,
        password,
        data: {
          name,
          phone,
          store_id: storeId
        }
      }
    }
  );
}

function signIn(email, password){
  return request(
    "/token?grant_type=password",
    {
      body: {
        email,
        password
      }
    }
  );
}

function refresh(refreshToken){
  return request(
    "/token?grant_type=refresh_token",
    {
      body: {
        refresh_token: refreshToken
      }
    }
  );
}

function recover(email, redirectTo){
  const query = redirectTo
    ? `?redirect_to=${encodeURIComponent(redirectTo)}`
    : "";

  return request(
    `/recover${query}`,
    { body: { email } }
  );
}

function getUser(accessToken){
  return request(
    "/user",
    {
      method: "GET",
      accessToken
    }
  );
}

function updatePassword(
  accessToken,
  password
){
  return request(
    "/user",
    {
      method: "PUT",
      accessToken,
      body: { password }
    }
  );
}

module.exports = {
  isConfigured,
  signUp,
  signIn,
  refresh,
  recover,
  getUser,
  updatePassword
};
