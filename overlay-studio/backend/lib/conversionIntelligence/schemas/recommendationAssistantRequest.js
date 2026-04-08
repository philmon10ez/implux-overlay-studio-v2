/**
 * Request validation for POST /api/conversion-intelligence/recommendation-assistant
 * Whitelist-only context; predictable errors for clients.
 */

const PLACEMENTS = new Set(['product_page', 'cart', 'checkout']);
const INTENTS = new Set([
  'products',
  'placement',
  'copy',
  'cta',
  'text',
  'frequency',
  'rules',
  'optimize',
  'custom',
  'general',
]);

const MAX = {
  intent: 64,
  userMessage: 8000,
  name: 500,
  headline: 500,
  subcopy: 2000,
  ctaLabel: 200,
  triggerJson: 128000,
  presetKey: 128,
  designTheme: 64,
  products: 200,
  title: 500,
};

function safeTrim(s, max) {
  if (s == null) return '';
  const t = String(s).trim();
  if (max && t.length > max) return t.slice(0, max);
  return t;
}

function asPositiveInt(v) {
  if (v == null || v === '') return null;
  const n = parseInt(String(v), 10);
  if (Number.isNaN(n) || n < 1) return null;
  return n;
}

/**
 * @param {unknown} body
 * @returns {{ ok: true, data: object } | { ok: false, error: string, field?: string }}
 */
export function validateRecommendationAssistantRequest(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'Body must be a JSON object', field: 'body' };
  }

  const intent = safeTrim(body.intent, MAX.intent).toLowerCase();
  if (intent && !INTENTS.has(intent) && intent.length > 0) {
    return { ok: false, error: 'Unknown intent', field: 'intent' };
  }

  const userMessage = safeTrim(body.userMessage, MAX.userMessage);

  const merchantId = asPositiveInt(body.merchantId);

  const rawCtx = body.context;
  if (rawCtx != null && (typeof rawCtx !== 'object' || Array.isArray(rawCtx))) {
    return { ok: false, error: 'context must be an object', field: 'context' };
  }

  const ctxIn = rawCtx && typeof rawCtx === 'object' && !Array.isArray(rawCtx) ? rawCtx : {};

  const placementRaw = safeTrim(ctxIn.placementType ?? ctxIn.pageType, 32).toLowerCase().replace(/-/g, '_');
  const placementType =
    placementRaw === 'product' || placementRaw === 'pdp'
      ? 'product_page'
      : PLACEMENTS.has(placementRaw)
        ? placementRaw
        : placementRaw
          ? null
          : 'product_page';

  if (placementRaw && !PLACEMENTS.has(placementType)) {
    return { ok: false, error: 'Invalid placementType or pageType', field: 'context.placementType' };
  }

  const name = safeTrim(ctxIn.name, MAX.name);

  const presIn = ctxIn.presentation;
  let presentation = { headline: '', subcopy: '', ctaLabel: '' };
  if (presIn != null && typeof presIn === 'object' && !Array.isArray(presIn)) {
    presentation = {
      headline: safeTrim(presIn.headline, MAX.headline),
      subcopy: safeTrim(presIn.subcopy, MAX.subcopy),
      ctaLabel: safeTrim(presIn.ctaLabel, MAX.ctaLabel),
    };
  }

  const fcIn = ctxIn.frequencyCap;
  let frequencyCap = {};
  if (fcIn != null && typeof fcIn === 'object' && !Array.isArray(fcIn)) {
    frequencyCap = { ...fcIn };
  }

  const triggerJson = safeTrim(ctxIn.triggerJson, MAX.triggerJson);

  const presetKey = ctxIn.presetKey != null ? safeTrim(ctxIn.presetKey, MAX.presetKey) : '';
  const designTheme = ctxIn.designTheme != null ? safeTrim(ctxIn.designTheme, MAX.designTheme) : '';

  let selectedProducts = [];
  if (Array.isArray(ctxIn.selectedProducts)) {
    for (const p of ctxIn.selectedProducts) {
      if (selectedProducts.length >= MAX.products) break;
      if (!p || typeof p !== 'object') continue;
      const id = asPositiveInt(p.id);
      if (!id) continue;
      selectedProducts.push({
        id,
        title: safeTrim(p.title, MAX.title),
      });
    }
  }

  let productCount =
    typeof ctxIn.productCount === 'number' && Number.isFinite(ctxIn.productCount)
      ? Math.max(0, Math.floor(ctxIn.productCount))
      : selectedProducts.length;

  if (ctxIn.productCount != null && typeof ctxIn.productCount !== 'number') {
    productCount = selectedProducts.length;
  }

  const context = {
    placementType: placementType || 'product_page',
    name,
    presentation,
    frequencyCap,
    triggerJson,
    selectedProducts,
    productCount,
    presetKey: presetKey || undefined,
    designTheme: designTheme || undefined,
  };

  return {
    ok: true,
    data: {
      intent: intent || 'optimize',
      userMessage,
      merchantId,
      context,
    },
  };
}
