const User = require("../models/adminModel");
const Store = require("../models/storeModel");
const Promotion = require("../models/promotionModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../db/db");
const supabaseAuth = require("../services/supabaseAuth");
const {
  JWT_SECRET,
  JWT_EXPIRES_IN
} = require("../config/auth");

const parseBoolean = (value) => {

  if(value === undefined){
    return undefined;
  }

  return (
    value === true ||
    value === "true" ||
    value === "on" ||
    value === "1"
  );

};

const promotionPayload = (
  body,
  imageUrl
) => ({

  title:
    body.title,

  description:
    body.description,

  discount_text:
    body.discount_text,

  button_text:
    body.button_text,

  button_url:
    body.button_url,

  image_url:
    imageUrl || body.image_url,

  is_active:
    parseBoolean(body.is_active),

  starts_at:
    body.starts_at || null,

  ends_at:
    body.ends_at || null

});

const allowedBusinessTypes = [
  "ecommerce",
  "restaurant",
  "appointments",
  "professional"
];

const allowedHomepageSectionTypes = new Set([
  "site_settings",
  "category_tiles",
  "product_grid",
  "image_banner",
  "editorial_banner",
  "split_showcase",
  "promo_strip"
]);

const allowedSectionLayouts = new Set([
  "default",
  "image-left",
  "image-right",
  "gallery"
]);

const allowedStyleKeys = new Set([
  "background_color",
  "text_color",
  "accent_color",
  "alignment",
  "radius"
]);

const isValidTemplateKey = (value) => {

  if(value === undefined){
    return true;
  }

  return /^[a-z0-9_-]{1,80}$/.test(value);

};

const parseHomepageSections = (value) => {

  if(value === undefined){
    return undefined;
  }

  if(Array.isArray(value)){
    return value;
  }

  if(typeof value === "string"){

    if(value.trim() === ""){
      return [];
    }

    return JSON.parse(value);

  }

  return value;

};

const isValidHomepageSections = (value) => {

  if(value === undefined){
    return true;
  }

  if(!Array.isArray(value)){
    return false;
  }

  if(value.length > 20){
    return false;
  }

  return value.every(section => {

    if(
      !section ||
      typeof section !== "object" ||
      Array.isArray(section)
    ){
      return false;
    }

    if(
      !section.type ||
      typeof section.type !== "string"
    ){
      return false;
    }

    if(!allowedHomepageSectionTypes.has(section.type)){
      return false;
    }

    if(
      section.layout !== undefined &&
      !allowedSectionLayouts.has(section.layout)
    ){
      return false;
    }

    if(section.images !== undefined){
      if(
        !Array.isArray(section.images) ||
        section.images.length > 8 ||
        !section.images.every(image =>
          typeof image === "string" &&
          image.length <= 2000
        )
      ){
        return false;
      }
    }

    if(section.styles !== undefined){
      if(
        !section.styles ||
        typeof section.styles !== "object" ||
        Array.isArray(section.styles) ||
        !Object.entries(section.styles).every(([key,item]) =>
          allowedStyleKeys.has(key) &&
          typeof item === "string" &&
          item.length <= 80
        )
      ){
        return false;
      }
    }

    return Object.entries(section).every(([key,item]) =>
      key === "images" ||
      key === "styles" ||
      typeof item !== "string" ||
      item.length <= 2000
    );

  });

};

exports.login = async (req,res)=>{

  try{

    const email =
      req.body.email?.trim().toLowerCase();

    const password =
      req.body.password;

    if(
      !email ||
      !password
    ){

      return res.status(400).json({
        error:"email and password required"
      });

    }

    const user = await User.getUserByEmail(email);
    let tokenPayload;

    if(user){
      const valid = await bcrypt.compare(password,user.password);

      if(!valid){
        return res.status(401).json({error:"invalid credentials"});
      }

      tokenPayload = user.role === "superadmin"
        ? {
            user_id:user.id,
            role:"superadmin"
          }
        : {
            user_id:user.id,
            store_id:user.store_id,
            role:"admin"
          };
    }else{
      let authData;

      try{
        authData = await supabaseAuth.signIn(email,password);
      }catch(error){
        return res.status(401).json({error:"invalid credentials"});
      }

      const merchantResult = await db.query(
        `SELECT id, store_id
         FROM merchant_accounts
         WHERE supabase_user_id = $1
           AND email = $2
           AND status = 'active'
           AND store_id IS NOT NULL
         LIMIT 1`,
        [authData.user?.id, email]
      );
      const merchant = merchantResult.rows[0];

      if(!merchant){
        return res.status(403).json({error:"account is not active"});
      }

      tokenPayload = {
        merchant_id:merchant.id,
        store_id:merchant.store_id,
        role:"admin"
      };
    }

    const token = jwt.sign(
      tokenPayload,
      JWT_SECRET,
      {
        expiresIn:
          JWT_EXPIRES_IN
      }
    );

    res.json({
      token,
      store_id:tokenPayload.store_id || null,
      role:tokenPayload.role,
      redirect:tokenPayload.role === "superadmin"
        ? "/platform.html"
        : "/admin/dashboard.html"
    });

  }catch(err){

    console.error("LOGIN ERROR:", err);
    res.status(500).json({error:"server error"});

  }

};

