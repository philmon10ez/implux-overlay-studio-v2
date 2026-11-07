import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  normalizePoptekShopDomain,
  isValidPoptekShopDomain,
  poptekResolveShopDomain,
  parsePoptekCampaignsProxyPayload,
  poptekFetchCampaigns,
  readPoptekConfigShop,
  poptekIsShopifyThemeEditorDesignMode,
  poptekIsDiagnosticContext,
  poptekShouldInstantTriggerInEditor,
  poptekCampaignRequiresCartForPreview,
  poptekSelectEditorPreviewCampaign,
  poptekEditorPreviewShowTarget,
  poptekBuildCampaignFetchFreqQs,
  normalizePoptekCampaignType,
} from './overlay-engine-storefront.mjs';

test('normalizePoptekShopDomain strips protocol and path', () => {
  assert.equal(normalizePoptekShopDomain('HTTPS://Demo.Myshopify.com/'), 'demo.myshopify.com');
});

test('isValidPoptekShopDomain accepts myshopify.com hostnames', () => {
  assert.equal(isValidPoptekShopDomain('demo.myshopify.com'), true);
  assert.equal(isValidPoptekShopDomain('not-a-shop.com'), false);
  assert.equal(isValidPoptekShopDomain(''), false);
});

test('readPoptekConfigShop reads Liquid-provided shop string', () => {
  assert.equal(readPoptekConfigShop({ shop: 'a.myshopify.com' }), 'a.myshopify.com');
  assert.equal(readPoptekConfigShop({ shop: 123 }), null);
});

test('poptekResolveShopDomain prefers Liquid __POPTEK__ over Shopify.shop', () => {
  const r = poptekResolveShopDomain({
    getPoptekConfig: () => ({ shop: 'liquid.myshopify.com' }),
    getShopifyShop: () => 'global.myshopify.com',
  });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.shop, 'liquid.myshopify.com');
});

test('poptekResolveShopDomain falls back to Shopify.shop', () => {
  const r = poptekResolveShopDomain({
    getPoptekConfig: () => ({}),
    getShopifyShop: () => 'fallback.myshopify.com',
  });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.shop, 'fallback.myshopify.com');
});

test('poptekResolveShopDomain fails when shop identity missing', () => {
  const r = poptekResolveShopDomain({
    getPoptekConfig: () => null,
    getShopifyShop: () => null,
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.reason, 'missing_shop');
});

test('poptekResolveShopDomain rejects invalid domain', () => {
  const r = poptekResolveShopDomain({
    getPoptekConfig: () => ({ shop: 'evil.example.com' }),
    getShopifyShop: () => null,
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.reason, 'invalid_shop_domain');
});

test('parsePoptekCampaignsProxyPayload accepts empty campaigns array', () => {
  const r = parsePoptekCampaignsProxyPayload({ campaigns: [] });
  assert.equal(r.ok, true);
  if (r.ok) assert.deepEqual(r.campaigns, []);
});

test('parsePoptekCampaignsProxyPayload rejects invalid shapes', () => {
  assert.equal(parsePoptekCampaignsProxyPayload(null).ok, false);
  assert.equal(parsePoptekCampaignsProxyPayload({}).reason, 'missing_campaigns_key');
  assert.equal(parsePoptekCampaignsProxyPayload({ campaigns: 'x' }).reason, 'campaigns_not_array');
});

test('poptekFetchCampaigns handles HTTP error', async () => {
  const r = await poptekFetchCampaigns({
    proxyUrl: 'https://api.example.com/proxy',
    shop: 'demo.myshopify.com',
    fetchImpl: async () => ({ ok: false, status: 503, json: async () => ({}) }),
  });
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.equal(r.reason, 'http_error');
    assert.equal(r.status, 503);
  }
});

test('poptekFetchCampaigns handles invalid JSON body', async () => {
  const r = await poptekFetchCampaigns({
    proxyUrl: 'https://api.example.com/proxy',
    shop: 'demo.myshopify.com',
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error('Unexpected token');
      },
    }),
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.reason, 'json_parse_error');
});

test('poptekFetchCampaigns handles successful campaign response', async () => {
  const r = await poptekFetchCampaigns({
    proxyUrl: 'https://api.example.com/proxy',
    shop: 'demo.myshopify.com',
    freqQs: '&freq_state=abc',
    fetchImpl: async (url) => {
      assert.match(url, /shop=demo\.myshopify\.com/);
      assert.match(url, /freq_state=abc/);
      return {
        ok: true,
        status: 200,
        json: async () => ({ campaigns: [{ id: 1, type: 'welcome_mat' }] }),
      };
    },
  });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.campaigns.length, 1);
});

