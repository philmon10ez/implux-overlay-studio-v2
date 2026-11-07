#!/usr/bin/env node
/**
 * Build overlay-engine.js with an explicit proxy URL (theme extensions cannot read runtime env).
 *
 * Usage:
 *   POPTEK_PROXY_URL=https://api-staging.implux.io/proxy node scripts/build-overlay-engine-asset.mjs staging
 *   POPTEK_PROXY_URL=https://api.implux.io/proxy node scripts/build-overlay-engine-asset.mjs production
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { validateThemeExtensionProxyUrl } from '../../shared/serviceUrlGuard.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const assetPath = join(__dirname, '../extensions/overlay-engine/assets/overlay-engine.js');
const sync = spawnSync(process.execPath, [join(__dirname, 'sync-overlay-engine-storefront.mjs')], {
  stdio: 'inherit',
});
if (sync.status !== 0) {
  process.exit(sync.status ?? 1);
}

const target = process.argv[2];
if (target !== 'production' && target !== 'staging') {
  console.error('Usage: node scripts/build-overlay-engine-asset.mjs <production|staging>');
  process.exit(1);
}

const proxyUrl = validateThemeExtensionProxyUrl(
  process.env.POPTEK_PROXY_URL ||
    (target === 'production' ? 'https://api.implux.io/proxy' : ''),
  target
);

let source = readFileSync(assetPath, 'utf8');
const generatedBanner =
  '/* AUTO-GENERATED PROXY URL — run scripts/build-overlay-engine-asset.mjs before deploy. Do not hand-edit PROXY_URL. */\n';

if (!source.startsWith('/* AUTO-GENERATED PROXY URL')) {
  source = generatedBanner + source;
}

const proxyLine = `  var PROXY_URL = '${proxyUrl}';`;
const replaced = source.replace(/^\s*var PROXY_URL = '[^']*';/m, proxyLine);

if (!replaced.includes(proxyUrl)) {
  console.error('[theme-extension] Failed to inject PROXY_URL into overlay-engine.js');
  process.exit(1);
}

writeFileSync(assetPath, replaced, 'utf8');
console.log(`[theme-extension] Wrote ${assetPath} with PROXY_URL=${proxyUrl}`);
