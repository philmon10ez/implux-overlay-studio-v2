import test from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '@shopify/shopify-api';
import { decryptFromStorage, encryptForStorage } from '../../shared/tokenCipher.js';
import { sessionWithStoredSecrets } from './encryptingSessionStorage.server.js';

const TEST_KEY = Buffer.alloc(32, 7).toString('base64');

function withTokenKey(key, fn) {
  const previousKey = process.env.TOKEN_ENCRYPTION_KEY;
  const previousId = process.env.TOKEN_ENCRYPTION_KEY_ID;
  if (key == null) delete process.env.TOKEN_ENCRYPTION_KEY;
  else process.env.TOKEN_ENCRYPTION_KEY = key;
  process.env.TOKEN_ENCRYPTION_KEY_ID = 'test';
  try {
    return fn();
  } finally {
    if (previousKey == null) delete process.env.TOKEN_ENCRYPTION_KEY;
    else process.env.TOKEN_ENCRYPTION_KEY = previousKey;
    if (previousId == null) delete process.env.TOKEN_ENCRYPTION_KEY_ID;
    else process.env.TOKEN_ENCRYPTION_KEY_ID = previousId;
  }
}

function assertLiveSession(session, accessToken) {
  assert.equal(session instanceof Session, true);
  assert.equal(typeof session.isActive, 'function');
  assert.equal(typeof session.toObject, 'function');
  assert.equal(session.isActive(undefined), true);
  assert.equal(session.accessToken, accessToken);
  assert.equal(session.refreshToken, 'refresh-token');
  const stored = session.toObject();
  assert.equal(stored.accessToken, accessToken);
  assert.equal(stored.refreshToken, 'refresh-token');
  assert.equal(stored.shop, 'implux-test-store.myshopify.com');
}

function offlineSession(extra = {}) {
  return new Session({
    id: 'offline_implux-test-store.myshopify.com',
    shop: 'implux-test-store.myshopify.com',
    state: 'state',
    isOnline: false,
    scope: 'read_products,read_orders,read_themes',
    accessToken: 'offline-token',
    refreshToken: 'refresh-token',
    ...extra,
  });
}

test('token copies stay Session instances so token exchange can call isActive', () => {
  const stored = sessionWithStoredSecrets(offlineSession(), (value) => `enc:${value}`);
  assert.equal(typeof stored.isActive, 'function');
  assert.equal(typeof stored.toObject, 'function');
  assert.equal(stored.isActive(undefined), true);
  assert.equal(stored.accessToken, 'enc:offline-token');
  assert.equal(stored.refreshToken, 'enc:refresh-token');
  assert.equal(stored.shop, 'implux-test-store.myshopify.com');

  const loaded = sessionWithStoredSecrets(stored, (value) => value.replace(/^enc:/, ''));
  assert.equal(typeof loaded.isActive, 'function');
  assert.equal(loaded.accessToken, 'offline-token');
  assert.equal(loaded.refreshToken, 'refresh-token');
  assert.equal(loaded.isActive(undefined), true);
});

test('a plain session row is restored before authenticate.admin reads it', () => {
  const plain = { ...offlineSession() };
  assert.equal(plain.isActive, undefined);
  const restored = sessionWithStoredSecrets(plain, (value) => value);
  assert.equal(typeof restored.isActive, 'function');
  assert.equal(restored.isActive(undefined), true);
  assert.equal(typeof restored.toObject, 'function');
});

test('an expired session is inactive without throwing', () => {
  const expired = sessionWithStoredSecrets(
    offlineSession({ expires: new Date(Date.now() - 60_000) }),
    (value) => value,
  );
  assert.equal(expired.isActive(undefined), false);
});

test('missing sessions stay missing', () => {
  assert.equal(sessionWithStoredSecrets(undefined, (value) => value), undefined);
  assert.equal(sessionWithStoredSecrets(null, (value) => value), null);
});

test('encryption-disabled store and load keep a Session and plaintext tokens', () => {
  withTokenKey(null, () => {
    const stored = sessionWithStoredSecrets(offlineSession(), (value) => encryptForStorage(value));
    assertLiveSession(stored, 'offline-token');
    assert.equal(stored.accessToken.startsWith('ptk1.'), false);

    const loaded = sessionWithStoredSecrets(stored, (value) => decryptFromStorage(value));
    assertLiveSession(loaded, 'offline-token');
  });
});

test('encryption-enabled store and load keep a Session and round-trip tokens', () => {
  withTokenKey(TEST_KEY, () => {
    const stored = sessionWithStoredSecrets(offlineSession(), (value) => encryptForStorage(value));
    assert.equal(stored instanceof Session, true);
    assert.equal(typeof stored.isActive, 'function');
    assert.equal(typeof stored.toObject, 'function');
    assert.equal(stored.accessToken.startsWith('ptk1.'), true);
    assert.equal(stored.refreshToken.startsWith('ptk1.'), true);
    assert.equal(stored.toObject().accessToken.startsWith('ptk1.'), true);

    const loaded = sessionWithStoredSecrets(stored, (value) => decryptFromStorage(value));
    assertLiveSession(loaded, 'offline-token');
  });
});
