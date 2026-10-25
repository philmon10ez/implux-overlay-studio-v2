/**
 * Poptek embedded app onboarding — theme editor deep links and embed verification.
 * Server-only (never import from client components).
 */

/** Liquid block file: extensions/overlay-engine/blocks/app-embed.liquid */
export const APP_EMBED_BLOCK_HANDLE = 'app-embed';

/** Schema display name in theme editor (not used for activateAppId). */
export const APP_EMBED_DISPLAY_NAME = 'Implux';

/**
 * Build activateAppId for theme editor deep linking.
 * Current Shopify docs: {api_key}/{block_handle} (uuid/gid alone is legacy).
 * @see https://shopify.dev/docs/apps/build/online-store/theme-app-extensions/configuration
 *
 * @param {object} opts
 * @param {string} [opts.apiKey] SHOPIFY_API_KEY / client_id
 * @param {string} [opts.themeExtensionIdEnv] THEME_EXTENSION_ID (optional legacy / gid)
 */
export function buildActivateAppId({ apiKey, themeExtensionIdEnv }) {
  const key = String(apiKey || '').trim();
  if (key) {
    return `${key}/${APP_EMBED_BLOCK_HANDLE}`;
  }
  const ext = String(themeExtensionIdEnv || '').trim();
  if (ext) {
    return ext;
  }
  return null;
}

/**
 * Theme editor URL to activate the Poptek app embed (merchant must still click Save).
 * @param {string} shopDomain e.g. demo.myshopify.com
 * @param {string | null} activateAppId
 */
export function buildThemeEditorEmbedUrl(shopDomain, activateAppId) {
  const shop = String(shopDomain || '')
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');
  if (!shop || !activateAppId) {
    return null;
  }
  const params = new URLSearchParams({
    context: 'apps',
    activateAppId,
  });
  return `https://${shop}/admin/themes/current/editor?${params.toString()}`;
}

/**
 * Strip JSON comments and trailing commas for settings_data.json (Shopify allows both).
 * @param {string} raw
 */
export function parseThemeSettingsJson(raw) {
  const text = String(raw || '').trim();
  if (!text) return null;
  const withoutBlockComments = text.replace(/\/\*[\s\S]*?\*\//g, '');
  const withoutLineComments = withoutBlockComments.replace(/^\s*\/\/.*$/gm, '');
  const noTrailingCommas = withoutLineComments.replace(/,(\s*[}\]])/g, '$1');
  try {
    return JSON.parse(noTrailingCommas);
  } catch {
    return null;
  }
}

/**
 * @typedef {'enabled' | 'disabled' | 'not_configured' | 'unavailable'} AppEmbedStatus
 */

/**
 * Detect Poptek app embed in published theme settings_data.json.
 * @param {string} settingsJsonText
 * @returns {{ status: AppEmbedStatus, reason?: string }}
 */
export function detectAppEmbedFromSettingsData(settingsJsonText) {
  const parsed = parseThemeSettingsJson(settingsJsonText);
  if (!parsed) {
    return { status: 'unavailable', reason: 'parse_failed' };
  }

  const blocks = parsed?.current?.blocks;
  if (!blocks || typeof blocks !== 'object') {
    return { status: 'not_configured', reason: 'no_blocks' };
  }

  const embedSuffix = `/blocks/${APP_EMBED_BLOCK_HANDLE}/`;
  let matched = null;
  for (const block of Object.values(blocks)) {
    if (!block || typeof block !== 'object') continue;
    const type = String(block.type || '');
    if (type.includes(embedSuffix)) {
      matched = block;
      break;
    }
  }

  if (!matched) {
    return { status: 'not_configured', reason: 'embed_not_in_theme' };
  }

  if (matched.disabled === true) {
    return { status: 'disabled', reason: 'embed_disabled' };
  }

  return { status: 'enabled', reason: 'embed_active' };
}

const SETTINGS_DATA_QUERY = `#graphql
  query PoptekMainThemeSettingsData {
    themes(first: 1, roles: [MAIN]) {
      nodes {
        id
        name
        files(filenames: ["config/settings_data.json"]) {
          nodes {
            filename
            body {
              ... on OnlineStoreThemeFileBodyText {
                content
              }
            }
          }
        }
      }
    }
  }`;

/** @param {{ graphql: (query: string) => Promise<Response> }} admin */
export async function fetchAppEmbedStatus(admin) {
  try {
    const res = await admin.graphql(SETTINGS_DATA_QUERY);
    const json = await res.json();
    if (json.errors?.length) {
      console.warn('[Implux] theme embed status:', json.errors.map((e) => e.message).join('; '));
      return { status: 'unavailable', reason: 'graphql_errors' };
    }
    const theme = json?.data?.themes?.nodes?.[0];
    const fileNode = theme?.files?.nodes?.[0];
    const content = fileNode?.body?.content;
    if (typeof content !== 'string') {
      return { status: 'unavailable', reason: 'no_settings_data' };
    }
    return detectAppEmbedFromSettingsData(content);
  } catch (e) {
    console.warn('[Implux] theme embed status request failed:', e?.message || e);
    return { status: 'unavailable', reason: 'request_failed' };
  }
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} shopDomain
 */
export async function fetchMerchantSyncStatus(prisma, shopDomain) {
  const normalized = String(shopDomain || '')
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');
  if (!normalized) {
    return { synced: false, reason: 'no_shop' };
  }
  try {
    const rows = await prisma.$queryRaw`
      SELECT id, status FROM "Merchant"
      WHERE "shopifyDomain" = ${normalized}
         OR "shopifyDomain" = ${`https://${normalized}`}
      LIMIT 1
    `;
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row) {
      return { synced: false, reason: 'not_in_backend' };
    }
    const status = String(row.status || '').toLowerCase();
    if (status === 'active') {
      return { synced: true, merchantId: Number(row.id) };
    }
    return { synced: false, reason: 'merchant_inactive', merchantId: Number(row.id) };
  } catch (e) {
    console.warn('[Implux] merchant sync status query failed:', e?.message || e);
    return { synced: false, reason: 'query_failed' };
  }
}
