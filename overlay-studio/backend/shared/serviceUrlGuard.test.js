import test from 'node:test';
import assert from 'node:assert/strict';
import { validateThemeExtensionProxyUrl } from './serviceUrlGuard.js';

const STAGING_RAILWAY_PROXY = 'https://implux-overlay-studio-v2-staging.up.railway.app/proxy';
const STAGING_CUSTOM_PROXY = 'https://api-staging.implux.io/proxy';
const PRODUCTION_PROXY = 'https://api.implux.io/proxy';

test('staging theme proxy allows the verified Railway staging backend', () => {
  assert.equal(validateThemeExtensionProxyUrl(STAGING_RAILWAY_PROXY, 'staging'), STAGING_RAILWAY_PROXY);
});

test('staging theme proxy still allows the planned custom staging host', () => {
  assert.equal(validateThemeExtensionProxyUrl(STAGING_CUSTOM_PROXY, 'staging'), STAGING_CUSTOM_PROXY);
});

test('staging theme proxy rejects the production API', () => {
  assert.throws(
    () => validateThemeExtensionProxyUrl(PRODUCTION_PROXY, 'staging'),
    /must not target production host "api\.implux\.io"/
  );
});

test('staging theme proxy rejects other Railway hosts and lookalikes', () => {
  const rejected = [
    'https://implux-overlay-studio-v2.up.railway.app/proxy',
    'https://poptek-shopify-staging-staging.up.railway.app/proxy',
    'https://stunning-friendship-production.up.railway.app/proxy',
    'https://evil.implux-overlay-studio-v2-staging.up.railway.app/proxy',
    'https://notimplux-overlay-studio-v2-staging.up.railway.app/proxy',
    'http://implux-overlay-studio-v2-staging.up.railway.app/proxy',
    'https://implux-overlay-studio-v2-staging.up.railway.app/proxy/campaigns',
    'https://implux-overlay-studio-v2-staging.up.railway.app/proxy?shop=1',
    'https://user:pass@implux-overlay-studio-v2-staging.up.railway.app/proxy',
    'https://implux-overlay-studio-v2-staging.up.railway.app:8443/proxy',
  ];
  for (const url of rejected) {
    assert.throws(() => validateThemeExtensionProxyUrl(url, 'staging'), /Staging POPTEK_PROXY_URL must be/, url);
  }
});

test('production theme proxy still requires api.implux.io/proxy', () => {
  assert.equal(validateThemeExtensionProxyUrl(PRODUCTION_PROXY, 'production'), PRODUCTION_PROXY);
  assert.throws(
    () => validateThemeExtensionProxyUrl(STAGING_RAILWAY_PROXY, 'production'),
    /Production POPTEK_PROXY_URL must target "api\.implux\.io"/
  );
  assert.throws(
    () => validateThemeExtensionProxyUrl(STAGING_CUSTOM_PROXY, 'production'),
    /Production POPTEK_PROXY_URL must target "api\.implux\.io"/
  );
});

test('theme proxy URL is required and must end with /proxy', () => {
  assert.throws(
    () => validateThemeExtensionProxyUrl('', 'staging'),
    /POPTEK_PROXY_URL is required/
  );
  assert.throws(
    () => validateThemeExtensionProxyUrl('https://api.implux.io/campaigns', 'production'),
    /must end with \/proxy/
  );
});
