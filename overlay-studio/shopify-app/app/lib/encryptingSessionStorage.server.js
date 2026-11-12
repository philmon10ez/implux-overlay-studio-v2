/**
 * Prisma session storage that encrypts Shopify tokens when TOKEN_ENCRYPTION_KEY is set.
 * Without the key, tokens stay plaintext so the app keeps working.
 * A ciphertext row cannot be loaded if its key is missing; the merchant signs in again.
 */
import { PrismaSessionStorage } from '@shopify/shopify-app-session-storage-prisma';
import { decryptFromStorage, encryptForStorage, TokenCryptoError } from '../../../shared/tokenCipher.js';

function withStoredSecrets(session, transform) {
  if (!session) return session;
  const copy = { ...session };
  if (copy.accessToken) copy.accessToken = transform(copy.accessToken);
  if (copy.refreshToken) copy.refreshToken = transform(copy.refreshToken);
  return copy;
}

function decryptSession(session) {
  if (!session) return session;
  try {
    return withStoredSecrets(session, decryptFromStorage);
  } catch (err) {
    if (err instanceof TokenCryptoError) {
      console.error('[security] session_decrypt_failed');
      return undefined;
    }
    throw err;
  }
}

export class EncryptingPrismaSessionStorage extends PrismaSessionStorage {
  async storeSession(session) {
    return super.storeSession(withStoredSecrets(session, encryptForStorage));
  }

  async loadSession(id) {
    return decryptSession(await super.loadSession(id));
  }

  async findSessionsByShop(shop) {
    const sessions = await super.findSessionsByShop(shop);
    if (!Array.isArray(sessions)) return sessions;
    return sessions.map((session) => decryptSession(session)).filter(Boolean);
  }
}
