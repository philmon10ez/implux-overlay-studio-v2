import test from 'node:test';
import assert from 'node:assert/strict';
import {
  APP_EMBED_BLOCK_HANDLE,
  buildActivateAppId,
  buildThemeEditorEmbedUrl,
  detectAppEmbedFromSettingsData,
  parseThemeSettingsJson,
} from './onboarding.server.js';

test('APP_EMBED_BLOCK_HANDLE matches blocks/app-embed.liquid filename', () => {
  assert.equal(APP_EMBED_BLOCK_HANDLE, 'app-embed');
});

test('buildActivateAppId prefers api_key/block_handle per Shopify docs', () => {
  assert.equal(
    buildActivateAppId({ apiKey: '786f52ea5cd6c4e9c95a835dfecd2ecb', themeExtensionIdEnv: 'gid://old' }),
    '786f52ea5cd6c4e9c95a835dfecd2ecb/app-embed'
  );
});

test('buildActivateAppId falls back to THEME_EXTENSION_ID when api key missing', () => {
  const gid = 'gid://shopify/ThemeAppExtension/123456789';
  assert.equal(buildActivateAppId({ apiKey: '', themeExtensionIdEnv: gid }), gid);
});

test('buildThemeEditorEmbedUrl uses context=apps and activateAppId', () => {
  const url = buildThemeEditorEmbedUrl('demo.myshopify.com', 'abc123/app-embed');
  assert.ok(url);
  const parsed = new URL(url);
  assert.equal(parsed.hostname, 'demo.myshopify.com');
  assert.equal(parsed.pathname, '/admin/themes/current/editor');
  assert.equal(parsed.searchParams.get('context'), 'apps');
  assert.equal(parsed.searchParams.get('activateAppId'), 'abc123/app-embed');
});

test('detectAppEmbedFromSettingsData — enabled when disabled is false', () => {
  const sample = JSON.stringify({
    current: {
      blocks: {
        '1': {
          type: 'shopify://apps/poptek/blocks/app-embed/uuid-here',
          disabled: false,
          settings: {},
        },
      },
    },
  });
  assert.equal(detectAppEmbedFromSettingsData(sample).status, 'enabled');
});

test('detectAppEmbedFromSettingsData — disabled when disabled true', () => {
  const sample = JSON.stringify({
    current: {
      blocks: {
        '1': {
          type: 'shopify://apps/poptek/blocks/app-embed/uuid-here',
          disabled: true,
        },
      },
    },
  });
  assert.equal(detectAppEmbedFromSettingsData(sample).status, 'disabled');
});

test('detectAppEmbedFromSettingsData — not_configured when no embed block', () => {
  const sample = JSON.stringify({ current: { blocks: {} } });
  assert.equal(detectAppEmbedFromSettingsData(sample).status, 'not_configured');
});

test('detectAppEmbedFromSettingsData — unavailable on bad json', () => {
  assert.equal(detectAppEmbedFromSettingsData('not-json').status, 'unavailable');
});

test('parseThemeSettingsJson strips block comments', () => {
  const raw = `{
    "current": {
      /* comment */
      "blocks": {}
    }
  }`;
  const parsed = parseThemeSettingsJson(raw);
  assert.ok(parsed?.current);
});
