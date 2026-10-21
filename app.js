import { UNIVERSITY_CONFIG, campaignContext, isValidWhatsAppChannel } from './campaign-config.js?v=2.1.0';

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwlgMaSfu7ov7sCVhkNifiWI_vnP_jVyZ2HgcrTeVsaJOdrwx2DcX9cFt3hgNyZabe8/exec';
const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
const form = $('#registration-form');
const context = campaignContext();
const runtimeUniversities = Object.fromEntries(Object.entries(UNIVERSITY_CONFIG).map(([slug, item]) => [slug, { ...item }]));

function value(name) {
  const control = form.elements[name];
  return control && control.type === 'checkbox' ? control.checked : (control ? control.value.trim() : '');
}
function clearErrors() {
  $$('.field-error', form).forEach((item) => { item.textContent = ''; });
  $$('[aria-invalid="true"]', form).forEach((item) => item.removeAttribute('aria-invalid'));
  $('#form-message').hidden = true;
}
function showErrors(errors) {
  clearErrors();
  let first = null;
  Object.entries(errors).forEach(([name, message]) => {
    const error = $('#' + CSS.escape(name) + '-error');
    const control = form.elements[name];
    if (error) error.textContent = message;
    if (control) { control.setAttribute('aria-invalid', 'true'); first ||= control; }
  });
  if (errors.form) { const message = $('#form-message'); message.textContent = errors.form; message.hidden = false; first ||= message; }
  if (first) first.focus();
}
function phone(value) {
  let digits = value.replace(/\D/g, '');
  if (digits.length === 10) digits = '1' + digits;
  return /^1(809|829|849)\d{7}$/.test(digits) ? '+' + digits : null;
}
function validPassport(input) { return /^[A-Z0-9][A-Z0-9-]{4,18}[A-Z0-9]$/.test(input.toUpperCase()); }
function validBirthDate(input) {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(input)) return false;
  const [day, month, year] = input.split('/').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day && year >= 1900 && date <= new Date();
}
function validCedula(input) { return /^\d{3}-?\d{7}-?\d$/.test(input); }
function validRnc(input) { return /^\d{9}$/.test(input); }
function documentLabel(type) { return ({ cedula: 'CÉDULA', rnc: 'RNC', pasaporte: 'PASAPORTE' })[type] || 'IDENTIFICACIÓN'; }
function code() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const token = [...bytes].map((byte) => alphabet[byte % alphabet.length]).join('');
  return 'SP-' + token.slice(0, 4) + '-' + token.slice(4);
}
function validate() {
  const errors = {};
  const name = value('fullName').replace(/\s+/g, ' ');
  const type = value('documentType');
  const documentNumber = value('documentNumber');
  if (name.split(' ').filter(Boolean).length < 2) errors.fullName = 'Escribe al menos un nombre y un apellido.';
  if ((type === 'cedula' && !validCedula(documentNumber)) || (type === 'rnc' && !validRnc(documentNumber)) || (type === 'pasaporte' && !validPassport(documentNumber))) errors.documentNumber = 'Revisa tu identificación.';
  if (!validBirthDate(value('birthDate'))) errors.birthDate = 'Escribe una fecha válida con el formato DD/MM/AAAA.';
  if (!phone(value('phone'))) errors.phone = 'Usa un número dominicano válido: 809, 829 o 849.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value('email'))) errors.email = 'Escribe un correo electrónico válido.';
  if (value('addressLine').replace(/\s+/g, ' ').length < 15) errors.addressLine = 'Agrega calle, número, sector, municipio y provincia.';
  if (!value('privacyConsent')) errors.privacyConsent = 'Debes autorizar el uso de los datos para crear tu cuenta.';
  showErrors(errors);
  return !Object.keys(errors).length;
}
function payload(confirmationCode) {
  const type = value('documentType');
  const [day, month, year] = value('birthDate').split('/');
  return {
    action: 'register', fullName: value('fullName').replace(/\s+/g, ' '), documentType: type,
    documentNumber: documentLabel(type) + ': ' + value('documentNumber').toUpperCase(), birthDate: year + '-' + month + '-' + day,
    phone: phone(value('phone')), email: value('email').toLowerCase(), addressLine: value('addressLine').replace(/\s+/g, ' '),
    privacyConsent: 'true', confirmationCode, source: context.sourceType, campus: context.campus, campaign: context.campaign,
    sourceQr: context.sourceQr, pieceType: context.pieceType, pieceId: context.pieceId, origin: window.location.href, website: value('website')
  };
}
async function submitRegistration(event) {
  event.preventDefault();
  if (!validate()) return;
  const button = $('#submit-registration'); const label = button.querySelector('span'); const original = label.textContent; const confirmationCode = code();
  button.disabled = true; label.textContent = 'ENVIANDO...'; clearErrors();
  try {
    const response = await fetch(APPS_SCRIPT_URL, { method: 'POST', mode: 'cors', body: new URLSearchParams(payload(confirmationCode)) });
    if (!response.ok) throw new Error('El servicio de registro no respondió correctamente.');
    const result = await response.json();
    if (!result || result.ok !== true) throw new Error(result && result.error ? result.error : 'No pudimos confirmar el registro.');
    if (result.duplicate) { showErrors({ form: 'Ya existe una solicitud con esos datos. Si necesitas ayuda, comunícate con Speedpack.' }); return; }
    if (result.confirmationCode !== confirmationCode) throw new Error('No pudimos confirmar el número de solicitud.');
    form.hidden = true; $('#confirmation').hidden = false; $('#confirmation-name').textContent = value('fullName').split(/\s+/)[0].toUpperCase(); $('#confirmation-code').textContent = confirmationCode; $('#confirmation').scrollIntoView({ behavior: 'smooth', block: 'center' }); $('#mobile-cta').hidden = true;
  } catch (error) { showErrors({ form: error.message || 'No pudimos enviar el registro. Revisa tu conexión e inténtalo otra vez.' }); }
  finally { button.disabled = false; label.textContent = original; }
}
function applyCampaign() {
  const university = context.campus ? runtimeUniversities[context.campus] : null;
  $('#campaign-source-badge').textContent = university ? 'UNIVERSIDAD' : 'VÍA PÚBLICA';
  $('#campaign-campus-name').textContent = university ? 'SPEEDPACK CAMPUS ' + university.name : 'REGISTRO GENERAL';
  $('#campaign-piece-code').textContent = (context.pieceType.replaceAll('_', ' ') + ' · ' + context.pieceId).toUpperCase();
}
async function init() {
  $('#current-year').textContent = new Date().getFullYear(); applyCampaign();
  form.addEventListener('submit', submitRegistration);
  $('#privacy-consent').addEventListener('change', () => { $('#consent-panel').classList.toggle('is-authorized', value('privacyConsent')); $('#privacyConsent-status').hidden = !value('privacyConsent'); });
  $('#consent-panel').addEventListener('click', (event) => { if (!event.target.closest('input, label, a')) $('#privacy-consent').click(); });
  $('#address-line').addEventListener('input', (event) => { $('#address-count').textContent = event.target.value.length + '/300'; });
}
init();
