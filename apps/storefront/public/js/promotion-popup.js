import { getActivePromotion } from "./api.js";

function hasClosedPromotion(slug, promotion){
  const version =
    promotion.updated_at ||
    promotion.ends_at ||
    promotion.starts_at ||
    "current";

  const key =
    `mercadia_promotion_closed_${slug}_${promotion.id}_${version}`;

  return sessionStorage.getItem(key) === "1";
}

function markPromotionClosed(slug, promotion){
  const version =
    promotion.updated_at ||
    promotion.ends_at ||
    promotion.starts_at ||
    "current";

  const key =
    `mercadia_promotion_closed_${slug}_${promotion.id}_${version}`;

  sessionStorage.setItem(key, "1");
}

function createText(tag, text, className){
  const element = document.createElement(tag);
  element.textContent = text || "";

  if(className){
    element.className = className;
  }

  return element;
}

function renderPromotionPopup(slug, promotion){
  if(!promotion || hasClosedPromotion(slug, promotion)){
    return;
  }

  const overlay = document.createElement("div");
  overlay.className = "promotion-popup";

  const panel = document.createElement("div");
  panel.className = "promotion-panel";

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "promotion-close";
  closeButton.textContent = "x";
  closeButton.setAttribute("aria-label", "Cerrar promocion");

  closeButton.addEventListener("click", () => {
    markPromotionClosed(slug, promotion);
    overlay.remove();
  });

  const imageUrl =
    promotion.image_url ||
    promotion.image;

  if(imageUrl){
    const image = document.createElement("img");
    image.src = imageUrl;
    image.alt = promotion.title || "Promocion";
    image.loading = "lazy";
    image.className = "promotion-image";
    panel.appendChild(image);
  }

  const content = document.createElement("div");
  content.className = "promotion-content";

  if(promotion.discount_text){
    content.appendChild(
      createText(
        "p",
        promotion.discount_text,
        "promotion-discount"
      )
    );
  }

  content.appendChild(
    createText(
      "h2",
      promotion.title || "Promocion",
      "promotion-title"
    )
  );

  if(promotion.description){
    content.appendChild(
      createText(
        "p",
        promotion.description,
        "promotion-description"
      )
    );
  }

  if(promotion.button_text && promotion.button_url){
    const link = document.createElement("a");
    link.href = promotion.button_url;
    link.className = "promotion-button";
    link.textContent = promotion.button_text;

    content.appendChild(link);
  }

  panel.append(closeButton, content);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);
}

export async function initPromotionPopup(slug){
  try{
    const promotion =
      await getActivePromotion(slug);

    if(!promotion || promotion.is_active === false){
      return;
    }

    renderPromotionPopup(slug, promotion);
  }catch(error){
    console.error("PROMOTION ERROR:", error);
  }
}
