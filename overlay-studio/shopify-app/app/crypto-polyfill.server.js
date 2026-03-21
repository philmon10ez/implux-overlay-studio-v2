/**
 * Shopify API OAuth uses the Web Crypto API (global `crypto`).
 * Some Node runtimes / Remix bundles don't expose it globally — causes
 * ReferenceError: crypto is not defined in @shopify/shopify-api nonce.ts
 */
import { webcrypto } from 'node:crypto';

const c = webcrypto;
if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = c;
}
if (typeof global !== 'undefined' && typeof global.crypto === 'undefined') {
  global.crypto = c;
}
