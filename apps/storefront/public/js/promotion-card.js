// Keep the admin preview and storefront copies identical (covered by commerce tests).
export function safePromotionUrl(value, preview = false){
  if(typeof value !== 'string' || /[\s\\]/.test(value)) return '';
  if(preview && value.startsWith('blob:')) return value;
  if(/^\/(?!\/)/.test(value)) return value;
  try { const url = new URL(value); return ['https:','http:'].includes(url.protocol) && !url.username && !url.password ? url.href : ''; } catch { return ''; }
}
export function createPromotionCard(promotion, {preview = false} = {}){
  const type = ['popup','banner','top_notice','featured'].includes(promotion.type) ? promotion.type : 'popup';
  const card = document.createElement('section');
  card.className = `commerce-promotion commerce-promotion--${type}`;
  const imageUrl = safePromotionUrl(promotion.image_url, preview);
  if(imageUrl){ const image = document.createElement('img'); image.src = imageUrl; image.alt = promotion.title || 'Promoción'; card.append(image); }
  const content = document.createElement('div'); content.className = 'commerce-promotion-content';
  for(const [tag,key] of [['small','discount_text'],['h2','title'],['p','description']]){
    if(!promotion[key]) continue;
    const element = document.createElement(tag); element.textContent = promotion[key]; content.append(element);
  }
  const url = safePromotionUrl(promotion.button_url);
  if(url && promotion.button_text){
    const link = document.createElement('a'); link.href = url; link.textContent = promotion.button_text;
    if(preview) { link.tabIndex = -1; link.addEventListener('click',event => event.preventDefault()); }
    content.append(link);
  }
  card.append(content);
  return card;
}
