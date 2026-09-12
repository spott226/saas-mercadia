const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const validation = require('../apps/backend/src/services/commerceValidation');
const root = path.resolve(__dirname,'..');
const read = file => fs.readFileSync(path.join(root,file),'utf8');
function loadController(file, dependencies, env = {}){
  const exports = {};
  const module = { exports };
  vm.runInNewContext(read(file),{exports,module,require:name => {
    if(Object.hasOwn(dependencies,name)) return dependencies[name];
    throw new Error(`Unexpected dependency: ${name}`);
  },console:{error(){},warn(){}},process:{env},URL,Set,Map,Date});
  return module.exports === exports ? exports : module.exports;
}
function response(){ return {code:200,status(code){this.code=code;return this;},json(data){this.data=data;return this;}}; }

test('Business phones normalize formatting and reject malformed input',() => {
  assert.equal(validation.phone('+52 (55) 1234-5678'),'525512345678');
  assert.equal(validation.phone(''),'');
  for(const value of ['abc123456789','123','0000000000','+1234567890123456',{},'52+5512345678']) assert.throws(() => validation.phone(value));
  const data = validation.business({name:' Mi negocio ',whatsapp:'+52 55 1234 5678',store_id:99,owner_name:'<Ana>'});
  assert.deepEqual(data,{name:'Mi negocio',owner_name:'Ana',whatsapp:'525512345678'});
});
test('Custom domains normalize safely and reject platform or malformed hosts',() => {
  assert.equal(validation.domain('HTTPS://WWW.Mi-Negocio.com'),'www.mi-negocio.com');
  assert.equal(validation.domain(''),'');
  for(const value of ['localhost','127.0.0.1','mercadiamx.com','tienda.mercadiamx.com','bad_domain','https://','https://negocio.com/tienda']) assert.throws(()=>validation.domain(value));
});
test('Promotion validation rejects unsafe URLs, types, states and date ranges',() => {
  for(const url of ['javascript:alert(1)','data:text/html,test','//evil.test','/\\evil.test','https://user:pass@example.com']) assert.throws(() => validation.url(url));
  assert.equal(validation.url('/products.html'),'/products.html');
  assert.equal(validation.url('https://example.com'),'https://example.com/');
  for(const body of [{type:'unknown'},{priority:1.5},{is_active:'yes'},{starts_at:'2026-02-30'},{starts_at:'2026-10-01',ends_at:'2026-09-01'},{title:''}]) assert.throws(() => validation.promotion(body));
  assert.deepEqual(validation.promotion({is_active:false}),{is_active:false});
  assert.deepEqual(validation.promotion({ends_at:''}),{ends_at:null});
});
test('Promotion model scopes edits/deletions and preserves explicit date clearing',async () => {
  const calls=[];
  const db={query:async(sql,args) => {calls.push({sql,args}); return {rows:[]};},connect:async() => client};
  const client={release(){},query:async(sql,args) => {
    calls.push({sql,args});
    if(sql.startsWith('SELECT')) return {rows:args[1] === 7 ? [{starts_at:new Date('2026-01-01'),ends_at:new Date('2026-12-01')}] : []};
    return {rows:[{id:1}]};
  }};
  const model=loadController('apps/backend/src/models/promotionModel.js',{'../db/db':db,'../services/commerceValidation':validation});
  assert.equal(await model.updatePromotion(1,99,{title:'Other store'}),null);
  assert.ok(!calls.some(c => c.sql.startsWith('UPDATE')));
  await assert.rejects(model.updatePromotion(1,7,{starts_at:'2027-01-01'}));
  await model.updatePromotion(1,7,{ends_at:null});
  const update=calls.find(c => c.sql.startsWith('UPDATE'));
  assert.match(update.sql,/WHERE id = \$2 AND store_id = \$3/);
  assert.deepEqual(Array.from(update.args),[null,1,7]);
  await model.deletePromotion(1,99);
  assert.match(calls.at(-1).sql,/AND store_id = \$2/);
  assert.deepEqual(Array.from(calls.at(-1).args),[1,99]);
  await model.getActivePromotionsByStore(7);
  assert.match(calls.at(-1).sql,/starts_at <= NOW\(\)/);
  assert.match(calls.at(-1).sql,/ends_at >= NOW\(\)/);
  assert.match(calls.at(-1).sql,/priority DESC, id DESC/);
});
test('Order endpoint rejects missing/invalid business WhatsApp before writing orders or reservations',async () => {
  for(const whatsapp of [null,'123','letters']){
    const calls=[]; let released=false;
    const client={query:async(sql,args) => {calls.push({sql,args});return {rows:[{id:7,whatsapp}]};},release(){released=true;}};
    const controller=loadController('apps/backend/src/controllers/orders.controller.js',{'../db/db':{connect:async()=>client},'../services/pushNotifications':{},'../services/commerceValidation':validation});
    const res=response();
    await controller.createOrder({user:{role:'customer',store_id:7,customer_account_id:3},body:{store_id:7,customer_name:'Ana',customer_phone:'5512345678',customer_address:'Calle 1',items:[{variant_id:1,quantity:1}]}},res,error=>{throw error;});
    assert.equal(res.code,409);
    assert.match(res.data.error,/configurado/);
    assert.equal(calls.length,1);
    assert.ok(released);
  }
});
test('Order endpoint allows guests but rejects a mismatched customer session',async () => {
  const client={query:async()=>{throw new Error('no debe consultar antes de validar sesion');},release(){}};
  const controller=loadController('apps/backend/src/controllers/orders.controller.js',{'../db/db':{connect:async()=>client},'../services/pushNotifications':{},'../services/commerceValidation':validation});
  const res=response();
  await controller.createOrder({user:{role:'customer',store_id:8,customer_account_id:3},body:{store_id:7,customer_name:'Ana',customer_phone:'5512345678',customer_address:'Calle 1',items:[{variant_id:1,quantity:1}]}},res,error=>{throw error;});
  assert.equal(res.code,403);
  assert.match(res.data.error,/no pertenece a esta tienda/);
});
test('Customer register returns a clear duplicate message instead of a generic server error',async () => {
  const client={query:async(sql,args)=>{
    if(sql.includes('SELECT id, name, slug FROM stores')) return {rows:[{id:7,name:'Demo',slug:'demo'}]};
    throw Object.assign(new Error('duplicate key value violates unique constraint'),{code:'23505',constraint:'customer_accounts_store_email_idx'});
  },release(){}};
  const controller=loadController('apps/backend/src/controllers/customerAuth.controller.js',{
    '../db/db':{connect:async()=>client},
    '../services/supabaseAuth':{
      signIn:async()=>{throw Object.assign(new Error('Invalid login credentials'),{status:400});},
      signUp:async()=>({user:{id:'11111111-1111-1111-1111-111111111111',identities:[{}]},access_token:'token'})
    }
  });
  const res=response();
  await controller.register({body:{store_id:7,name:'Ana',phone:'4491787307',email:'ana@test.com',password:'123456'}},res,error=>{throw error;});
  assert.equal(res.code,409);
  assert.match(res.data.error,/correo ya tiene cuenta/);
});
test('Business endpoint ignores a forged store id and validates input on the server',async () => {
  const calls=[];
  const controller=loadController('apps/backend/src/controllers/adminController.js',{
    '../models/adminModel':{},'../models/storeModel':{},'../models/promotionModel':{},bcrypt:{},jsonwebtoken:{},
    '../db/db':{query:async(sql,args)=>{calls.push({sql,args});return {rows:[{id:7}]};}},'../services/supabaseAuth':{},'../config/auth':{},'../services/commerceValidation':validation
  });
  let res=response();
  await controller.updateBusiness({user:{store_id:7},body:{store_id:99,name:'Store'}},res,error=>{throw error;});
  assert.equal(calls[0].args.at(-1),7);
  assert.match(calls[0].sql,/WHERE id = \$2/);
  res=response();
  await controller.updateBusiness({user:{store_id:7},body:{whatsapp:'bad'}},res,error=>{throw error;});
  assert.equal(res.code,400);
  assert.equal(calls.length,1);
});
function checkoutHarness(whatsapp,{accept=true,serverPhone='525500001111',session={token:'customer-token',store_id:7}}={}){
  const calls={orders:0,confirmations:0,alerts:[],navigations:[],removed:[],href:''};
  const storage={mercadia_cart:JSON.stringify([{id:1,variant_id:2,name:'Producto',qty:2,price:10}])};
  const inputs={'c-name':'Ana','c-phone':'5512345678','c-address':'Calle 1'};
  const document={querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){},getElementById:id=>inputs[id] ? {value:inputs[id]} : null};
  const context={document,console,URL,URLSearchParams,localStorage:{getItem:key=>storage[key],removeItem:key=>{delete storage[key];calls.removed.push(key);}},window:{store:{id:7,name:'Negocio',whatsapp,slug:'demo'},location:{origin:'https://demo.mercadia.test',pathname:'/products.html',search:'?slug=demo',assign:url=>calls.navigations.push(url),set href(value){calls.href=value;},get href(){return calls.href;}}},alert:message=>calls.alerts.push(message),confirm:()=>{calls.confirmations++;return accept;},saveCustomerProfile(){},getCustomerProfile(){return {};},getCustomerSession(){return session;},createOrder:async(orderData,usedSession)=>{calls.orders++;calls.session=usedSession;return {success:true,order_id:12,whatsapp:serverPhone};}};
  const source=read('apps/storefront/public/js/whatsapp.js').replace('export ','')+'\n'+read('apps/storefront/public/js/cart.js').replace(/^import[\s\S]*?from ["'][^"']+["'];\s*/gm,'').replaceAll('export ','');
  vm.runInNewContext(source,context);
  return {calls,send:context.window.sendCheckout};
}
test('Customer account returns to the store after checkout login',() => {
  const account=read('apps/storefront/public/js/customer-account.js');
  assert.match(account,/function getCheckoutReturnUrl/);
  assert.match(account,/returnToCheckoutIfNeeded\(\)/);
  assert.match(read('apps/storefront/public/mi-cuenta.html'),/customer-account\.js\?v=20260911-13/);
});
test('Checkout allows guest purchases without a customer session',async () => {
  const {send,calls}=checkoutHarness('525512345678',{session:null});
  await send();
  assert.equal(calls.orders,1);
  assert.equal(calls.session,null);
  assert.equal(calls.confirmations,1);
  assert.equal(calls.href,'');
  assert.deepEqual(calls.alerts,[]);
});
test('Checkout blocks missing WhatsApp without creating an order',async () => {
  for(const number of [undefined,'abc','123']){
    const {calls,send}=checkoutHarness(number);await send();
    assert.equal(calls.orders,0);assert.equal(calls.navigations.length,0);assert.match(calls.alerts[0],/configurado/);
  }
});
test('Checkout shows summary first, allows cancellation, and uses the authoritative store phone',async () => {
  let harness=checkoutHarness('+52 55 1234 5678',{accept:false});await harness.send();assert.equal(harness.calls.confirmations,1);assert.equal(harness.calls.orders,0);
  harness=checkoutHarness('+52 55 1234 5678');await harness.send();
  assert.equal(harness.calls.orders,1);assert.equal(harness.calls.session?.token,'customer-token');assert.equal(harness.calls.confirmations,1);assert.equal(harness.calls.navigations.length,1);
  assert.ok(harness.calls.navigations[0].startsWith('https://wa.me/525500001111?text='));
  assert.ok(decodeURIComponent(harness.calls.navigations[0]).includes('TOTAL: $20.00'));
  assert.deepEqual(harness.calls.alerts,[]);
});
test('Checkout prevents duplicate submissions while the request is in flight',async () => {
  const {send,calls}=checkoutHarness('525512345678'); await Promise.all([send(),send()]); assert.equal(calls.orders,1);
});
test('Preview and storefront use identical promotion renderer and styles',() => {
  for(const file of ['js/promotion-card.js','css/promotions.css']) assert.equal(read(`apps/admin/${file}`),read(`apps/storefront/public/${file}`));
});
test('Owner middleware rejects foreign ownership and customer roles before promotion writes',async () => {
  const routes=[];const params={};let ownerRows=[];
  const router={param:(key,fn)=>params[key]=fn};
  for(const method of ['get','post','patch','delete']) router[method]=(url,...handlers)=>routes.push({method,url,handlers});
  const noop=()=>{};
  const controller=new Proxy({},{get:()=>noop});
  const module={exports:{}};
  vm.runInNewContext(read('apps/backend/src/routes/admin.js'),{module,require:name=>({express:{Router:()=>router},'../controllers/adminController':controller,'../middleware/auth':{requireAdmin:noop},'../db/db':{query:async()=>({rows:ownerRows})},'../config/multer':{single:()=>noop},'../controllers/push.controller':{subscribeMerchant:noop,testMerchant:noop}})[name]});
  const route=routes.find(r=>r.method==='patch' && r.url==='/promotions/:id');
  const guard=route.handlers[1];let nextCount=0;
  let res=response();await guard({user:{role:'customer',store_id:7}},res,()=>nextCount++);assert.equal(res.code,403);
  res=response();await guard({user:{role:'admin',user_id:1,store_id:99}},res,()=>nextCount++);assert.equal(res.code,403);assert.equal(nextCount,0);
  ownerRows=[{id:1}];res=response();await guard({user:{role:'admin',user_id:1,store_id:7}},res,()=>nextCount++);assert.equal(nextCount,1);
  assert.ok(routes.filter(r=>r.url.startsWith('/promotions') || r.url==='/business').every(r=>r.handlers.includes(guard)));
  res=response();params.id({},res,()=>nextCount++,'1 OR 1=1');assert.equal(res.code,400);
});
test('Promotion renderer escapes content and popup queue never mounts overlapping dialogs',async () => {
  class Element{
    constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.listeners={};this.attributes={};}
    append(...children){for(const child of children){child.parent=this;this.children.push(child);}}
    prepend(child){child.parent=this;this.children.unshift(child);}
    setAttribute(key,value){this.attributes[key]=value;}
    addEventListener(key,fn){this.listeners[key]=fn;}
    remove(){this.parent.children=this.parent.children.filter(c=>c!==this);}
    focus(){}
  }
  const body=new Element('body'),head=new Element('head'),main=new Element('main');body.append(main);
  const document={head,body,activeElement:null,createElement:tag=>new Element(tag),querySelector:selector=>selector==='main'?main:null,querySelectorAll:()=>[]};
  const promotions=[{id:1,type:'popup',title:'<script>alert(1)</script>',button_url:'javascript:alert(1)',button_text:'Go'},{id:2,type:'popup',title:'Second'},...['banner','banner','top_notice','featured'].map((type,i)=>({id:i+3,type,title:type}))];
  const context={document,console,URL,URLSearchParams,sessionStorage:{getItem(){},setItem(){}},getActivePromotions:async()=>promotions};
  let source=read('apps/storefront/public/js/promotion-card.js').replaceAll('export ','')+'\n'+read('apps/storefront/public/js/promotion-popup.js').replace(/^import .*;\s*$/gm,'').replace('export ','').replace('import.meta.url',"'http://localhost/js/promotion-popup.js'");
  vm.runInNewContext(source,context);await context.initPromotionPopup('demo');
  const overlays=()=>body.children.filter(c=>c.className==='commerce-popup-overlay');
  assert.equal(overlays().length,1);
  const content=overlays()[0].children[0].children.find(c=>c.className==='commerce-promotion-content');
  assert.equal(content.children[0].textContent,'<script>alert(1)</script>');assert.ok(!content.children.some(c=>c.tag==='a'));
  assert.equal(main.children.find(c=>c.dataset.commercePromotions==='banner').children.length,2);
  overlays()[0].children[0].children[0].listeners.click();assert.equal(overlays().length,1);
  overlays()[0].children[0].children[0].listeners.click();assert.equal(overlays().length,0);
});

