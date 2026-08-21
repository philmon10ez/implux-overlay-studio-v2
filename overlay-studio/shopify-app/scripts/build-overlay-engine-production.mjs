#!/usr/bin/env node
/**
 * Restore committed production proxy URL in overlay-engine.js (safe default for repo state).
 * Run after local staging extension builds if needed.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const result = spawnSync(
  process.execPath,
  [join(__dirname, 'build-overlay-engine-asset.mjs'), 'production'],
  {
    cwd: join(__dirname, '..'),
    stdio: 'inherit',
    env: { ...process.env, POPTEK_PROXY_URL: 'https://api.implux.io/proxy' },
  }
);
process.exit(result.status ?? 1);
