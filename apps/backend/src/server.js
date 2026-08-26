require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");


/* =========================
ROUTES
========================= */

const storeRoutes =
  require("./routes/stores");

const productRoutes =
  require("./routes/products");

const adminRoutes =
  require("./routes/admin");

const orderRoutes =
  require("./routes/orders");

const inventoryRoutes =
  require("./routes/inventory");
const customerAuthRoutes =
  require("./routes/customerAuth");
const platformRoutes =
  require("./routes/platform");
const {
  ensureCustomerAccountSchema
} = require("./db/bootstrap");

/* 🔥 NUEVO */
const customerRoutes =
  require("./routes/customers");


const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);

const repositoryRoot = path.resolve(
  __dirname,
  "../../.."
);
const adminDirectory = path.join(
  repositoryRoot,
  "apps/admin"
);
const storefrontDirectory = path.join(
  repositoryRoot,
  "apps/storefront/public"
);

const allowedOrigins =
  (process.env.CORS_ORIGINS || "")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean);

const corsOptions =
  allowedOrigins.length > 0
    ? {
        origin(origin, callback){
          if(
            !origin ||
            allowedOrigins.includes(origin)
          ){
            return callback(
              null,
              true
            );
          }

          return callback(
            new Error(
              "Origin not allowed by CORS"
            )
          );
        }
      }
    : {
        origin: true
      };


/* =========================
CONFIGURACIÓN BÁSICA
========================= */

app.use(cors(corsOptions));

app.use(express.json({
  limit: "10mb"
}));

app.use(express.urlencoded({
  extended: true
}));


/* =========================
SERVIR IMÁGENES
========================= */

app.use(
  "/uploads",
  express.static(
    path.join(__dirname, "uploads")
  )
);


/* =========================
RUTAS API
========================= */

app.use(
  "/api/stores",
  storeRoutes
);

app.use(
  "/api/products",
  productRoutes
);

app.use(
  "/api/admin",
  adminRoutes
);

app.use(
  "/api/orders",
  orderRoutes
);

app.use(
  "/api/inventory",
  inventoryRoutes
);

/* 🔥 CUSTOMERS ERP */
app.use(
  "/api/customers",
  customerRoutes
);

app.use(
  "/api/customer-auth",
  customerAuthRoutes
);

app.use(
  "/api/platform",
  platformRoutes
);


/* =========================
APLICACIONES WEB
========================= */

function sendRuntimeConfig(req, res){
  const origin = `${req.protocol}://${req.get("host")}`;

  res
    .type("application/javascript")
    .set("Cache-Control", "no-store")
    .send(
      `window.MERCADIA_CONFIG=${JSON.stringify({
        API_URL: `${origin}/api`,
        BACKEND_ORIGIN: origin
      })};`
    );
}

app.get("/config.js", sendRuntimeConfig);
app.get("/admin/config.js", sendRuntimeConfig);

app.get("/", (req, res) => {
  res.sendFile(path.join(storefrontDirectory, "landing.html"));
});

app.get("/tienda/:slug", (req, res) => {
  res.sendFile(path.join(storefrontDirectory, "index.html"));
});

app.get("/admin", (req, res) => {
  res.redirect(302, "/admin/login.html");
});

app.use(
  "/admin",
  express.static(adminDirectory, {
    index: "login.html"
  })
);

app.get("/healthz", async (req, res) => {
  try{
    const db = require("./db/db");
    await db.query("SELECT 1");
    res.json({ success: true });
  }catch(error){
    res.status(503).json({
      success: false,
      error: "database unavailable"
    });
  }
});

app.use(
  express.static(storefrontDirectory, {
    index: "index.html"
  })
);


/* =========================
404 API
========================= */

app.use((req, res) => {

  res.status(404).json({

    success: false,

    error:
      "Ruta no encontrada"

  });

});


/* =========================
MANEJO GLOBAL ERRORES
========================= */

app.use((err, req, res, next) => {

  console.error(
    "❌ ERROR:",
    err
  );

  res.status(
    Number.isInteger(err.status)
      ? err.status
      : 500
  ).json({

    success: false,

    error:
      "Internal Server Error",

    detail:
      process.env.NODE_ENV === "production"
        ? undefined
        : err.message

  });

});


/* =========================
SERVER
========================= */

const PORT =
  process.env.PORT || 3000;

ensureCustomerAccountSchema()
  .then(() => {
    app.listen(PORT, () => {

      console.log(`

🚀 Mercadia ERP Backend iniciado
🌐 Puerto: ${PORT}

`);

    });
  })
  .catch(error => {
    console.error(
      "Error inicializando schema:",
      error
    );
    process.exit(1);
  });