test('overlay-engine.js bundle includes synced storefront helpers', () => {
  const dir = dirname(fileURLToPath(import.meta.url));
  const bundle = readFileSync(join(dir, 'overlay-engine.js'), 'utf8');
  assert.match(bundle, /function poptekResolveShopDomain/);
  assert.match(bundle, /function poptekFetchCampaigns/);
  assert.match(bundle, /function poptekSelectEditorPreviewCampaign/);
  assert.match(bundle, /window\.__poptekOverlayEngineStarted/);
  assert.match(bundle, /editorInstant/);
  assert.match(bundle, /window\.__POPTEK__|poptekGetPoptekConfig/);
  assert.doesNotMatch(bundle, /if \(typeof Shopify === 'undefined' \|\| !Shopify\.shop\) return;/);
});

test('poptekIsShopifyThemeEditorDesignMode requires Shopify.designMode === true', () => {
  assert.equal(poptekIsShopifyThemeEditorDesignMode({ getShopifyDesignMode: () => true }), true);
  assert.equal(poptekIsShopifyThemeEditorDesignMode({ getShopifyDesignMode: () => false }), false);
  assert.equal(poptekIsShopifyThemeEditorDesignMode({ getShopifyDesignMode: () => undefined }), false);
  assert.equal(poptekIsShopifyThemeEditorDesignMode({ getShopifyDesignMode: () => 'true' }), false);
});

test('poptekIsDiagnosticContext ignores __POPTEK__ diagnostic flag', () => {
  assert.equal(
    poptekIsDiagnosticContext({
      getDesignMode: () => false,
    }),
    false
  );
  assert.equal(
    poptekIsDiagnosticContext({
      getDesignMode: () => true,
    }),
    true
  );
});

test('poptekShouldInstantTriggerInEditor is false on live storefront', () => {
  assert.equal(poptekShouldInstantTriggerInEditor('welcome_mat', false, {}), false);
});

test('poptekShouldInstantTriggerInEditor allows welcome mat and exit intent in editor', () => {
  assert.equal(poptekShouldInstantTriggerInEditor('welcome_mat', true, {}), true);
  assert.equal(poptekShouldInstantTriggerInEditor('exit_intent', true, {}), true);
  assert.equal(poptekShouldInstantTriggerInEditor('scroll_depth', true, {}), true);
  assert.equal(poptekShouldInstantTriggerInEditor('promo_banner', true, {}), true);
});

test('poptekShouldInstantTriggerInEditor blocks upsell and cart-minimum campaigns', () => {
  assert.equal(poptekShouldInstantTriggerInEditor('upsell_modal', true, {}), false);
  assert.equal(
    poptekCampaignRequiresCartForPreview('time_delay', { cartValueMin: 50 }),
    true
  );
  assert.equal(poptekShouldInstantTriggerInEditor('time_delay', true, { cartValueMin: 50 }), false);
});

test('poptekSelectEditorPreviewCampaign prefers welcome mat and respects page targeting', () => {
  const campaigns = [
    { id: 1, type: 'exit_intent', triggerConfig: { pages: ['home'] } },
    { id: 2, type: 'welcome_mat', triggerConfig: { pages: ['home'] } },
    { id: 3, type: 'promo_banner', triggerConfig: { pages: ['cart'] } },
  ];
  const pick = poptekSelectEditorPreviewCampaign(campaigns, {
    normalizeType: normalizePoptekCampaignType,
    matchesPage: (tc) => (tc.pages || []).includes('home'),
    matchesDevice: () => true,
  });
  assert.equal(pick.id, 2);
});

test('poptekSelectEditorPreviewCampaign returns null when page/device filter excludes all', () => {
  const campaigns = [{ id: 1, type: 'welcome_mat', triggerConfig: { pages: ['cart'] } }];
  const pick = poptekSelectEditorPreviewCampaign(campaigns, {
    normalizeType: normalizePoptekCampaignType,
    matchesPage: () => false,
    matchesDevice: () => true,
  });
  assert.equal(pick, null);
});

test('poptekEditorPreviewShowTarget maps types to show paths', () => {
  assert.equal(poptekEditorPreviewShowTarget('sticky_footer'), 'persistent_bar');
  assert.equal(poptekEditorPreviewShowTarget('spin_wheel'), 'spin_wheel');
  assert.equal(poptekEditorPreviewShowTarget('welcome_mat'), 'modal');
  assert.equal(poptekEditorPreviewShowTarget('upsell_modal'), null);
});

test('poptekBuildCampaignFetchFreqQs omits freq_state in Theme Editor only', () => {
  assert.equal(poptekBuildCampaignFetchFreqQs(true, 'abc123'), '');
  assert.equal(poptekBuildCampaignFetchFreqQs(false, 'abc123'), '&freq_state=abc123');
  assert.equal(poptekBuildCampaignFetchFreqQs(false, ''), '');
});
