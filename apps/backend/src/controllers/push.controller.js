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
    if(!req.user.merchant_id){
      return res.status(403).json({ success:false, error:"merchant account required" });
    }

    await push.saveMerchantSubscription(
      req.user.store_id,
      req.user.merchant_id,
      req.body.subscription
    );
    res.status(201).json({ success:true });
  }catch(error){
    if(error.status){
      return res.status(error.status).json({ success:false, error:error.message });
    }
    next(error);
  }
};
