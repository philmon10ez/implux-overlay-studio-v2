/**
 * Prove each Railway service root can boot without files that live outside it.
 * Railway uploads only overlay-studio/backend and overlay-studio/shopify-app.
 */
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  cpSync,
  lstatSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  unlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';

const studio = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const canonicalShared = join(studio, 'shared');
const services = ['backend', 'shopify-app'];
const importPattern = /from\s+['"](\.[^'"]*shared\/[^'"]+)['"]/g;

function filesIn(dir) {
  const found = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const info = statSync(path);
    if (info.isDirectory()) {
      if (name === 'node_modules' || name === 'build' || name === 'dist') continue;
      found.push(...filesIn(path));
    } else if (/\.(js|mjs|jsx)$/.test(name)) {
      found.push(path);
    }
  }
  return found;
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

export function assertServicePackages() {
  const canonical = readdirSync(canonicalShared).filter((name) => statSync(join(canonicalShared, name)).isFile());
  if (!canonical.includes('appEnv.js') || !canonical.includes('databaseGuard.js')) {
    throw new Error('Canonical shared modules are missing.');
  }

  for (const service of services) {
    const copyRoot = join(studio, service, 'shared');
    for (const name of canonical) {
      const expected = sha256(join(canonicalShared, name));
      const actualPath = join(copyRoot, name);
      let actual;
      try {
        actual = sha256(actualPath);
      } catch {
        throw new Error(`${service} is missing shared/${name}. Railway cannot see overlay-studio/shared.`);
      }
      if (actual !== expected) {
        throw new Error(`${service}/shared/${name} does not match overlay-studio/shared/${name}.`);
      }
    }

    const serviceRoot = join(studio, service);
    for (const file of filesIn(serviceRoot)) {
      const source = readFileSync(file, 'utf8');
      for (const match of source.matchAll(importPattern)) {
        const target = resolve(dirname(file), match[1]);
        const rel = relative(serviceRoot, target);
        if (rel.startsWith('..') || rel === '') {
          throw new Error(`${relative(studio, file)} imports ${match[1]}, which is outside ${service}.`);
        }
      }
    }
  }
}

function shouldCopy(serviceRoot, path) {
  const rel = relative(serviceRoot, path);
  if (!rel) return true;
  const parts = rel.split(/[\\/]/);
  if (parts.includes('node_modules') || parts.includes('build') || parts.includes('env')) return false;
  const base = parts[parts.length - 1];
  if (base === '.env' || base.startsWith('.env.')) return false;
  return true;
}

function copyService(service) {
  const serviceRoot = join(studio, service);
  const parent = mkdtempSync(join(tmpdir(), 'poptek-service-'));
  const dest = join(parent, service);
  cpSync(serviceRoot, dest, {
    recursive: true,
    filter: (path) => shouldCopy(serviceRoot, path),
  });
  symlinkSync(join(serviceRoot, 'node_modules'), join(dest, 'node_modules'), 'junction');
  return { parent, dest };
}

function removeCopy(copied) {
  const link = join(copied.dest, 'node_modules');
  try {
    if (lstatSync(link).isSymbolicLink() || process.platform === 'win32') unlinkSync(link);
  } catch {
    // The copy may have failed before the junction existed.
  }
  rmSync(copied.parent, { recursive: true, force: true });
}

function runNode(cwd, args, env, { ready, timeoutMs }) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`Timed out in ${cwd}\n${output}`));
    }, timeoutMs);
    const finish = (code) => {
      clearTimeout(timer);
      resolvePromise({ code, output });
    };
    child.stdout.on('data', (chunk) => {
      output += chunk.toString();
      if (ready && ready.test(output)) {
        child.kill();
        finish(0);
      }
    });
    child.stderr.on('data', (chunk) => {
      output += chunk.toString();
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('exit', (code) => {
      if (ready && ready.test(output)) return;
      finish(code ?? 1);
    });
  });
}

const productionDatabaseUrl =
  'postgresql://invalid:invalid@127.0.0.1:9/postgres?application_name=rpggayuuxnzdqybnmxyu';