test('Quote and appointment offers are accepted without stock control',async () => {
  const created=[];
  const variants=[];
  const Product={
    countProductsByStore:async()=>0,
    createProduct:async data=>{created.push(data);return {id:41,...data};},
    createVariant:async data=>variants.push(data)
  };
  const controller=loadController('apps/backend/src/controllers/productController.js',{
    '../models/productModel':Product,
    '../models/storeModel':{getProductLimit:async()=>100}
  });

  for(const itemType of ['quote','appointment']){
    const res=response();
    await controller.createProduct({
      user:{store_id:7},
      body:{
        name:itemType,
        price:'0',
        item_type:itemType,
        track_inventory:'true',
        variants:JSON.stringify([{color:'Única',size:'Única',price:0,stock:0}])
      },
      files:{}
    },res);
    assert.equal(res.code,201);
  }

  assert.deepEqual(created.map(item=>item.item_type),['quote','appointment']);
  assert.ok(created.every(item=>item.store_id===7 && item.track_inventory===false));
  assert.equal(variants.length,2);
});

test('Inventory returns every store offer while KPIs count only tracked stock',async () => {
  const calls=[];
  const rows=[
    {product_id:1,item_type:'product',track_inventory:true,has_variants:true,stock:4,available_stock:4,inventory_value:20,price:10,cost:5},
    {product_id:2,item_type:'quote',track_inventory:false,has_variants:false,stock:0,available_stock:0,inventory_value:0,price:0,cost:0}
  ];
  const controller=loadController('apps/backend/src/controllers/inventory.controller.js',{
    '../db/db':{query:async(sql,args)=>{calls.push({sql,args});return {rows};}}
  });
  const res=response();
  await controller.getInventory({user:{store_id:7}},res,error=>{throw error;});
  assert.equal(res.data.inventory.length,2);
  assert.equal(res.data.kpis.totalVariants,1);
  assert.equal(res.data.kpis.lowStock,1);
  assert.match(calls[0].sql,/FROM products p\s+LEFT JOIN product_variants pv/);
  assert.doesNotMatch(calls[0].sql,/p\.track_inventory\s*=\s*TRUE/);
  assert.deepEqual(Array.from(calls[0].args),[7]);
});

