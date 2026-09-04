import { UNIVERSITY_CONFIG } from './campaign-config.js?v=2.0.0';

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwlgMaSfu7ov7sCVhkNifiWI_vnP_jVyZ2HgcrTeVsaJOdrwx2DcX9cFt3hgNyZabe8/exec';
const form = document.querySelector('#pickup-form');
const query = new URLSearchParams(location.search);
const campusSelect = document.querySelector('#pickup-campus');
const requestInput = document.querySelector('#pickup-request');
const dateInput = document.querySelector('#pickup-date');

Object.values(UNIVERSITY_CONFIG).filter((item) => item.active).forEach((item) => {
  const option = document.createElement('option');
  option.value = item.slug;
  option.textContent = item.name;
  campusSelect.append(option);
});

if (UNIVERSITY_CONFIG[query.get('campus')]?.active) campusSelect.value = query.get('campus');
requestInput.value = String(query.get('request') || '').toUpperCase().slice(0, 12);
dateInput.min = new Date().toISOString().slice(0, 10);

requestInput.addEventListener('input', () => {
  requestInput.value = requestInput.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 12);
});

document.querySelector('#pickup-consent-panel').addEventListener('click', (event) => {
  if (event.target.closest('input, label')) return;
  document.querySelector('#pickup-consent').click();
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const errors = {
    pickupCampus: UNIVERSITY_CONFIG[campusSelect.value]?.active ? '' : 'Selecciona una universidad válida.',
    pickupRequest: /^SP-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(requestInput.value) ? '' : 'Revisa el número de solicitud.',
    pickupDate: dateInput.value ? '' : 'Selecciona la fecha anunciada.',
    pickupConsent: document.querySelector('#pickup-consent').checked ? '' : 'Confirma que asistirás al retiro.',
  };
  Object.entries(errors).forEach(([key, value]) => { document.querySelector(`#${key}-error`).textContent = value; });
  if (Object.values(errors).some(Boolean)) return;

  const button = document.querySelector('#pickup-submit');
  button.disabled = true;
  button.querySelector('span').textContent = 'ENVIANDO...';
  try {
    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: new URLSearchParams({
        action: 'confirmPickup',
        campus: campusSelect.value,
        confirmationCode: requestInput.value,
        campusDropDate: dateInput.value,
        confirmed: 'true',
        confirmationTimestamp: new Date().toISOString(),
      }),
    });
    form.hidden = true;
    document.querySelector('#pickup-result').hidden = false;
  } catch {
    const message = document.querySelector('#pickup-message');
    message.textContent = 'No pudimos confirmar el retiro. Revisa tu conexión e inténtalo otra vez.';
    message.hidden = false;
    button.disabled = false;
    button.querySelector('span').textContent = 'CONFIRMAR RETIRO';
  }
});
