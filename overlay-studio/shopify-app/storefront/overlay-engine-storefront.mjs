/**
 * Poptek theme extension — shop identity + campaign fetch (storefront).
 * Source of truth: synced into overlay-engine.js for the browser bundle.
 */

/** @typedef {{ ok: true, shop: string }} PoptekShopOk */
/** @typedef {{ ok: false, reason: string }} PoptekShopFail */
/** @typedef {PoptekShopOk | PoptekShopFail} PoptekShopResult */

/** @typedef {{ ok: true, campaigns: object[] }} PoptekCampaignsOk */
/** @typedef {{ ok: false, reason: string, status?: number }} PoptekCampaignsFail */

const MYSHOPIFY_DOMAIN_RE = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i;

/**
 * Normalize shop domain from Liquid or Shopify global (not from URL query params).
 * @param {unknown} raw
 * @returns {string}
 */
export function normalizePoptekShopDomain(raw) {
  return String(raw || '')
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
    .split('/')[0]
    .split('?')[0]
    .split('#')[0];
}

/**
 * @param {string} domain
 * @returns {boolean}
 */
export function isValidPoptekShopDomain(domain) {
  if (!domain || typeof domain !== 'string') return false;
  if (domain.length > 255) return false;
  return MYSHOPIFY_DOMAIN_RE.test(domain);
}

/**
 * @param {unknown} config
 * @returns {string | null}
 */
export function readPoptekConfigShop(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return null;
  const shop = /** @type {{ shop?: unknown }} */ (config).shop;
  if (shop == null || shop === '') return null;
  if (typeof shop !== 'string') return null;
  return shop;
}

/**
 * Resolve verified shop: Liquid __POPTEK__.shop first, then Shopify.shop.
 * @param {object} opts
 * @param {() => unknown} [opts.getPoptekConfig]
 * @param {() => unknown} [opts.getShopifyShop]
 */
export function poptekResolveShopDomain(opts = {}) {
  const getPoptekConfig = opts.getPoptekConfig || (() => null);
  const getShopifyShop = opts.getShopifyShop || (() => null);

  const fromLiquid = readPoptekConfigShop(getPoptekConfig());
  const fromShopify = getShopifyShop();
  const candidate = fromLiquid || fromShopify;
  const normalized = normalizePoptekShopDomain(candidate);

  if (!normalized) {
    return /** @type {PoptekShopFail} */ ({ ok: false, reason: 'missing_shop' });
  }
  if (!isValidPoptekShopDomain(normalized)) {
    return /** @type {PoptekShopFail} */ ({ ok: false, reason: 'invalid_shop_domain' });
  }
  return /** @type {PoptekShopOk} */ ({ ok: true, shop: normalized });
}

/**
 * Shopify Theme Editor design mode — only trusted signal for editor-only preview behavior.
 * Does not use __POPTEK__ or URL query params.
 * @param {object} [opts]
 * @param {() => boolean | undefined} [opts.getShopifyDesignMode]
 */
export function poptekIsShopifyThemeEditorDesignMode(opts = {}) {
  const getShopifyDesignMode = opts.getShopifyDesignMode || (() => false);
  try {
    return getShopifyDesignMode() === true;
  } catch (_e) {
    return false;
  }
}

/**
 * Console diagnostics in Theme Editor (design mode) only — not for live shoppers.
 * @param {object} opts
 * @param {() => boolean | undefined} [opts.getDesignMode]
 */
export function poptekIsDiagnosticContext(opts = {}) {
  return poptekIsShopifyThemeEditorDesignMode({
    getShopifyDesignMode: opts.getDesignMode,
  });
}

/** Editor preview priority (first match wins — one preview overlay). */
export const POPTEK_EDITOR_PREVIEW_TYPE_PRIORITY = [
  'welcome_mat',
  'promo_banner',
  'sticky_footer',
  'spin_wheel',
  'time_delay',
  'exit_intent',
  'scroll_depth',
];

/**
 * Minimal campaign type normalization (aligned with overlay-engine.js).
 * @param {unknown} t
 */
