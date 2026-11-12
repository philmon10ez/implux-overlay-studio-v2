import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  sanitizeCssColor,
  sanitizeImageUrl,
  sanitizeNavigationUrl,
} from './overlaySanitize.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const extensionRoot = join(root, '../extensions/overlay-engine');

test('quote-breaking colors and javascript URLs are rejected', () => {
  assert.equal(sanitizeCssColor('red";}</style><script>alert(1)</script>', '#ffffff'), '#ffffff');
  assert.equal(sanitizeCssColor('#6c63ff', '#ffffff'), '#6c63ff');
  assert.equal(sanitizeNavigationUrl('javascript:alert(1)'), '');
  assert.equal(sanitizeNavigationUrl('https://shop.example/offer'), 'https://shop.example/offer');
  assert.equal(sanitizeImageUrl('data:text/html;base64,PHNjcmlwdD4='), '');
  assert.match(sanitizeImageUrl('data:image/png;base64,aaaa'), /^data:image\/png;base64,/);
});

test('production extension asset does not point at staging and has no test modules', () => {
  const asset = readFileSync(join(extensionRoot, 'assets/overlay-engine.js'), 'utf8');
  assert.match(asset, /https:\/\/api\.implux\.io\/proxy/);
  assert.equal(asset.includes('implux-overlay-studio-v2-staging'), false);
  assert.equal(asset.includes('os-spin-email'), false);
  assert.equal(asset.includes('function sanitizeNavigationUrl'), true);
  const files = readdirSync(join(extensionRoot, 'assets'));
  assert.equal(files.some((name) => name.endsWith('.mjs')), false);
  const locale = readFileSync(join(extensionRoot, 'locales/en.default.json'), 'utf8');
  assert.equal(locale.trim().startsWith('{'), true);
});

test('requested Shopify scopes omit theme and script-tag writes', () => {
  const production = readFileSync(join(root, '../shopify.app.production.toml'), 'utf8');
  const staging = readFileSync(join(root, '../shopify.app.staging.toml'), 'utf8');
  for (const toml of [production, staging]) {
    assert.match(toml, /scopes = "read_orders,read_themes"/);
    assert.equal(toml.includes('write_themes'), false);
    assert.equal(toml.includes('write_script_tags'), false);
    assert.match(toml, /\[app_proxy\]/);
  }
  assert.match(production, /url = "https:\/\/api\.implux\.io\/proxy"/);
  assert.equal(staging.includes('https://api.implux.io/proxy'), false);
});
