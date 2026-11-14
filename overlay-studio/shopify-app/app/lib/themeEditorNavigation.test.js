import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildActivateAppId } from './onboarding.server.js';
import {
  buildThemeEditorNavigation,
  openThemeEditorNavigation,
} from './themeEditorNavigation.js';

const CLIENT_ID = 'abc123client';

function destination() {
  return buildThemeEditorNavigation(
    'https://Demo-Shop.myshopify.com/admin',
    buildActivateAppId({ apiKey: CLIENT_ID }),
  );
}

test('theme editor destination targets the current store app embed via App Bridge', () => {
  const nav = destination();
  assert.ok(nav);
  assert.equal(nav.shopDomain, 'demo-shop.myshopify.com');
  const admin = new URL(nav.adminPath);
  assert.equal(admin.protocol, 'shopify:');
  assert.equal(admin.hostname, 'admin');
  assert.equal(admin.pathname, '/themes/current/editor');
  assert.equal(admin.searchParams.get('context'), 'apps');
  assert.equal(admin.searchParams.get('activateAppId'), `${CLIENT_ID}/app-embed`);

  const fallback = new URL(nav.fallbackUrl);
  assert.equal(fallback.protocol, 'https:');
  assert.equal(fallback.hostname, 'admin.shopify.com');
  assert.equal(fallback.pathname, '/store/demo-shop/themes/current/editor');
  assert.equal(fallback.searchParams.get('activateAppId'), `${CLIENT_ID}/app-embed`);
  assert.equal(nav.adminPath.includes('admin.shopify.com'), false);
});

test('theme editor destination rejects untrusted shops and app ids', () => {
  assert.equal(buildThemeEditorNavigation('evil.com', `${CLIENT_ID}/app-embed`), null);
  assert.equal(buildThemeEditorNavigation('demo.myshopify.com.evil.com', `${CLIENT_ID}/app-embed`), null);
  assert.equal(buildThemeEditorNavigation('demo.myshopify.com', 'https://evil.example/app-embed'), null);
  assert.equal(buildThemeEditorNavigation('demo.myshopify.com', `${CLIENT_ID}/other-block`), null);
  assert.equal(buildThemeEditorNavigation('', `${CLIENT_ID}/app-embed`), null);
});

test('App Bridge opens the theme editor in the top frame', () => {
  const calls = [];
  const result = openThemeEditorNavigation(destination(), {
    isAppBridgeReady: () => true,
    open: (...args) => calls.push(args),
  });
  assert.equal(result, 'app-bridge');
  assert.deepEqual(calls, [[destination().adminPath, '_top']]);
  assert.equal(String(calls[0][0]).startsWith('shopify://admin/themes/current/editor?'), true);
});

test('missing App Bridge opens the same theme editor in a new tab', () => {
  const calls = [];
  const nav = destination();
  const result = openThemeEditorNavigation(nav, {
    isAppBridgeReady: () => false,
    open: (...args) => calls.push(args),
  });
  assert.equal(result, 'new-tab');
  assert.deepEqual(calls, [[nav.fallbackUrl, '_blank', 'noopener,noreferrer']]);
  assert.equal(calls[0][0].startsWith('https://admin.shopify.com/store/demo-shop/'), true);
});

test('navigation rejects a fallback that points at a different store', () => {
  const nav = destination();
  const swapped = {
    ...nav,
    fallbackUrl: nav.fallbackUrl.replace('/store/demo-shop/', '/store/other-shop/'),
  };
  const calls = [];
  const result = openThemeEditorNavigation(swapped, {
    isAppBridgeReady: () => false,
    open: (...args) => calls.push(args),
  });
  assert.equal(result, 'rejected');
  assert.deepEqual(calls, []);
});

test('onboarding names the embed Poptek by Implux and does not link the iframe to admin', () => {
  const source = readFileSync(new URL('../components/SetupChecklist.jsx', import.meta.url), 'utf8');
  assert.match(source, /Poptek by Implux/);
  assert.equal(source.includes('the Implux app embed'), false);
  assert.equal(source.includes('Toggle <strong>Implux</strong>'), false);
  assert.equal(source.includes('url={themeEditorUrl}'), false);
  assert.equal(source.includes('admin.shopify.com'), false);
  assert.match(source, /openThemeEditorNavigation/);
});