export function normalizePoptekCampaignType(t) {
  if (t == null || t === '') return '';
  let s = String(t)
    .toLowerCase()
    .trim()
    .replace(/-/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_');
  if (
    s === 'promo_code_banner' ||
    s === 'promocode_banner' ||
    s === 'promocodebanner' ||
    s === 'promobanner'
  ) {
    return 'promo_banner';
  }
  if (
    s === 'sticky_footer_bar' ||
    s === 'stickyfooter' ||
    s === 'sticky_bar' ||
    s === 'footer_bar' ||
    s === 'bottom_bar'
  ) {
    return 'sticky_footer';
  }
  if (
    s === 'spin_to_win' ||
    s === 'spin_to_win_wheel' ||
    s === 'spinwheel' ||
    s === 'prize_wheel' ||
    s === 'spin_the_wheel'
  ) {
    return 'spin_wheel';
  }
  return s;
}

/**
 * Cart-dependent campaigns cannot be instant-previewed without real cart data.
 * @param {string} typeKey
 * @param {object} [triggerConfig]
 */
export function poptekCampaignRequiresCartForPreview(typeKey, triggerConfig) {
  if (typeKey === 'upsell_modal') return true;
  const tc = triggerConfig || {};
  const minCart =
    tc.cartValueMin != null
      ? Number(tc.cartValueMin)
      : tc.minCartValue != null
        ? Number(tc.minCartValue)
        : 0;
  const useCart = tc.cartValueFilter || minCart > 0;
  return !!(useCart && minCart > 0);
}

/**
 * @param {string} typeKey
 * @param {boolean} themeEditor
 * @param {object} [triggerConfig]
 */
export function poptekShouldInstantTriggerInEditor(typeKey, themeEditor, triggerConfig) {
  if (!themeEditor) return false;
  if (typeKey === 'upsell_modal') return false;
  if (poptekCampaignRequiresCartForPreview(typeKey, triggerConfig)) return false;
  return true;
}

/**
 * Which show path to use for editor instant preview (after cart rules pass).
 * @param {unknown} rawType
 * @returns {'persistent_bar' | 'spin_wheel' | 'modal' | null}
 */
export function poptekEditorPreviewShowTarget(rawType) {
  const typeKey = normalizePoptekCampaignType(rawType);
  if (!typeKey || typeKey === 'upsell_modal') return null;
  if (typeKey === 'promo_banner' || typeKey === 'sticky_footer') return 'persistent_bar';
  if (typeKey === 'spin_wheel') return 'spin_wheel';
  return 'modal';
}

/**
 * Theme Editor fetches omit client freq_state so capped campaigns can still preview without persisting caps.
 * @param {boolean} themeEditor
 * @param {string | null | undefined} freqStateEncoded
 */
export function poptekBuildCampaignFetchFreqQs(themeEditor, freqStateEncoded) {
  if (themeEditor) return '';
  const fs = freqStateEncoded ? String(freqStateEncoded) : '';
  return fs ? '&freq_state=' + fs : '';
}

/**
 * Pick at most one campaign to preview in the Theme Editor.
 * @param {object[]} campaigns
 * @param {object} deps
 * @param {(raw: unknown) => string} deps.normalizeType
 * @param {(triggerConfig: object) => boolean} deps.matchesPage
 * @param {(triggerConfig: object) => boolean} deps.matchesDevice
 */
export function poptekSelectEditorPreviewCampaign(campaigns, deps) {
  const normalizeType = deps.normalizeType || normalizePoptekCampaignType;
  const matchesPage = deps.matchesPage;
  const matchesDevice = deps.matchesDevice;
  if (!Array.isArray(campaigns) || !matchesPage || !matchesDevice) return null;

  /** @type {{ campaign: object, typeKey: string, rank: number }[]} */
  const eligible = [];

  for (let i = 0; i < campaigns.length; i++) {
    const c = campaigns[i];
    const typeKey = normalizeType(c && c.type);
    if (!typeKey || typeKey === 'upsell_modal') continue;
    if (poptekCampaignRequiresCartForPreview(typeKey, c.triggerConfig)) continue;
    const tc = (c && c.triggerConfig) || {};
    if (!matchesPage(tc)) continue;
    if (!matchesDevice(tc)) continue;
    let rank = POPTEK_EDITOR_PREVIEW_TYPE_PRIORITY.indexOf(typeKey);
    if (rank < 0) rank = POPTEK_EDITOR_PREVIEW_TYPE_PRIORITY.length + 1;
    eligible.push({ campaign: c, typeKey, rank });
  }

  if (!eligible.length) return null;

  eligible.sort(function (a, b) {
    if (a.rank !== b.rank) return a.rank - b.rank;
    const ta = a.campaign.updatedAt ? Date.parse(String(a.campaign.updatedAt)) : 0;
    const tb = b.campaign.updatedAt ? Date.parse(String(b.campaign.updatedAt)) : 0;
    if (tb !== ta) return tb - ta;
    return (Number(b.campaign.id) || 0) - (Number(a.campaign.id) || 0);
  });

  return eligible[0].campaign;
}

/**
 * @param {boolean} diagnostic
 * @param {string} message
 * @param {Record<string, unknown>} [detail]
 */
export function poptekLogDiagnostic(diagnostic, message, detail) {
  if (!diagnostic) return;
  try {
    const safe = detail ? { ...detail } : {};
    delete safe.accessToken;
    delete safe.token;
    delete safe.password;
    delete safe.secret;
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[Poptek overlay-engine]', message, safe);
    }
  } catch (_e) {}
}

