import { UNIVERSITY_CONFIG, campaignContext, isValidWhatsAppChannel } from './campaign-config.js?v=2.0.0';

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwlgMaSfu7ov7sCVhkNifiWI_vnP_jVyZ2HgcrTeVsaJOdrwx2DcX9cFt3hgNyZabe8/exec';
const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
const form = $('#registration-form');
const startedAt = Date.now();
const context = campaignContext();
const runtimeUniversities = Object.fromEntries(Object.entries(UNIVERSITY_CONFIG).map(([slug, university]) => [slug, { ...university }]));

function fieldValue(name) {
  const control = form.elements[name];
  if (!control) return '';
  if (control.type === 'checkbox') return control.checked;
  return control.value.trim();
}

function clearErrors() {
  $$('.field-error', form).forEach((element) => { element.textContent = ''; });
  $$('[aria-invalid="true"]', form).forEach((element) => element.removeAttribute('aria-invalid'));
  $('#form-message').hidden = true;
}

function showErrors(errors, { focus = true } = {}) {
  clearErrors();
  let firstControl = null;
  Object.entries(errors || {}).forEach(([field, message]) => {
    const error = $(`#${CSS.escape(field)}-error`);
    const control = form.elements[field];
    if (error) error.textContent = message;
    if (control) {
      control.setAttribute('aria-invalid', 'true');
      firstControl ||= control;
    }
  });
  if (errors?.form) {
    const message = $('#form-message');
    message.textContent = errors.form;
    message.hidden = false;
    firstControl ||= message;
  }
  if (focus && firstControl) firstControl.focus();
}

function normalizePhone(value) {
  let digits = value.replace(/\D/g, '');
  if (digits.length === 10) digits = `1${digits}`;
  return digits.length === 11 && digits.startsWith('1') && ['809', '829', '849'].includes(digits.slice(1, 4)) ? `+${digits}` : null;
}

function validCedula(value) {
  const digits = value.replace(/\D/g, '');
  if (!/^\d{11}$/.test(digits) || /^(\d)\1{10}$/.test(digits)) return false;
  let sum = 0;
  for (let index = 0; index < 10; index += 1) {
    let product = Number(digits[index]) * (index % 2 === 0 ? 1 : 2);
    if (product > 9) product -= 9;
    sum += product;
  }
  return (10 - (sum % 10)) % 10 === Number(digits[10]);
}

function validRnc(value) {
  const digits = value.replace(/\D/g, '');
  if (!/^\d{9}$/.test(digits) || /^(\d)\1{8}$/.test(digits)) return false;
  const weights = [7, 9, 8, 6, 5, 4, 3, 2];
  const sum = weights.reduce((total, weight, index) => total + (Number(digits[index]) * weight), 0);
  const remainder = 11 - (sum % 11);
  const checkDigit = remainder === 10 ? 1 : remainder === 11 ? 2 : remainder;
  return checkDigit === Number(digits[8]);
}

function validPassport(value) {
  return /^[A-Z0-9][A-Z0-9-]{4,18}[A-Z0-9]$/.test(value.trim().toUpperCase());
}

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function validBirthDate(value) {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return false;
  const [day, month, year] = value.split('/').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return !Number.isNaN(date.valueOf()) && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day && year >= 1900 && isoDate <= localDateString();
}

function birthDateToISO(value) {
  const [day, month, year] = value.split('/');
  return `${year}-${month}-${day}`;
}

function documentTypeLabel(type) {
  return ({ cedula: 'CÉDULA', rnc: 'RNC', pasaporte: 'PASAPORTE' })[type] || 'IDENTIFICACIÓN';
}

