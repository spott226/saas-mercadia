const fail = message => { const error = new Error(message); error.status = 400; throw error; };
function text(value, max, required = false){
  if(typeof value !== 'string') fail('Texto inválido');
  const result = value.trim().replace(/[\u0000-\u001f<>]/g, '');
  if(result.length > max || (required && !result)) fail('Texto vacío o demasiado largo');
  return result;
}
function phone(value){
  if(value == null || value === '') return '';
  if(typeof value !== 'string' || !/^\+?[\d\s().-]+$/.test(value.trim())) fail('Teléfono inválido; incluye el código de país');
  const digits = value.replace(/\D/g, '');
  if(!/^[1-9]\d{7,14}$/.test(digits)) fail('Teléfono inválido; incluye el código de país');
  return digits;
}
function url(value){
  const result = text(value, 2048);
  if(!result) return '';
  if(/[\s\\]/.test(result)) fail('URL inválida');
  if(/^\/(?!\/)/.test(result)) return result;
  try { const parsed = new URL(result); if(['https:', 'http:'].includes(parsed.protocol) && !parsed.username && !parsed.password) return parsed.href; } catch {}
  fail('Usa una URL http/https o una ruta que empiece por /');
}
function promotion(body){
  const data = {};
  for(const [key, max] of Object.entries({internal_name:160,title:160,description:4000,discount_text:120,button_text:80})){
    if(body[key] !== undefined) data[key] = text(body[key], max, key === 'title');
  }
  for(const key of ['button_url','image_url']) if(body[key] !== undefined) data[key] = url(body[key]);
  if(body.type !== undefined){
    if(!['popup','banner','top_notice','featured'].includes(body.type)) fail('Tipo de promoción inválido');
    data.type = body.type;
  }
  if(body.priority !== undefined){
    data.priority = Number(body.priority);
    if(!Number.isInteger(data.priority) || Math.abs(data.priority) > 100000) fail('Prioridad inválida');
  }
  if(body.is_active !== undefined){
    if(![true,false,'true','false','1','0','on'].includes(body.is_active)) fail('Estado inválido');
    data.is_active = [true,'true','1','on'].includes(body.is_active);
  }
  for(const key of ['starts_at','ends_at']) if(body[key] !== undefined){
    const value = body[key];
    if(value === '' || value === null) data[key] = null;
    else {
      if(typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0,10) !== value.slice(0,10)) fail('Fecha inválida');
      data[key] = new Date(value).toISOString();
    }
  }
  if(data.starts_at && data.ends_at && Date.parse(data.starts_at) > Date.parse(data.ends_at)) fail('La fecha final debe ser posterior al inicio');
  return data;
}
function business(body){
  const data = {};
  for(const [key,max] of Object.entries({name:120,owner_name:120,address:500,business_hours:1000})) if(body[key] !== undefined) data[key] = text(body[key],max,key === 'name');
  for(const key of ['whatsapp','phone']) if(body[key] !== undefined) data[key] = phone(body[key]);
  if(!Object.keys(data).length) fail('No hay datos para guardar');
  return data;
}
module.exports = {phone,url,promotion,business};
