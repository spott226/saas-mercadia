(() => {
  const icons = {
    dashboard:'<path d="M3 3h7v7H3zM14 3h7v4h-7zM14 11h7v10h-7zM3 14h7v7H3z"/>',
    products:'<path d="m7.5 4.27 9 5.15M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>',
    orders:'<path d="M6 2h12v20l-3-2-3 2-3-2-3 2Z"/><path d="M9 7h6M9 11h6M9 15h4"/>',
    inventory:'<path d="M3 6h18M5 6l1-3h12l1 3M5 6v15h14V6M9 10h6"/>',
    customers:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    store:'<path d="M3 9 5 3h14l2 6M5 13v8h14v-8M9 21v-6h6v6"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/>',
    logout:'<path d="M10 17l5-5-5-5M15 12H3M21 19V5a2 2 0 0 0-2-2h-6"/>',
    help:'<circle cx="12" cy="12" r="9"/><path d="M9.6 9a2.5 2.5 0 1 1 3.7 2.2c-.8.4-1.3.9-1.3 1.8M12 17h.01"/>',
    menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
    download:'<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    save:'<path d="M4 4h14l2 2v14H4zM8 4v6h8V4M8 20v-6h8v6"/>',
    external:'<path d="M14 3h7v7M10 14 21 3M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/>',
    edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/>',
    trash:'<path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v6M14 11v6"/>',
    login:'<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/>'
  };

  const svg = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.help}</svg>`;
  const page = location.pathname.split('/').pop()?.replace('.html','') || 'dashboard';
  const pageCopy = {
    dashboard:['Centro de control','Resumen de ventas, operación y rendimiento de tu tienda.'],
    products:['Catálogo','Crea productos, variantes, precios e imágenes desde un solo flujo.'],
    orders:['Operación','Supervisa cada pedido y avanza su proceso sin perder el control del stock.'],
    inventory:['Existencias','Consulta disponibilidad, reservas, valor y movimientos de inventario.'],
    customers:['Relaciones','Conoce a tus clientes confirmados y su historial de compra.'],
    store:['Experiencia digital','Diseña la página pública que verán los compradores de tu negocio.'],
    login:['Acceso seguro','']
  };

  document.body.classList.toggle('os-login', page === 'login');
  document.body.dataset.adminPage = page;

  document.querySelectorAll('.menu a').forEach(link => {
    const name = link.getAttribute('href')?.split('.')[0] || 'dashboard';
    if(!link.querySelector('.nav-icon')) link.insertAdjacentHTML('afterbegin', `<span class="nav-icon">${svg(name)}</span>`);
  });

  document.querySelectorAll('.info-dot').forEach(button => {
    button.innerHTML = `<span class="help-icon">${svg('help')}</span>`;
    button.setAttribute('role','button');
    button.setAttribute('tabindex','0');
    button.setAttribute('aria-label','Mostrar ayuda');
    button.addEventListener('click', event => {
      event.stopPropagation();
      document.querySelectorAll('.info-dot.is-open').forEach(item => item !== button && item.classList.remove('is-open'));
      button.classList.toggle('is-open');
    });
    button.addEventListener('keydown', event => {
      if(event.key === 'Enter' || event.key === ' '){
        event.preventDefault();
        button.click();
      }
    });
  });

  document.addEventListener('click', () => document.querySelectorAll('.info-dot.is-open').forEach(item => item.classList.remove('is-open')));

  const toggle = document.querySelector('.menu-toggle');
  if(toggle) toggle.innerHTML = `<span class="toggle-icon">${svg('menu')}</span>`;
  const logout = document.querySelector('.logout');
  if(logout && !logout.querySelector('.button-icon')) logout.insertAdjacentHTML('afterbegin', `<span class="button-icon">${svg('logout')}</span>`);

  const heading = document.querySelector('.header h1,.page-heading .page-title,.content > .page-title');
  if(heading){
    const [eyebrow,subtitle] = pageCopy[page] || ['Mercadia Commerce','Administra tu negocio desde un solo lugar.'];
    heading.dataset.subtitle = subtitle;
    const parent = heading.parentElement;
    if(parent && !parent.querySelector(':scope > .os-eyebrow')){
      const wrapper = document.createElement('div');
      wrapper.className = 'os-heading-wrap';
      heading.before(wrapper);
      wrapper.append(heading);
      wrapper.insertAdjacentHTML('afterbegin', `<span class="os-eyebrow">${eyebrow}</span>`);
    }
  }

  const buttonRules = [
    ['.export-btn','download'],
    ['#save-btn,#save-experience-btn,#save-promotion-btn','save'],
    ['.secondary-action','plus'],
    ['#store-preview-link','external'],
    ['.login-box button','login']
  ];
  buttonRules.forEach(([selector,name]) => document.querySelectorAll(selector).forEach(button => {
    if(!button.querySelector('.button-icon')) button.insertAdjacentHTML('afterbegin', `<span class="button-icon">${svg(name)}</span>`);
  }));

  const decorateActions = root => {
    root.querySelectorAll?.('.edit-btn,.delete-btn').forEach(button => {
      if(button.querySelector('.button-icon')) return;
      button.insertAdjacentHTML('afterbegin', `<span class="button-icon">${svg(button.classList.contains('delete-btn') ? 'trash' : 'edit')}</span>`);
    });
  };
  decorateActions(document);
  new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => {
    if(node.nodeType === Node.ELEMENT_NODE) decorateActions(node);
  }))).observe(document.body,{childList:true,subtree:true});
})();
