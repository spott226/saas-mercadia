require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.query("SELECT NOW()")
  .then(r => {
    console.log("Conectado:", r.rows);
    process.exit();
  })
  .catch(e => {
    console.error("Error conexión:", e);
    process.exit();
  });