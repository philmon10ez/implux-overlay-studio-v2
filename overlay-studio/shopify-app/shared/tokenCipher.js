/**
 * Versioned authenticated encryption for Shopify and partner secrets at rest.
 * Format: ptk1.<keyId>.<iv>.<tag>.<ciphertext> (base64url).
 * AES-256-GCM. Keys stay in the process environment and are never written to the database.
 * When TOKEN_ENCRYPTION_KEY is absent, plaintext is stored unchanged so a deploy
 * does not require the key. Ciphertext cannot be read without its key.
 */
import crypto from 'crypto';

export const CIPHER_PREFIX = 'ptk1';

export class TokenCryptoError extends Error {
  /**
   * @param {string} message
   */
  constructor(message) {
    super(message);
    this.name = 'TokenCryptoError';
  }
}

/**
 * @param {unknown} raw
 * @returns {Buffer | null}
 */
export function decodeEncryptionKey(raw) {
  const text = String(raw || '').trim();
  if (!text) return null;
  if (/^[0-9a-fA-F]{64}$/.test(text)) return Buffer.from(text, 'hex');
  try {
    const buf = Buffer.from(text, 'base64');
    if (buf.length === 32) return buf;
  } catch {
    return null;
  }
  return null;
}

/**
 * @param {NodeJS.ProcessEnv} [env]
 */
export function encryptionConfigured(env = process.env) {
  return Boolean(decodeEncryptionKey(env.TOKEN_ENCRYPTION_KEY));
}

/**
 * @param {NodeJS.ProcessEnv} [env]
 */
export function loadKeyRing(env = process.env) {
  /** @type {Map<string, Buffer>} */
  const ring = new Map();
  const currentId = String(env.TOKEN_ENCRYPTION_KEY_ID || 'v1').trim() || 'v1';
  const current = decodeEncryptionKey(env.TOKEN_ENCRYPTION_KEY);
  if (current) ring.set(currentId, current);
  const previous = String(env.TOKEN_ENCRYPTION_PREVIOUS_KEYS || '').trim();
  if (previous) {
    for (const part of previous.split(',')) {
      const splitAt = part.indexOf(':');
      if (splitAt <= 0) continue;
      const id = part.slice(0, splitAt).trim();
      const material = part.slice(splitAt + 1).trim();
      const key = decodeEncryptionKey(material);
      if (id && key && !ring.has(id)) ring.set(id, key);
    }
  }
  return { currentId, ring };
}

/**
 * @param {unknown} plaintext
 * @param {NodeJS.ProcessEnv} [env]
 */
export function encryptForStorage(plaintext, env = process.env) {
  const value = plaintext == null ? '' : String(plaintext);
  if (!value) return '';
  if (value.startsWith(`${CIPHER_PREFIX}.`)) return value;
  const { currentId, ring } = loadKeyRing(env);
  const key = ring.get(currentId);
  if (!key) return value;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    CIPHER_PREFIX,
    currentId,
    iv.toString('base64url'),
    tag.toString('base64url'),
    ciphertext.toString('base64url'),
  ].join('.');
}

/**
 * @param {unknown} stored
 * @param {NodeJS.ProcessEnv} [env]
 */
export function decryptFromStorage(stored, env = process.env) {
  const value = stored == null ? '' : String(stored);
  if (!value) return '';
  if (!value.startsWith(`${CIPHER_PREFIX}.`)) return value;
  const parts = value.split('.');
  if (parts.length !== 5 || parts[0] !== CIPHER_PREFIX) {
    throw new TokenCryptoError('Unrecognized token ciphertext');
  }
  const keyId = parts[1];
  const { ring } = loadKeyRing(env);
  const key = ring.get(keyId);
  if (!key) {
    throw new TokenCryptoError('Encryption key for stored token is not available');
  }
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(parts[2], 'base64url'));
    decipher.setAuthTag(Buffer.from(parts[3], 'base64url'));
    const plain = Buffer.concat([
      decipher.update(Buffer.from(parts[4], 'base64url')),
      decipher.final(),
    ]);
    return plain.toString('utf8');
  } catch (err) {
    if (err instanceof TokenCryptoError) throw err;
    throw new TokenCryptoError('Stored token could not be decrypted');
  }
}

/**
 * @param {unknown} value
 */
export function isCiphertext(value) {
  return typeof value === 'string' && value.startsWith(`${CIPHER_PREFIX}.`);
}
