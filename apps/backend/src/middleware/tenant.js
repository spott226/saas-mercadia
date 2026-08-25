const db = require("../db/db");

module.exports = async function (req, res, next) {

    try {

        let slug;

        const host = req.headers.host;

        if (host.includes(".")) {
            slug = host.split(".")[0];
        }

        if (req.query.store) {
            slug = req.query.store;
        }

        if (!slug) {
            return res.status(400).json({
                error: "Tienda no identificada"
            });
        }

        const result = await db.query(
            "SELECT * FROM stores WHERE slug = $1",
            [slug]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Tienda no encontrada"
            });
        }

        req.store = result.rows[0];

        next();

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Error en tenant middleware"
        });

    }

};