function validateForm() {
  const errors = {};
  const fullName = fieldValue('fullName').replace(/\s+/g, ' ');
  if (fullName.length < 5 || fullName.length > 120 || fullName.split(' ').filter(Boolean).length < 2 || !/^[\p{L}\p{M}'’\-. ]+$/u.test(fullName)) errors.fullName = 'Escribe al menos un nombre y un apellido, sin números.';
  const documentType = fieldValue('documentType');
  const documentNumber = fieldValue('documentNumber');
  if (documentType === 'cedula' && !validCedula(documentNumber)) errors.documentNumber = 'La cédula no supera la verificación. Revisa los 11 dígitos.';
  else if (documentType === 'rnc' && !validRnc(documentNumber)) errors.documentNumber = 'El RNC no supera la verificación. Revisa los 9 dígitos.';
  else if (documentType === 'pasaporte' && !validPassport(documentNumber)) errors.documentNumber = 'Escribe un pasaporte válido de 6 a 20 caracteres.';
  if (!validBirthDate(fieldValue('birthDate'))) errors.birthDate = 'Escribe una fecha válida con el formato DD/MM/AAAA.';
  if (!normalizePhone(fieldValue('phone'))) errors.phone = 'Usa un número dominicano válido: 809, 829 o 849.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(fieldValue('email'))) errors.email = 'Escribe un correo electrónico válido.';
  if (fieldValue('addressLine').replace(/\s+/g, ' ').length < 15) errors.addressLine = 'Agrega calle, número, sector, municipio y provincia.';
  if (!fieldValue('privacyConsent')) errors.privacyConsent = 'Debes autorizar el uso de los datos para crear tu cuenta.';
  if (fieldValue('website')) errors.form = 'No pudimos procesar el registro.';
  showErrors(errors);
  return !Object.keys(errors).length;
}

function createConfirmationCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const token = [...bytes].map((value) => alphabet[value % alphabet.length]).join('');
  return `SP-${token.slice(0, 4)}-${token.slice(4)}`;
}

function payloadFromForm(confirmationCode) {
  const documentType = fieldValue('documentType');
  return {
    action: 'register',
    fullName: fieldValue('fullName').replace(/\s+/g, ' '),
    documentType,
    documentNumber: `${documentTypeLabel(documentType)}: ${fieldValue('documentNumber').toUpperCase()}`,
    birthDate: birthDateToISO(fieldValue('birthDate')),
    phone: normalizePhone(fieldValue('phone')),
    email: fieldValue('email').toLowerCase(),
    addressLine: fieldValue('addressLine').replace(/\s+/g, ' '),
    privacyConsent: 'true',
    confirmationCode,
    source: context.sourceType,
    campus: context.campus,
    campaign: context.campaign,
    sourceQr: context.sourceQr,
    pieceType: context.pieceType,
    pieceId: context.pieceId,
    origin: window.location.href,
    website: fieldValue('website'),
    startedAt: String(startedAt),
  };
}

async function submitRegistration(event) {
  event.preventDefault();
  if (!validateForm()) return;
  const button = $('#submit-registration');
  const label = button.querySelector('span');
  const originalLabel = label.textContent;
  const confirmationCode = createConfirmationCode();
  button.disabled = true;
  label.textContent = 'ENVIANDO...';
  clearErrors();
  try {
    await fetch(APPS_SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: new URLSearchParams(payloadFromForm(confirmationCode)) });
    renderConfirmation({ firstName: fieldValue('fullName').split(/\s+/)[0], confirmationCode });
  } catch {
    showErrors({ form: 'No pudimos enviar el registro. Revisa tu conexión e inténtalo otra vez.' });
  } finally {
    button.disabled = false;
    label.textContent = originalLabel;
  }
}

function universityForContext() {
  return context.campus ? runtimeUniversities[context.campus] : null;
}

function renderConfirmation(registration) {
  form.hidden = true;
  const confirmation = $('#confirmation');
  confirmation.hidden = false;
  $('#confirmation-name').textContent = registration.firstName.toUpperCase();
  $('#confirmation-code').textContent = registration.confirmationCode;
  const university = universityForContext();
  const followup = $('#campus-followup');
  if (context.sourceType === 'universidad' && university) {
    followup.hidden = false;
    $('#confirmation-campus').textContent = university.name;
    const channel = $('#confirmation-channel');
    const pending = $('#channel-pending');
    if (isValidWhatsAppChannel(university.channelUrl)) {
      channel.href = university.channelUrl;
      channel.hidden = false;
      pending.hidden = true;
    } else {
      channel.hidden = true;
      pending.hidden = false;
    }
    const pickupLink = $('#pickup-confirmation-link');
    pickupLink.href = `./retiro.html?campus=${encodeURIComponent(context.campus)}&request=${encodeURIComponent(registration.confirmationCode)}`;
    pickupLink.hidden = false;
  } else {
    followup.hidden = true;
  }
  confirmation.scrollIntoView({ behavior: 'smooth', block: 'center' });
  $('#confirmation-title').focus({ preventScroll: true });
  $('#mobile-cta').hidden = true;
}

function applyCampaignContext() {
  const university = universityForContext();
  document.body.dataset.source = context.sourceType;
  $('#campaign-source-badge').textContent = context.sourceType === 'universidad' ? 'UNIVERSIDAD' : 'VÍA PÚBLICA';
  $('#campaign-campus-name').textContent = university ? `SPEEDPACK CAMPUS ${university.name}` : 'REGISTRO GENERAL';
  $('#campaign-piece-code').textContent = `${context.pieceType.replaceAll('_', ' ')} · ${context.pieceId}`.toUpperCase();
  $('#source-warning').hidden = !context.invalidCampus;
  if (university) {
    $('#campaign-system-code').textContent = `SPEEDPACK://CAMPUS/${university.slug.toUpperCase()}`;
    $('#campaign-eyebrow').textContent = `SPEEDPACK CAMPUS · ${university.name}`;
    $('#campaign-headline').innerHTML = 'COMPRA ONLINE.<br>RECIBE EN <span class="no-break">C<span class="accented-letter accented-a" aria-hidden="true">A</span>MPUS.</span>';
    $('#campaign-headline').setAttribute('aria-label', 'Compra online. Recibe en campus.');
    $('#campaign-description').textContent = `Crea tu cuenta Speedpack desde ${university.name}. Tu registro quedará vinculado únicamente a este campus.`;
    $('#trust-rate').textContent = 'CAMPUS IDENTIFICADO';
  }
}

