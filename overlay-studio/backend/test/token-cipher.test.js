import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import {
  decryptFromStorage,
  encryptForStorage,
  encryptionConfigured,
  TokenCryptoError,
} from '../../shared/tokenCipher.js';

function envWithKey(extra = {}) {
  const key = crypto.randomBytes(32).toString('base64');
  return { TOKEN_ENCRYPTION_KEY: key, TOKEN_ENCRYPTION_KEY_ID: 'v1', ...extra };
}

test('encryption stays off when no key is configured', () => {
  const env = {};
  assert.equal(encryptionConfigured(env), false);
  assert.equal(encryptForStorage('shpat_example', env), 'shpat_example');
  assert.equal(decryptFromStorage('shpat_example', env), 'shpat_example');
});

test('ciphertext round-trips and does not contain the plaintext token', () => {
  const env = envWithKey();
  const token = 'shpat_example_token_value';
  const stored = encryptForStorage(token, env);
  assert.match(stored, /^ptk1\.v1\./);
  assert.equal(stored.includes(token), false);
  assert.equal(decryptFromStorage(stored, env), token);
});

test('missing key refuses to return ciphertext as a usable token', () => {
  const env = envWithKey();
  const stored = encryptForStorage('shpat_example', env);
  assert.throws(() => decryptFromStorage(stored, {}), TokenCryptoError);
});

test('previous key still decrypts after rotation', () => {
  const previous = crypto.randomBytes(32).toString('base64');
  const next = crypto.randomBytes(32).toString('base64');
  const oldEnv = { TOKEN_ENCRYPTION_KEY: previous, TOKEN_ENCRYPTION_KEY_ID: 'v1' };
  const stored = encryptForStorage('offline-token', oldEnv);
  const rotated = {
    TOKEN_ENCRYPTION_KEY: next,
    TOKEN_ENCRYPTION_KEY_ID: 'v2',
    TOKEN_ENCRYPTION_PREVIOUS_KEYS: `v1:${previous}`,
  };
  assert.equal(decryptFromStorage(stored, rotated), 'offline-token');
  const rewritten = encryptForStorage('offline-token', rotated);
  assert.match(rewritten, /^ptk1\.v2\./);
});

test('tampered ciphertext is rejected', () => {
  const env = envWithKey();
  const stored = encryptForStorage('offline-token', env);
  const broken = stored.slice(0, -2) + (stored.endsWith('a') ? 'b' : 'a');
  assert.throws(() => decryptFromStorage(broken, env), TokenCryptoError);
});