export async function bootIsolatedServices() {
  const backend = copyService('backend');
  try {
    const mismatch = await runNode(
      backend.dest,
      ['server.js'],
      {
        APP_ENV: 'production',
        DATABASE_ENV_ID: 'staging',
        DATABASE_URL: productionDatabaseUrl,
        RAILWAY_ENVIRONMENT: 'production',
        PORT: '3991',
        RAKUTEN_SYNC_ENABLED: 'false',
      },
      { timeoutMs: 20000 }
    );
    if (mismatch.code === 0 || !mismatch.output.includes('does not match APP_ENV')) {
      throw new Error(`Production database guard did not reject a staging id.\n${mismatch.output}`);
    }

    const stagingProject = await runNode(
      backend.dest,
      ['server.js'],
      {
        APP_ENV: 'production',
        DATABASE_ENV_ID: 'production',
        DATABASE_URL: 'postgresql://invalid:invalid@127.0.0.1:9/draguoqqidihfxovxfss',
        RAILWAY_ENVIRONMENT: 'production',
        PORT: '3991',
        RAKUTEN_SYNC_ENABLED: 'false',
      },
      { timeoutMs: 20000 }
    );
    if (stagingProject.code === 0 || !stagingProject.output.includes('must not connect to the staging database')) {
      throw new Error(`Production database guard did not reject the staging project.\n${stagingProject.output}`);
    }

    const started = await runNode(
      backend.dest,
      ['server.js'],
      {
        APP_ENV: 'production',
        DATABASE_ENV_ID: 'production',
        DATABASE_URL: productionDatabaseUrl,
        RAILWAY_ENVIRONMENT: 'production',
        PORT: '3991',
        RAKUTEN_SYNC_ENABLED: 'false',
      },
      { ready: /Implux backend listening on port 3991/, timeoutMs: 20000 }
    );
    if (!/APP_ENV=production/.test(started.output) || !/Implux backend listening on port 3991/.test(started.output)) {
      throw new Error(`Isolated backend did not start.\n${started.output}`);
    }
    console.log('[layout] isolated backend started with APP_ENV=production');
  } finally {
    removeCopy(backend);
  }

  const shopify = copyService('shopify-app');
  try {
    const generated = await runNode(
      shopify.dest,
      ['node_modules/prisma/build/index.js', 'generate'],
      {},
      { timeoutMs: 60000 }
    );
    if (generated.code !== 0) {
      throw new Error(`Isolated Shopify prisma generate failed.\n${generated.output}`);
    }
    const vite = await runNode(
      shopify.dest,
      ['node_modules/@remix-run/dev/dist/cli.js', 'vite:build'],
      {},
      { timeoutMs: 180000 }
    );
    if (vite.code !== 0 || vite.output.includes('Could not resolve')) {
      throw new Error(`Isolated Shopify production build failed.\n${vite.output}`);
    }
    console.log('[layout] isolated Shopify Remix build completed');

    const started = await runNode(
      shopify.dest,
      ['node_modules/@remix-run/serve/dist/cli.js', './build/server/index.js'],
      {
        HOST: '127.0.0.1',
        PORT: '3992',
        APP_ENV: 'production',
        DATABASE_ENV_ID: 'production',
        DATABASE_URL: productionDatabaseUrl,
        RAILWAY_ENVIRONMENT: 'production',
        SHOPIFY_API_KEY: 'container-check',
        SHOPIFY_API_SECRET: 'container-check',
        SCOPES: 'read_products,write_script_tags,read_orders,write_themes,read_themes',
      },
      { ready: /Shopify app APP_ENV=production/, timeoutMs: 40000 }
    );
    if (!/Shopify app APP_ENV=production/.test(started.output)) {
      throw new Error(`Isolated Shopify app did not start.\n${started.output}`);
    }
    console.log('[layout] isolated Shopify app started with APP_ENV=production');
  } finally {
    removeCopy(shopify);
  }
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (invokedDirectly) {
  assertServicePackages();
  console.log('[layout] shared modules are inside both Railway service roots');
  if (process.argv.includes('--runtime')) {
    await bootIsolatedServices();
  }
}