/**
 * @param {unknown} json
 * @returns {PoptekCampaignsOk | PoptekCampaignsFail}
 */
export function parsePoptekCampaignsProxyPayload(json) {
  if (json == null || typeof json !== 'object' || Array.isArray(json)) {
    return { ok: false, reason: 'invalid_json_shape' };
  }
  const campaigns = /** @type {{ campaigns?: unknown }} */ (json).campaigns;
  if (campaigns === undefined) {
    return { ok: false, reason: 'missing_campaigns_key' };
  }
  if (!Array.isArray(campaigns)) {
    return { ok: false, reason: 'campaigns_not_array' };
  }
  return { ok: true, campaigns };
}

/**
 * Same-origin app proxy when the theme published /apps/poptek. Otherwise the absolute API.
 * Relative paths let Shopify sign the request. The secret never enters this file.
 * @param {{ proxyUrl?: string, appProxyPath?: unknown }} opts
 */
export function poptekResolveCampaignProxyBase(opts) {
  const path = String(opts.appProxyPath || '').trim();
  if (path.startsWith('/apps/') && !path.includes('://') && !path.includes('..') && !path.includes('\\')) {
    return path.replace(/\/$/, '');
  }
  return String(opts.proxyUrl || '').replace(/\/$/, '');
}

/**
 * Beacon and fetch target for state-changing analytics. POST only.
 * @param {string} proxyBase
 * @param {{ event: string, campaignId: number | string, shop: string }} track
 */
export function poptekTrackUrl(proxyBase, track) {
  const base = String(proxyBase || '').replace(/\/$/, '');
  const params = new URLSearchParams();
  params.set('event', String(track.event || ''));
  params.set('campaign_id', String(track.campaignId || ''));
  params.set('shop', String(track.shop || ''));
  return `${base}/track?${params.toString()}`;
}

/**
 * GET /proxy/campaigns with response validation (no silent failures in diagnostic mode).
 * @param {object} opts
 * @param {string} opts.proxyUrl
 * @param {string} opts.shop
 * @param {string} [opts.freqQs]
 * @param {typeof fetch} [opts.fetchImpl]
 */
export async function poptekFetchCampaigns(opts) {
  const { proxyUrl, shop, freqQs = '', fetchImpl = fetch } = opts;
  const base = String(proxyUrl || '').replace(/\/$/, '');
  const url =
    base + '/campaigns?shop=' + encodeURIComponent(shop) + (freqQs || '');

  let res;
  try {
    res = await fetchImpl(url);
  } catch (_err) {
    return /** @type {PoptekCampaignsFail} */ ({ ok: false, reason: 'network_error' });
  }

  if (!res.ok) {
    return /** @type {PoptekCampaignsFail} */ ({
      ok: false,
      reason: 'http_error',
      status: res.status,
    });
  }

  let json;
  try {
    json = await res.json();
  } catch (_err) {
    return /** @type {PoptekCampaignsFail} */ ({ ok: false, reason: 'json_parse_error' });
  }

  const parsed = parsePoptekCampaignsProxyPayload(json);
  if (!parsed.ok) {
    return /** @type {PoptekCampaignsFail} */ ({ ok: false, reason: parsed.reason });
  }
  return parsed;
}