async function loadUniversityChannels() {
  try {
    const response = await fetch(`${APPS_SCRIPT_URL}?action=config`, { method: 'GET' });
    if (!response.ok) return;
    const payload = await response.json();
    (payload.universities || []).forEach((item) => {
      if (!runtimeUniversities[item.slug] || !item.active) return;
      runtimeUniversities[item.slug] = { ...runtimeUniversities[item.slug], name: String(item.name || runtimeUniversities[item.slug].name), channelUrl: isValidWhatsAppChannel(item.channelUrl) ? item.channelUrl : '', pickupPoint: String(item.pickupPoint || runtimeUniversities[item.slug].pickupPoint) };
    });
  } catch {
    // La configuración local mantiene el registro operativo si Google tarda en responder.
  }
}

function formatPhone(event) {
  const digits = event.target.value.replace(/\D/g, '').replace(/^1(?=8(?:09|29|49))/, '').slice(0, 10);
  const parts = [];
  if (digits.length) parts.push(digits.slice(0, 3));
  if (digits.length > 3) parts.push(digits.slice(3, 6));
  if (digits.length > 6) parts.push(digits.slice(6, 10));
  event.target.value = parts.join(' ');
}

function formatDocumentNumber(event) {
  const documentType = fieldValue('documentType');
  if (documentType === 'cedula') {
    const digits = event.target.value.replace(/\D/g, '').slice(0, 11);
    event.target.value = digits.length <= 3 ? digits : digits.length <= 10 ? `${digits.slice(0, 3)}-${digits.slice(3)}` : `${digits.slice(0, 3)}-${digits.slice(3, 10)}-${digits.slice(10)}`;
    return;
  }
  if (documentType === 'rnc') {
    event.target.value = event.target.value.replace(/\D/g, '').slice(0, 9);
    return;
  }
  event.target.value = event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 20);
}

function formatBirthDate(event) {
  const digits = event.target.value.replace(/\D/g, '').slice(0, 8);
  event.target.value = digits.length <= 2 ? digits : digits.length <= 4 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function updateDocumentField() {
  const type = fieldValue('documentType');
  const input = $('#document-number');
  const settings = {
    cedula: { label: 'NÚMERO DE CÉDULA', placeholder: '000-0000000-0', inputMode: 'numeric', maxLength: 13 },
    rnc: { label: 'NÚMERO DE RNC', placeholder: '000000000', inputMode: 'numeric', maxLength: 9 },
    pasaporte: { label: 'NÚMERO DE PASAPORTE', placeholder: 'Ej. PA1234567', inputMode: 'text', maxLength: 20 },
  }[type];
  $('#document-number-label').textContent = settings.label;
  input.placeholder = settings.placeholder;
  input.inputMode = settings.inputMode;
  input.maxLength = settings.maxLength;
  input.value = '';
  input.removeAttribute('aria-invalid');
  $('#documentNumber-error').textContent = '';
}

function updateConsentStatus() {
  const consent = $('#privacy-consent');
  $('#consent-panel').classList.toggle('is-authorized', consent.checked);
  $('#privacyConsent-status').hidden = !consent.checked;
}

async function init() {
  $('#current-year').textContent = new Date().getFullYear();
  applyCampaignContext();
  await loadUniversityChannels();
  applyCampaignContext();
  form.addEventListener('submit', submitRegistration);
  $('#phone').addEventListener('input', formatPhone);
  $('#document-type').addEventListener('change', updateDocumentField);
  $('#document-number').addEventListener('input', formatDocumentNumber);
  $('#birth-date').addEventListener('input', formatBirthDate);
  $('#privacy-consent').addEventListener('change', updateConsentStatus);
  $('#consent-panel').addEventListener('click', (event) => { if (!event.target.closest('input, label, a')) $('#privacy-consent').click(); });
  $('#address-line').addEventListener('input', (event) => { $('#address-count').textContent = `${event.target.value.length}/300`; });
  $$('[data-start-registration]').forEach((link) => link.addEventListener('click', () => setTimeout(() => $('#full-name').focus({ preventScroll: true }), 500)));
  $('#copy-code').addEventListener('click', async () => {
    const button = $('#copy-code');
    await navigator.clipboard.writeText($('#confirmation-code').textContent).catch(() => {});
    button.textContent = 'COPIADO';
    setTimeout(() => { button.textContent = 'COPIAR'; }, 1300);
  });
  const observer = new IntersectionObserver(([entry]) => $('#mobile-cta').classList.toggle('is-dismissed', entry.isIntersecting), { threshold: 0.08 });
  observer.observe($('#registro'));
}

init();
