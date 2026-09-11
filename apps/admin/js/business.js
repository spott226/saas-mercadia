import {adminRequest,showMessage,runSafely} from './commerce-admin.js';
const form = document.getElementById('business-form');
await runSafely(async () => {
  const {store} = await adminRequest('/admin/store');
  for(const input of form.querySelectorAll('[name]')) input.value = store[input.name] || '';
});
form.addEventListener('submit',event => {
  event.preventDefault();
  runSafely(async () => {
    const button = form.querySelector('button'); button.disabled = true;
    try {
      const data = Object.fromEntries(new FormData(form));
      const {store} = await adminRequest('/admin/business',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
      for(const input of form.querySelectorAll('[name]')) input.value = store[input.name] || '';
      showMessage('Datos del negocio guardados');
    } finally { button.disabled = false; }
  });
});
