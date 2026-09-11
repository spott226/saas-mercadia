export function normalizeBusinessWhatsapp(value){
  if(typeof value !== 'string' || !/^\+?[\d\s().-]+$/.test(value.trim())) return '';
  const digits = value.replace(/\D/g,'');
  return /^[1-9]\d{7,14}$/.test(digits) ? digits : '';
}
