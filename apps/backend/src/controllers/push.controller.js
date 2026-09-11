const push = require("../services/pushNotifications");

exports.publicKey = (req, res) => {
  const publicKey = push.getPublicKey();

  if(!publicKey){
    return res.status(503).json({
      success: false,
      error: "notificaciones no configuradas"
    });
  }

  res.json({ success: true, public_key: publicKey });
};

exports.subscribe = async (req, res, next) => {
  try{
    await push.saveSubscription(
      req.user.store_id,
      req.user.customer_account_id,
      req.body.subscription
    );
    res.status(201).json({ success: true });
  }catch(error){
    if(error.status){
      return res.status(error.status).json({ success: false, error: error.message });
    }
    next(error);
  }
};

exports.unsubscribe = async (req, res, next) => {
  try{
    await push.removeSubscription(
      req.body.endpoint,
      req.user.customer_account_id
    );
    res.json({ success: true });
  }catch(error){
    next(error);
  }
};

exports.subscribeMerchant = async (req,res,next) => {
  try{
    if(!req.user.store_id || (!req.user.merchant_id && !req.user.user_id)){
      return res.status(403).json({ success:false, error:"Cuenta de negocio requerida" });
    }

    await push.saveMerchantSubscription(
      req.user.store_id,
      req.user.merchant_id || null,
      req.body.subscription,
      req.user.user_id || null
    );
    res.status(201).json({ success:true });
  }catch(error){
    if(error.status){
      return res.status(error.status).json({ success:false, error:error.message });
    }
    next(error);
  }
};
exports.testMerchant = async (req,res,next) => {
  try{
    if(!req.user.store_id || (!req.user.merchant_id && !req.user.user_id)){
      return res.status(403).json({ success:false, error:"Cuenta de negocio requerida" });
    }

    const result = await push.sendMerchantTest(req.user.store_id);
    if(!result.sent){
      return res.status(502).json({
        success:false,
        error:"No se pudo entregar la notificación de prueba a este dispositivo."
      });
    }
    res.json({ success:true, ...result });
  }catch(error){
    if(error.status){
      return res.status(error.status).json({ success:false, error:error.message });
    }
    next(error);
  }
};