exports.getStore = async (
  req,
  res
) => {

  try {

    const store =
      await Store.getStoreById(
        req.user.store_id
      );

    if(!store){

      return res.status(404).json({
        error:"store not found"
      });

    }

    res.json({
      success:true,
      store
    });

  } catch(err) {

    console.error("GET ADMIN STORE ERROR:", err);

    res.status(500).json({
      error:"server error"
    });

  }

};

exports.updateStore = async (
  req,
  res
) => {

  try {

    const {
      business_type,
      template_key
    } = req.body;

    let homepage_sections;

    try{

      homepage_sections =
        parseHomepageSections(
          req.body.homepage_sections
        );

    }catch(error){

      return res.status(400).json({
        error:"invalid homepage_sections"
      });

    }

    if(
      business_type !== undefined &&
      !allowedBusinessTypes.includes(
        business_type
      )
    ){

      return res.status(400).json({
        error:"invalid business_type"
      });

    }

    if(
      !isValidTemplateKey(
        template_key
      )
    ){

      return res.status(400).json({
        error:"invalid template_key"
      });

    }

    if(
      !isValidHomepageSections(
        homepage_sections
      )
    ){

      return res.status(400).json({
        error:"invalid homepage_sections"
      });

    }

    const store =
      await Store.updateStoreSettings(
        req.user.store_id,
        {
          business_type,
          template_key,
          homepage_sections
        }
      );

    if(!store){

      return res.status(404).json({
        error:"store not found"
      });

    }

    res.json({
      success:true,
      store
    });

  } catch(err) {

    console.error("UPDATE ADMIN STORE ERROR:", err);

    res.status(500).json({
      error:"server error"
    });

  }

};

exports.updateStoreLogo = async (
  req,
  res
) => {

  try {

    const logo =
      req.file?.path ||
      req.file?.secure_url;

    if(!logo){

      return res.status(400).json({
        error:"logo required"
      });

    }

    const store =
      await Store.updateStoreLogo(
        req.user.store_id,
        logo
      );

    if(!store){

      return res.status(404).json({
        error:"store not found"
      });

    }

    res.json({
      success:true,
      store
    });

  } catch(err) {

    console.error("UPDATE STORE LOGO ERROR:", err);

    res.status(500).json({
      error:"server error"
    });

  }

};

exports.updateStoreHero = async (
  req,
  res
) => {

  try {

    const hero =
      req.file?.path ||
      req.file?.secure_url;

    if(!hero){

      return res.status(400).json({
        error:"hero required"
      });

    }

    const store =
      await Store.updateStoreHero(
        req.user.store_id,
        hero
      );

    if(!store){

      return res.status(404).json({
        error:"store not found"
      });

    }

    res.json({
      success:true,
      store
    });

  } catch(err) {

    console.error("UPDATE STORE HERO ERROR:", err);

    res.status(500).json({
      error:"server error"
    });

  }

};


exports.uploadAdminImage = async (
  req,
  res
) => {

  try {

    const image =
      req.file?.path ||
      req.file?.secure_url ||
      req.file?.filename;

    if(!image){

      return res.status(400).json({
        error:"image required"
      });

    }

    res.json({
      success:true,
      image_url:image
    });

  } catch(err) {

    console.error("UPLOAD ADMIN IMAGE ERROR:", err);

    res.status(500).json({
      error:"server error"
    });

  }

};

exports.getPromotions = async (
  req,
  res
) => {

  try {

    const promotions =
      await Promotion.getPromotionsByStore(
        req.user.store_id
      );

    res.json({
      success:true,
      promotions
    });

  } catch(err) {

    console.error("GET PROMOTIONS ERROR:", err);

    res.status(500).json({
      error:"server error"
    });

  }

};

exports.createPromotion = async (
  req,
  res
) => {

  try {

    const imageUrl =
      req.file?.path ||
      req.file?.secure_url;

    const data =
      promotionPayload(
        req.body,
        imageUrl
      );

    if(!data.title){

      return res.status(400).json({
        error:"title required"
      });

    }

    const promotion =
      await Promotion.createPromotion(
        req.user.store_id,
        data
      );

    res.status(201).json({
      success:true,
      promotion
    });

  } catch(err) {

    console.error("CREATE PROMOTION ERROR:", err);

    res.status(500).json({
      error:"server error"
    });

  }

};

exports.updatePromotion = async (
  req,
  res
) => {

  try {

    const imageUrl =
      req.file?.path ||
      req.file?.secure_url;

    const data =
      promotionPayload(
        req.body,
        imageUrl
      );

    const promotion =
      await Promotion.updatePromotion(
        req.params.id,
        req.user.store_id,
        data
      );

    if(!promotion){

      return res.status(404).json({
        error:"promotion not found"
      });

    }

    res.json({
      success:true,
      promotion
    });

  } catch(err) {

    console.error("UPDATE PROMOTION ERROR:", err);

    res.status(500).json({
      error:"server error"
    });

  }

};

exports.deletePromotion = async (
  req,
  res
) => {

  try {

    const deleted =
      await Promotion.deletePromotion(
        req.params.id,
        req.user.store_id
      );

    if(!deleted){

      return res.status(404).json({
        error:"promotion not found"
      });

    }

    res.json({
      success:true,
      message:"promotion deleted"
    });

  } catch(err) {

    console.error("DELETE PROMOTION ERROR:", err);

    res.status(500).json({
      error:"server error"
    });

  }

};
