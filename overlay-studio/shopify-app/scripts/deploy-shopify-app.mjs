#!/usr/bin/env node
/**
 * Explicit Shopify app deploy wrapper with production guard and theme-extension build.
 * Does NOT run unless invoked directly — never called during Phase 2A verification.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { validateThemeExtensionProxyUrl } from '../../shared/serviceUrlGuard.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const shopifyAppRoot = join(__dirname, '..');

const target = process.argv[2];

if (target !== 'production' && target !== 'staging') {
  console.error('Usage: node scripts/deploy-shopify-app.mjs <production|staging>');
  process.exit(1);
}

const configFile = target === 'production' ? 'shopify.app.production.toml' : 'shopify.app.staging.toml';

if (target === 'production') {
  if (process.env.CONFIRM_PRODUCTION_DEPLOY !== 'YES') {
    console.error(`
PRODUCTION Shopify deploy blocked.

This deploy updates the LIVE Poptek App Store application (client_id bfcae2d7…).

To proceed deliberately, run:

  CONFIRM_PRODUCTION_DEPLOY=YES npm run deploy:production
`);
    process.exit(1);
  }
  console.warn('[deploy] PRODUCTION Shopify deploy confirmed via CONFIRM_PRODUCTION_DEPLOY=YES');
}

const defaultProxyUrl =
  target === 'production' ? 'https://api.implux.io/proxy' : process.env.POPTEK_PROXY_URL;

let proxyUrl = process.env.POPTEK_PROXY_URL || defaultProxyUrl;

try {
  proxyUrl = validateThemeExtensionProxyUrl(proxyUrl, target);
} catch (err) {
  console.error(String(err?.message || err));
  if (target === 'staging') {
    console.error(
      'Set POPTEK_PROXY_URL=https://api-staging.implux.io/proxy before staging extension deploy (Phase 2B).'
    );
  }
  process.exit(1);
}

console.log(`[deploy] Building theme extension for ${target} → ${proxyUrl}`);

const buildExt = spawnSync(
  process.execPath,
  [join(__dirname, 'build-overlay-engine-asset.mjs'), target],
  {
    cwd: shopifyAppRoot,
    stdio: 'inherit',
    env: { ...process.env, POPTEK_PROXY_URL: proxyUrl },
  }
);

if (buildExt.status !== 0) {
  process.exit(buildExt.status ?? 1);
}

console.log(`[deploy] Running: shopify app deploy --config ${configFile} --force`);

const deploy = spawnSync(
  'shopify',
  ['app', 'deploy', '--config', configFile, '--force'],
  { cwd: shopifyAppRoot, stdio: 'inherit', shell: true }
);

process.exit(deploy.status ?? 1);
