const express = require("express");
const router = express.Router();

router.param('id',(req,res,next,value) => {
  if(!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) return res.status(400).json({error:'Identificador inválido'});
  next();
});

const adminController = require("../controllers/adminController");
const auth = require("../middleware/auth");
const db = require('../db/db');
async function requireStoreOwner(req,res,next){
  const user = req.user;
  if(user?.role !== 'admin' || !user.store_id) return res.status(403).json({error:'Acceso de propietario requerido'});
  if(user.merchant_id) return next(); // requireAdmin already verifies the active merchant/store pair.
  try {
    const result = await db.query("SELECT id FROM users WHERE id = $1 AND store_id = $2 AND role = 'admin'",[user.user_id,user.store_id]);
    if(!result.rows.length) return res.status(403).json({error:'Acceso de propietario requerido'});
    next();
  } catch(error){ next(error); }
}
const upload = require("../config/multer");
const pushController = require("../controllers/push.controller");

router.post("/login",adminController.login);
router.post("/push/subscribe",auth.requireAdmin,pushController.subscribeMerchant);

router.get(
  "/store",
  auth.requireAdmin,
  adminController.getStore
);

router.patch(
  "/store",
  auth.requireAdmin,
  adminController.updateStore
);

router.post(
  "/store/logo",
  auth.requireAdmin,
  upload.single("logo"),
  adminController.updateStoreLogo
);

router.post(
  "/store/hero",
  auth.requireAdmin,
  upload.single("hero"),
  adminController.updateStoreHero
);

router.post(
  "/uploads",
  auth.requireAdmin,
  upload.single("image"),
  adminController.uploadAdminImage
);

router.get(
  "/promotions",
  auth.requireAdmin,
  requireStoreOwner,
  adminController.getPromotions
);

router.post(
  "/promotions",
  auth.requireAdmin,
  requireStoreOwner,
  upload.single("image"),
  adminController.createPromotion
);

router.patch(
  "/promotions/:id",
  auth.requireAdmin,
  requireStoreOwner,
  upload.single("image"),
  adminController.updatePromotion
);

router.delete(
  "/promotions/:id",
  auth.requireAdmin,
  requireStoreOwner,
  adminController.deletePromotion
);

router.patch("/business", auth.requireAdmin, requireStoreOwner, adminController.updateBusiness);

module.exports = router;
