import {getActivePromotions} from './api.js';
import {createPromotionCard} from './promotion-card.js';
function closedKey(slug,p){ return `mercadia_promotion_closed_${slug}_${p.id}_${p.updated_at || 'current'}`; }
function wasClosed(slug,p){ try { return sessionStorage.getItem(closedKey(slug,p)) === '1'; } catch { return false; } }
export async function initPromotionPopup(slug){
  try {
    if(!document.querySelector('link[data-promotions]')){
      const style = document.createElement('link'); style.rel = 'stylesheet'; style.href = new URL('../css/promotions.css',import.meta.url).href; style.dataset.promotions = 'true'; document.head.append(style);
    }
    const promotions = await getActivePromotions(slug);
    document.querySelectorAll('[data-commerce-promotions]').forEach(element => element.remove());
    const groups = {};
    for(const type of ['top_notice','banner','featured']){
      const entries = promotions.filter(p => p.type === type);
      if(!entries.length) continue;
      const group = document.createElement('div'); group.dataset.commercePromotions = type;
      group.className = 'commerce-promotions' + (type === 'top_notice' ? ' commerce-promotions--top' : '');
      for(const p of entries) group.append(createPromotionCard(p));
      groups[type] = group;
    }
    const main = document.querySelector('main') || document.querySelector('#products')?.parentElement || document.body;
    if(groups.top_notice) document.body.prepend(groups.top_notice);
    if(groups.banner) main.prepend(groups.banner);
    if(groups.featured) main.append(groups.featured);
    const queue = promotions.filter(p => (p.type || 'popup') === 'popup' && !wasClosed(slug,p));
    function next(){
      const p = queue.shift(); if(!p) return;
      const previousFocus = document.activeElement;
      const overlay = document.createElement('div'); overlay.className = 'commerce-popup-overlay'; overlay.dataset.commercePromotions = 'popup';
      const card = createPromotionCard(p); card.setAttribute('role','dialog'); card.setAttribute('aria-modal','true'); card.setAttribute('aria-label',p.title || 'Promoción');
      const close = document.createElement('button'); close.type = 'button'; close.className = 'commerce-popup-close'; close.textContent = '×'; close.setAttribute('aria-label','Cerrar promoción');
      close.addEventListener('click',() => { try { sessionStorage.setItem(closedKey(slug,p),'1'); } catch {} overlay.remove(); previousFocus?.focus(); next(); });
      overlay.addEventListener('keydown',event => {
        if(event.key === 'Escape') close.click();
        if(event.key === 'Tab'){
          const focusable = [...card.querySelectorAll('a,button')]; const first = focusable[0], last = focusable.at(-1);
          if(event.shiftKey && document.activeElement === first){event.preventDefault();last.focus();}
          else if(!event.shiftKey && document.activeElement === last){event.preventDefault();first.focus();}
        }
      });
      card.prepend(close); overlay.append(card); document.body.append(overlay); close.focus();
    }
    next();
  } catch(error){ console.error('PROMOTION ERROR:',error); }
}
