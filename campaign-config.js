export const UNIVERSITY_CONFIG = Object.freeze({
  pucmm: Object.freeze({
    slug: 'pucmm',
    name: 'PUCMM',
    campaignCode: 'campus_pucmm',
    channelUrl: '',
    pickupPoint: 'Campus PUCMM · punto por confirmar',
    minConfirmedClients: 0,
    minPackages: 0,
    hub: true,
    active: true,
  }),
  intec: Object.freeze({
    slug: 'intec',
    name: 'INTEC',
    campaignCode: 'campus_intec',
    channelUrl: '',
    pickupPoint: 'Campus INTEC · punto por confirmar',
    minConfirmedClients: 5,
    minPackages: 6,
    hub: false,
    active: true,
  }),
  unibe: Object.freeze({
    slug: 'unibe',
    name: 'UNIBE',
    campaignCode: 'campus_unibe',
    channelUrl: '',
    pickupPoint: 'Campus UNIBE · punto por confirmar',
    minConfirmedClients: 5,
    minPackages: 6,
    hub: false,
    active: true,
  }),
  unicaribe: Object.freeze({
    slug: 'unicaribe',
    name: 'UNICARIBE',
    campaignCode: 'campus_unicaribe',
    channelUrl: '',
    pickupPoint: 'Campus UNICARIBE · punto por confirmar',
    minConfirmedClients: 5,
    minPackages: 6,
    hub: false,
    active: true,
  }),
  unfu: Object.freeze({
    slug: 'unfu',
    name: 'UNFU',
    campaignCode: 'campus_unfu',
    channelUrl: '',
    pickupPoint: 'Campus UNFU · punto por confirmar',
    minConfirmedClients: 5,
    minPackages: 6,
    hub: false,
    active: true,
  }),
});

const ALLOWED_PIECES = new Set(['sticker_12x12', 'afiche_carta', 'afiche_a2', 'digital', 'general']);

function safeToken(value, fallback, maximum = 80) {
  const token = String(value || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, maximum);
  return token || fallback;
}

export function isValidWhatsAppChannel(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname === 'chat.whatsapp.com';
  } catch {
    return false;
  }
}

export function campaignContext(search = window.location.search) {
  const query = new URLSearchParams(search);
  const sourceParam = safeToken(query.get('source'), 'street', 24);
  const wantsUniversity = sourceParam === 'university' || sourceParam === 'universidad' || sourceParam === 'campus';
  const campusSlug = safeToken(query.get('campus'), '', 32);
  const university = wantsUniversity ? UNIVERSITY_CONFIG[campusSlug] : null;
  const validUniversity = Boolean(university && university.active);
  const sourceType = validUniversity ? 'universidad' : 'via_publica';
  const pieceCandidate = safeToken(query.get('piece') || query.get('tipo_pieza'), 'general', 32);
  const pieceType = ALLOWED_PIECES.has(pieceCandidate) ? pieceCandidate : 'general';
  const defaultCampaign = validUniversity ? university.campaignCode : 'via_publica_general';
  const campaign = safeToken(query.get('campaign'), defaultCampaign);
  const pieceId = safeToken(query.get('id') || query.get('id_pieza'), `${campaign}_${pieceType}`, 80);
  const sourceQr = safeToken(query.get('src') || query.get('source_qr'), pieceId, 80);

  return Object.freeze({
    sourceType,
    sourceParam,
    university: validUniversity ? university : null,
    campus: validUniversity ? university.slug : '',
    campaign,
    pieceType,
    pieceId,
    sourceQr,
    invalidCampus: wantsUniversity && !validUniversity,
  });
}
