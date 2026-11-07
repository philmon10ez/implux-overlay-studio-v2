#!/usr/bin/env node
/**
 * Inject overlay-engine-storefront.mjs into overlay-engine.js (single browser bundle).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const mjsPath = join(root, 'extensions/overlay-engine/assets/overlay-engine-storefront.mjs');
const assetPath = join(root, 'extensions/overlay-engine/assets/overlay-engine.js');

const START = '/* @poptek-storefront-logic:start */';
const END = '/* @poptek-storefront-logic:end */';

let body = readFileSync(mjsPath, 'utf8');
body = body.replace(/^\/\*\*[\s\S]*?\*\/\s*/m, '');
body = body.replace(/^export function /gm, 'function ');
body = body.replace(/^export async function /gm, 'async function ');
body = body.replace(/^export const /gm, 'var ');

const injected = `${START}\n${body}\n${END}`;

let asset = readFileSync(assetPath, 'utf8');
const startIdx = asset.indexOf(START);
const endIdx = asset.indexOf(END);

if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
  console.error('[sync-overlay-engine] Missing storefront logic markers in overlay-engine.js');
  process.exit(1);
}

const before = asset.slice(0, startIdx);
const after = asset.slice(endIdx + END.length);
writeFileSync(assetPath, before + injected + after, 'utf8');
console.log('[sync-overlay-engine] Injected storefront logic into overlay-engine.js');
