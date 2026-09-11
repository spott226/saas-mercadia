const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const validation = require('../apps/backend/src/services/commerceValidation');
const root = path.resolve(__dirname,'..');
const read = file => fs.readFileSync(path.join(root,file),'utf8');
function loadController(file, dependencies){
  const exports = {};
  vm.runInNewContext(read(file),{exports,require:name => {
    if(Object.hasOwn(dependencies,name)) return dependencies[name];
    throw new Error(`Unexpected dependency: ${name}`);
  },console:{error(){}},URL,Set,Map,Date});
  return exports;
}
function response(){ return {code:200,status(code){this.code=code;return this;},json(data){this.data=data;return this;}}; }

test('Business phones normalize formatting and reject malformed input',() => {
  assert.equal(validation.phone('+52 (55) 1234-5678'),'525512345678');
  assert.equal(validation.phone(''),'');
  for(const value of ['abc123456789','123','0000000000','+1234567890123456',{},'52+5512345678']) assert.throws(() => validation.phone(value));
  const data = validation.business({name:' Mi negocio ',whatsapp:'+52 55 1234 5678',store_id:99,owner_name:'<Ana>'});
  assert.deepEqual(data,{name:'Mi negocio',owner_name:'Ana',whatsapp:'525512345678'});
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
    await controller.createOrder({body:{store_id:7,customer_name:'Ana',customer_phone:'5512345678',customer_address:'Calle 1',items:[{variant_id:1,quantity:1}]}},res,error=>{throw error;});
    assert.equal(res.code,409);
    assert.match(res.data.error,/configurado/);
    assert.equal(calls.length,1);
    assert.ok(released);
  }
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
function checkoutHarness(whatsapp,{accept=true,serverPhone='525500001111'}={}){
  const calls={orders:0,confirmations:0,alerts:[],navigations:[],removed:[]};
  const storage={mercadia_cart:JSON.stringify([{id:1,variant_id:2,name:'Producto',qty:2,price:10}])};
  const inputs={'c-name':'Ana','c-phone':'5512345678','c-address':'Calle 1'};
  const document={querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){},getElementById:id=>inputs[id] ? {value:inputs[id]} : null};
  const context={document,console,URL,localStorage:{getItem:key=>storage[key],removeItem:key=>{delete storage[key];calls.removed.push(key);}},window:{store:{id:7,name:'Negocio',whatsapp},location:{assign:url=>calls.navigations.push(url)}},alert:message=>calls.alerts.push(message),confirm:()=>{calls.confirmations++;return accept;},saveCustomerProfile(){},getCustomerProfile(){return {};},createOrder:async()=>{calls.orders++;return {success:true,order_id:12,whatsapp:serverPhone};}};
  const source=read('apps/storefront/public/js/whatsapp.js').replace('export ','')+'\n'+read('apps/storefront/public/js/cart.js').replace(/^import[\s\S]*?from ["'][^"']+["'];\s*/gm,'').replaceAll('export ','');
  vm.runInNewContext(source,context);
  return {calls,send:context.window.sendCheckout};
}
test('Checkout blocks missing WhatsApp without creating an order',async () => {
  for(const number of [undefined,'abc','123']){
    const {calls,send}=checkoutHarness(number);await send();
    assert.equal(calls.orders,0);assert.equal(calls.navigations.length,0);assert.match(calls.alerts[0],/configurado/);
  }
});
test('Checkout shows summary first, allows cancellation, and uses the authoritative store phone',async () => {
  let harness=checkoutHarness('+52 55 1234 5678',{accept:false});await harness.send();assert.equal(harness.calls.confirmations,1);assert.equal(harness.calls.orders,0);
  harness=checkoutHarness('+52 55 1234 5678');await harness.send();
  assert.equal(harness.calls.orders,1);assert.equal(harness.calls.confirmations,1);assert.equal(harness.calls.navigations.length,1);
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
  vm.runInNewContext(read('apps/backend/src/routes/admin.js'),{module,require:name=>({express:{Router:()=>router},'../controllers/adminController':controller,'../middleware/auth':{requireAdmin:noop},'../db/db':{query:async()=>({rows:ownerRows})},'../config/multer':{single:()=>noop},'../controllers/push.controller':{subscribeMerchant:noop}})[name]});
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
  const context={document,console,URL,sessionStorage:{getItem(){},setItem(){}},getActivePromotions:async()=>promotions};
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
