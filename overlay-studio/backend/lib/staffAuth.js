/**
 * Staff session checks. The dashboard is an Implux staff console.
 * Shopify merchant sessions are a different credential and are not accepted here.
 * Changing the password changes the session version and invalidates older cookies.
 * Rotating JWT_SECRET invalidates every cookie.
 */
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

export const STAFF_SESSION_TTL = '8h';
export const STAFF_COOKIE_MAX_AGE_MS = 8 * 60 * 60 * 1000;
export const STAFF_ROLE = 'admin';

/**
 * @param {string} passwordHash
 */
export function staffPasswordVersion(passwordHash) {
  return crypto.createHash('sha256').update(String(passwordHash)).digest('hex').slice(0, 16);
}

/**
 * @param {{ id: number, email: string, role: string, password: string }} user
 * @param {string} secret
 */
export function signStaffToken(user, secret) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      pv: staffPasswordVersion(user.password),
      aud: 'implux-staff',
    },
    secret,
    { expiresIn: STAFF_SESSION_TTL }
  );
}

/**
 * @param {string | undefined} token
 * @param {string | undefined} secret
 */
export function readStaffToken(token, secret) {
  if (!token || !secret) return { ok: false, reason: 'missing' };
  try {
    const decoded = jwt.verify(token, secret);
    if (!decoded || typeof decoded !== 'object') return { ok: false, reason: 'invalid' };
    const id = Number(decoded.id);
    if (!Number.isInteger(id) || id < 1) return { ok: false, reason: 'invalid' };
    if (decoded.aud !== 'implux-staff' || typeof decoded.pv !== 'string' || !decoded.pv) {
      return { ok: false, reason: 'revoked' };
    }
    return { ok: true, id, email: String(decoded.email || ''), role: String(decoded.role || ''), pv: decoded.pv };
  } catch (err) {
    const name = err && /** @type {{ name?: string }} */ (err).name;
    if (name === 'TokenExpiredError') return { ok: false, reason: 'expired' };
    return { ok: false, reason: 'invalid' };
  }
}

/**
 * @param {{ id: number, email: string, role: string, password: string } | null} user
 * @param {{ pv: string, role: string }} claims
 */
export function staffUserStillAuthorized(user, claims) {
  if (!user) return { ok: false, status: 401, error: 'Not authenticated' };
  if (user.role !== STAFF_ROLE || claims.role !== STAFF_ROLE) {
    return { ok: false, status: 403, error: 'Not authorized' };
  }
  if (staffPasswordVersion(user.password) !== claims.pv) {
    return { ok: false, status: 401, error: 'Not authenticated' };
  }
  return {
    ok: true,
    user: { id: user.id, email: user.email, role: user.role },
  };
}

/**
 * @param {string | undefined} token
 * @param {{ jwtSecret?: string, findUser: (id: number) => Promise<{ id: number, email: string, role: string, password: string } | null> }} deps
 */
export async function authenticateStaffToken(token, deps) {
  const claims = readStaffToken(token, deps.jwtSecret);
  if (!claims.ok) return { ok: false, status: 401, error: 'Not authenticated' };
  const user = await deps.findUser(claims.id);
  return staffUserStillAuthorized(user, claims);
}
