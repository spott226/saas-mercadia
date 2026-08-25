const db = require("../db/db");

exports.getUserByEmail = async (email) => {

  const result = await db.query(
    "SELECT * FROM users WHERE email = $1",
    [email]
  );

  return result.rows[0];

};