test('Products focuses on creation and published offers are managed in inventory',() => {
  const products=read('apps/admin/products.html');
  const inventory=read('apps/admin/inventory.html');
  assert.match(products,/product-catalog-management is-hidden/);
  for(const type of ['dish','appointment','digital','quote']) assert.match(products,new RegExp(`value="${type}"`));
  assert.match(inventory,/Productos, servicios e inventario/);
  assert.match(inventory,/id="filter-offer-type"/);
  assert.match(read('apps/admin/js/inventory.js'),/editInventoryProduct/);
});

test('Password recovery keeps its token isolated and never exposes raw JWT errors',async () => {
  const calls=[];
  const controller=loadController('apps/backend/src/controllers/platform.controller.js',{
    bcrypt:{hash:async()=> 'new-hash'},
    jsonwebtoken:{},
    crypto:{randomBytes:()=>Buffer.from('1234')},
    '../db/db':{query:async(sql,args)=>{calls.push({sql,args});return {rows:[]};}},
    '../services/supabaseAuth':{
      getUser:async()=>({id:'auth-1',email:'OWNER@EXAMPLE.COM'}),
      updatePassword:async()=>{}
    },
    '../config/auth':{}
  });
  let res=response();
  await controller.updatePassword({headers:{authorization:'Bearer recovery.jwt.token'},body:{password:'NuevaClave123'}},res,error=>{throw error;});
  assert.equal(res.data.success,true);
  assert.match(calls[0].sql,/role = 'superadmin'/);
  assert.deepEqual(Array.from(calls[0].args),['new-hash','owner@example.com']);

  const invalid=loadController('apps/backend/src/controllers/platform.controller.js',{
    bcrypt:{},jsonwebtoken:{},crypto:{randomBytes:()=>Buffer.from('1234')},
    '../db/db':{query:async()=>({rows:[]})},
    '../services/supabaseAuth':{getUser:async()=>{const error=new Error('invalid JWT: expired');error.status=401;throw error;}},
    '../config/auth':{}
  });
  res=response();
  await invalid.updatePassword({headers:{authorization:'Bearer expired.jwt.token'},body:{password:'NuevaClave123'}},res,error=>{throw error;});
  assert.equal(res.code,401);
  assert.doesNotMatch(res.data.error,/jwt/i);
  assert.match(res.data.error,/enlace/);

  const platform=read('apps/storefront/public/js/platform.js');
  assert.match(platform,/RECOVERY_TOKEN_KEY/);
  assert.match(platform,/function getRecoveryToken/);
  assert.match(platform,/split\("\."\)\.length === 3/);
  assert.match(platform,/if\(isRecoveryFlow\)[\s\S]*setAuthenticatedHeader\(false\)/);
  assert.match(platform,/El enlace para cambiar la contraseña llegó incompleto/);
  assert.doesNotMatch(platform,/Authorization: `Bearer \$\{localStorage\.getItem\(TOKEN_KEY\)\}`[^\n]*update-password/);
});

