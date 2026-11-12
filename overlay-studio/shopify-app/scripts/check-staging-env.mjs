/**
 * Validate the two local staging env files. Does not print secret values,
 * start Shopify, or open a database connection.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'dotenv';
import { stagingProcessEnvErrors } from '../app/lib/stagingProcessGuard.server.js';

const appRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const remixEnvPath = join(appRoot, 'env', 'staging', '.env');
const cliEnvPath = join(appRoot, '.env.staging');

function readText(path) {
  try {
    return readFileSync(path, 'utf8');
  } catch (error) {
    if (error && error.code === 'ENOENT') return null;
    throw error;
  }
}

const remixText = readText(remixEnvPath);
const cliText = readText(cliEnvPath);
const problems = [];

if (remixText === null) problems.push('env/staging/.env is missing');
if (cliText === null) problems.push('.env.staging is missing');
if (remixText !== null && cliText !== null && remixText !== cliText) {
  problems.push('env/staging/.env and .env.staging differ; keep them identical');
}

if (problems.length === 0) {
  problems.push(...stagingProcessEnvErrors(parse(remixText)));
}

if (problems.length) {
  console.error('[staging-env] Not ready.');
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log('[staging-env] Staging files agree and contain no production identities.');
console.log('[staging-env] Launch only after review, from overlay-studio/shopify-app:');
console.log('  $env:POPTEK_STAGING_LOCAL="1"; shopify app dev --config staging');
