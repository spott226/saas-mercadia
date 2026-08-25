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
const {
  ensureCustomerAccountSchema
} = require("./db/bootstrap");

/* 🔥 NUEVO */
const customerRoutes =
  require("./routes/customers");


const app = express();

app.disable("x-powered-by");

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


/* =========================
RUTA TEST
========================= */

app.get("/", (req, res) => {

  res.json({

    success: true,

    message:
      "Mercadia ERP Backend funcionando"

  });

});

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

  res.status(500).json({

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
