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

const PRESERVED_PRODUCTION_SCOPES =
  'read_products,write_script_tags,read_orders,write_themes,read_themes';

test('production Shopify configs preserve the active merchant scopes', () => {
  const production = readFileSync(join(root, '../shopify.app.production.toml'), 'utf8');
  const defaultConfig = readFileSync(join(root, '../shopify.app.toml'), 'utf8');
  const legacyConfig = readFileSync(join(root, '../shopify.app.implux.toml'), 'utf8');
  const server = readFileSync(join(root, '../app/shopify.server.js'), 'utf8');
  for (const toml of [production, defaultConfig, legacyConfig]) {
    assert.match(toml, new RegExp(`scopes = "${PRESERVED_PRODUCTION_SCOPES}"`));
    assert.match(toml, /client_id = "bfcae2d7ecd83eb4fc96749fb543380c"/);
    assert.match(toml, /application_url = "https:\/\/stunning-friendship-production\.up\.railway\.app"/);
    assert.match(toml, /\[app_proxy\]/);
    assert.match(toml, /url = "https:\/\/api\.implux\.io\/proxy"/);
    assert.match(toml, /prefix = "apps"/);
    assert.match(toml, /subpath = "poptek"/);
    assert.equal(toml.includes('implux-overlay-studio-v2-staging'), false);
  }
  assert.match(server, new RegExp(PRESERVED_PRODUCTION_SCOPES.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('staging Shopify config does not point at the production proxy', () => {
  const staging = readFileSync(join(root, '../shopify.app.staging.toml'), 'utf8');
  assert.match(staging, /\[app_proxy\]/);
  assert.equal(staging.includes('https://api.implux.io/proxy'), false);
  assert.match(staging, /subpath = "poptek"/);
});

test('theme editor app embed label is Poptek by Implux', () => {
  const locale = JSON.parse(readFileSync(join(extensionRoot, 'locales/en.default.json'), 'utf8'));
  assert.equal(locale.name, 'Poptek by Implux');
  const liquid = readFileSync(join(extensionRoot, 'blocks/app-embed.liquid'), 'utf8');
  assert.match(liquid, /"name": "Poptek by Implux"/);
  assert.match(liquid, /appProxyPath = '\/apps\/poptek'/);
});
