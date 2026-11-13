/**
 * Build and boot the production images from the Railway service directories.
 * Exits 2 when Docker is not running. Does not deploy or read production secrets.
 */
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertServicePackages } from './verify-service-layout.mjs';

const studio = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repo = resolve(studio, '..');
const productionDatabaseUrl =
  'postgresql://invalid:invalid@127.0.0.1:9/postgres?application_name=rpggayuuxnzdqybnmxyu';

function docker(args, { input, allowFail = false } = {}) {
  const result = spawnSync('docker', args, {
    cwd: repo,
    encoding: 'utf8',
    input,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const output = `${result.stdout || ''}${result.stderr || ''}`;
  if (!allowFail && result.status !== 0) {
    throw new Error(`docker ${args.join(' ')} failed\n${output}`);
  }
  return { status: result.status ?? 1, output };
}

function dockerAvailable() {
  const result = spawnSync('docker', ['info'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return result.status === 0;
}

function assertFiles(image, files) {
  const script = files.map((file) => `fs.accessSync(${JSON.stringify(file)})`).join(';');
  const result = docker([
    'run',
    '--rm',
    '--entrypoint',
    'node',
    image,
    '--input-type',
    'module',
    '-e',
    `import fs from 'node:fs'; ${script}; console.log('files-ok');`,
  ]);
  if (!result.output.includes('files-ok')) {
    throw new Error(`${image} is missing required files.\n${result.output}`);
  }
}

assertServicePackages();

if (!dockerAvailable()) {
  console.error('[containers] Docker is not running. Images were not built or started.');
  process.exit(2);
}

console.log('[containers] building backend image from overlay-studio/backend');
docker(['build', '-t', 'poptek-backend-release-check', '-f', 'overlay-studio/backend/Dockerfile', 'overlay-studio/backend']);
assertFiles('poptek-backend-release-check', [
  '/app/server.js',
  '/app/shared/appEnv.js',
  '/app/shared/databaseGuard.js',
  '/app/shared/tokenCipher.js',
  '/app/shared/storefrontProxyAuth.js',
]);

const refused = docker(
  [
    'run',
    '--rm',
    '-e',
    'APP_ENV=production',
    '-e',
    'DATABASE_ENV_ID=staging',
    '-e',
    `DATABASE_URL=${productionDatabaseUrl}`,
    '-e',
    'RAILWAY_ENVIRONMENT=production',
    '-e',
    'RAKUTEN_SYNC_ENABLED=false',
    'poptek-backend-release-check',
  ],
  { allowFail: true }
);
if (refused.status === 0 || !refused.output.includes('does not match APP_ENV')) {
  throw new Error(`Backend image did not keep the production database guard.\n${refused.output}`);
}

docker(['rm', '-f', 'poptek-backend-release-check-run'], { allowFail: true });
docker([
  'run',
  '-d',
  '--name',
  'poptek-backend-release-check-run',
  '-p',
  '3991:3991',
  '-e',
  'PORT=3991',
  '-e',
  'APP_ENV=production',
  '-e',
  'DATABASE_ENV_ID=production',
  '-e',
  `DATABASE_URL=${productionDatabaseUrl}`,
  '-e',
  'RAILWAY_ENVIRONMENT=production',
  '-e',
  'RAKUTEN_SYNC_ENABLED=false',
  'poptek-backend-release-check',
]);

let backendLogs = '';
const backendDeadline = Date.now() + 30000;
while (Date.now() < backendDeadline) {
  backendLogs = docker(['logs', 'poptek-backend-release-check-run'], { allowFail: true }).output;
  if (backendLogs.includes('Implux backend listening on port 3991')) break;
  if (backendLogs.includes('ERR_MODULE_NOT_FOUND')) break;
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
}
const health = await fetch('http://127.0.0.1:3991/health').then(
  async (response) => ({ ok: response.ok, body: await response.text() }),
  (error) => ({ ok: false, body: error.message })
);
docker(['rm', '-f', 'poptek-backend-release-check-run'], { allowFail: true });
if (!backendLogs.includes('APP_ENV=production') || !backendLogs.includes('Implux backend listening on port 3991') || !health.ok) {
  throw new Error(`Backend container did not start.\n${backendLogs}\n${health.body}`);
}
console.log('[containers] backend container listening');

console.log('[containers] building Shopify image from overlay-studio/shopify-app');
docker([
  'build',
  '-t',
  'poptek-shopify-release-check',
  '-f',
  'overlay-studio/shopify-app/Dockerfile',
  'overlay-studio/shopify-app',
]);
assertFiles('poptek-shopify-release-check', [
  '/app/shared/appEnv.js',
  '/app/shared/databaseGuard.js',
  '/app/shared/serviceUrlGuard.js',
  '/app/build/server/index.js',
  '/app/app/routes/webhooks.compliance.jsx',
]);

docker(['rm', '-f', 'poptek-shopify-release-check-run'], { allowFail: true });
docker([
  'run',
  '-d',
  '--name',
  'poptek-shopify-release-check-run',
  '-p',
  '3992:3992',
  '-e',
  'HOST=0.0.0.0',
  '-e',
  'PORT=3992',
  '-e',
  'APP_ENV=production',
  '-e',
  'DATABASE_ENV_ID=production',
  '-e',
  `DATABASE_URL=${productionDatabaseUrl}`,
  '-e',
  'RAILWAY_ENVIRONMENT=production',
  '-e',
  'SHOPIFY_API_KEY=container-check',
  '-e',
  'SHOPIFY_API_SECRET=container-check',
  '-e',
  'SCOPES=read_products,write_script_tags,read_orders,write_themes,read_themes',
  'poptek-shopify-release-check',
]);

let shopifyLogs = '';
const shopifyDeadline = Date.now() + 40000;
while (Date.now() < shopifyDeadline) {
  shopifyLogs = docker(['logs', 'poptek-shopify-release-check-run'], { allowFail: true }).output;
  if (shopifyLogs.includes('Shopify app APP_ENV=production')) break;
  if (shopifyLogs.includes('ERR_MODULE_NOT_FOUND') || shopifyLogs.includes('Could not resolve')) break;
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
}
docker(['rm', '-f', 'poptek-shopify-release-check-run'], { allowFail: true });
if (!shopifyLogs.includes('Shopify app APP_ENV=production')) {
  throw new Error(`Shopify container did not start.\n${shopifyLogs}`);
}
console.log('[containers] Shopify container started');