test('Platform registration and password reset keep form references across async requests',() => {
  const platform=read('apps/storefront/public/js/platform.js');
  assert.match(platform,/const registerForm = document\.getElementById\("register-form"\)/);
  assert.match(platform,/registerForm\?\.addEventListener\("submit", async event => \{\s+event\.preventDefault\(\);\s+const form = event\.currentTarget;/);
  assert.match(platform,/const body = Object\.fromEntries\(new FormData\(form\)\)/);
  assert.match(platform,/form\.reset\(\)/);
  assert.doesNotMatch(platform,/event\.currentTarget\.reset\(\)/);
  assert.doesNotMatch(platform,/new FormData\(event\.currentTarget\)/);
});

test('Superadmin panel lists stores and can activate, suspend, or reject accounts',async () => {
  const calls=[];
  const client={
    release(){},
    query:async(sql,args=[])=>{
      calls.push({sql,args});
      if(sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return {rows:[]};
      if(sql.includes('FROM merchant_accounts WHERE id = $1 FOR UPDATE')){
        return {rows:[{id:7,business_name:'Zero Fear',desired_slug:'zero-fear',store_id:null}]};
      }
      if(sql.includes('FROM stores WHERE slug = $1')) return {rows:[]};
      if(sql.includes('INSERT INTO stores')) return {rows:[{id:22,slug:'zero-fear'}]};
      if(sql.includes('UPDATE merchant_accounts')) return {rows:[{id:7,status:args[0],store_id:args[1]}]};
      return {rows:[]};
    }
  };
  const controller=loadController('apps/backend/src/controllers/platform.controller.js',{
    bcrypt:{},jsonwebtoken:{},crypto:{randomBytes:()=>Buffer.from('1234')},
    '../db/db':{connect:async()=>client,query:async(sql,args)=>{calls.push({sql,args});return {rows:[]};}},
    '../services/supabaseAuth':{},'../config/auth':{}
  });
  const res=response();
  await controller.setAccountStatus({params:{id:'7'},body:{status:'active'},user:{user_id:1}},res,error=>{throw error;});
  assert.equal(res.data.success,true);
  assert.equal(res.data.store_id,22);
  assert.equal(res.data.store_url,'/tienda/zero-fear');
  assert.ok(calls.some(call=>String(call.sql).includes('INSERT INTO stores')));

  const adminJs=read('apps/storefront/public/js/platform-admin.js');
  const adminHtml=read('apps/storefront/public/platform.html');
  assert.match(adminHtml,/id="master-stats"/);
  assert.match(adminHtml,/id="merchant-status-filter"/);
  assert.match(adminJs,/data-value="active"/);
  assert.match(adminJs,/data-value="suspended"/);
  assert.match(adminJs,/data-value="rejected"/);
});

test('Every store template has its own immersive presentation and navigation mode',() => {
  const settings=read('apps/admin/js/store-settings.js');
  const renderer=read('apps/storefront/public/js/storefront-renderer.js');
  const styles=read('apps/storefront/public/css/styles.css');
  const homepage=read('apps/storefront/public/index.html');
  const templateValues=[...settings.matchAll(/value:"([a-z0-9_]+)"/g)].map(match=>match[1]);
  for(const template of templateValues){
    assert.match(styles,new RegExp(`template-${template.replaceAll('_','-')}`),`Missing visual system for ${template}`);
  }
  assert.match(renderer,/dataset\.storeNavigation/);
  assert.match(renderer,/applySitePalette/);
  assert.match(renderer,/storefront-products-section/);
  assert.match(renderer,/gym_active_1: \[\s*\{ type: "image_banner"/);
  assert.match(styles,/storefront-products-section/);
  assert.match(styles,/neoFloat/);
  for(const mode of ['rail','dock','floating','top']) assert.match(renderer,new RegExp(`"${mode}"`));
  assert.match(homepage,/id="hero-title"/);
  assert.match(homepage,/id="hero-text"/);
  assert.match(settings,/site-background-color/);
  assert.match(settings,/siteAccentColor/);
  assert.match(settings,/template-concept-stage/);
  assert.match(read('apps/admin/store.html'),/id="template-gallery"/);
  assert.match(read('apps/admin/store.html'),/id="site-background-color"/);
  assert.match(settings,/data-template-choice/);
});

test('Custom-domain routing remains scoped to one store and works on every storefront page',async () => {
  const calls=[];
  const db={query:async(sql,args)=>{calls.push({sql,args});return {rows:[{id:7,slug:'tienda-real'}]};}};
  const model=loadController('apps/backend/src/models/storeModel.js',{'../db/db':db});
  const found=await model.getStoreByCustomDomain('www.negocio.com');
  assert.equal(found.slug,'tienda-real');
  assert.match(calls[0].sql,/LOWER\(s\.custom_domain\) = LOWER\(\$1\)/);
  assert.deepEqual(Array.from(calls[0].args),['www.negocio.com']);
  await model.updateStoreSettings(7,{custom_domain:'www.negocio.com'});
  assert.match(calls[1].sql,/WHERE id = \$5/);
  assert.equal(calls[1].args.at(-1),7);
  assert.equal(calls[1].args[3],'www.negocio.com');
  for(const file of ['store.js','customer-account.js','product-detail.js']){
    assert.match(read(`apps/storefront/public/js/${file}`),/MERCADIA_CONFIG\?\.STORE_SLUG/);
  }
  assert.match(read('apps/backend/src/server.js'),/getStoreByCustomDomain/);
});

test('Storefront product and category links preserve the active store slug',() => {
  const products=read('apps/storefront/public/js/products.js');
  const detail=read('apps/storefront/public/js/product-detail.js');
  const renderer=read('apps/storefront/public/js/storefront-renderer.js');
  const homepage=read('apps/storefront/public/index.html');
  const productsPage=read('apps/storefront/public/products.html');
  const productPage=read('apps/storefront/public/product.html');

  assert.match(products,/function getCurrentStoreSlug/);
  assert.match(products,/pathname\.match\(\^?\/?[\s\S]*\\\/tienda\\\/\(\[\^\/\]\+\)/);
  assert.match(products,/params\.set\("slug", slug\)/);
  assert.match(detail,/pathname\.match\(\^?\/?[\s\S]*\\\/tienda\\\/\(\[\^\/\]\+\)/);
  assert.match(renderer,/function getProductsUrl/);
  assert.match(renderer,/params\.set\("slug", slug\)/);
  assert.match(renderer,/getProductsUrl\(store\?\.slug/);
  assert.match(homepage,/products\.js\?v=20260911-13/);
  assert.match(productsPage,/products\.js\?v=20260911-13/);
  assert.match(productPage,/product-detail\.js\?v=20260911-13/);
});
test('Merchant push test can target the current subscription',async () => {
  const rows=[{id:1,endpoint:'current',p256dh:'p',auth:'a',store_name:'Demo'},{id:2,endpoint:'old',p256dh:'p',auth:'a',store_name:'Demo'}];
  const calls=[];
  const service=loadController('apps/backend/src/services/pushNotifications.js',{
    '../db/db':{query:async(sql,args)=>{calls.push({sql,args});return {rows:args?.[1] ? rows.filter(row=>row.endpoint===args[1]) : rows};}},
    'web-push':{setVapidDetails(){},sendNotification:async()=>{}}
  },{VAPID_PUBLIC_KEY:'public',VAPID_PRIVATE_KEY:'private'});
  const result=await service.sendMerchantTest(7,'current');
  assert.equal(result.sent,1);
  assert.match(calls[0].sql,/mps\.endpoint = \$2/);
  assert.deepEqual(Array.from(calls[0].args),[7,'current']);
});
test('Merchant PWA uses backend push instead of foreground order polling',() => {
  const pwa=read('apps/storefront/public/js/pwa.js');
  const serviceWorker=read('apps/storefront/public/service-worker.js');
  for(const file of ['index.html','products.html','product.html','categorias.html','mi-cuenta.html','landing.html']){
    assert.match(read(`apps/storefront/public/${file}`),/pwa\.js\?v=20260911-15/);
  }
  assert.doesNotMatch(pwa,/fetchMerchantOrders|startMerchantOrderWatcher|setInterval\(/);
  assert.match(pwa,/\/admin\/push\/test/);
  assert.match(pwa,/service-worker\.js\?v=20260911-15/);
  assert.match(pwa,/navigator\.serviceWorker\.ready/);
  assert.match(pwa,/PWA MERCHANT TEST WARNING/);
  assert.match(serviceWorker,/mercadia-shell-v18/);
});
