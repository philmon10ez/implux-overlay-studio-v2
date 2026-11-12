/**
 * Auth: login (set JWT cookie), logout (clear cookie), me (current user).
 * Staff accounts only. Shopify merchant sessions are not accepted.
 */
import express from 'express';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { resolveAppEnv } from '../../shared/appEnv.js';
import { clientAddress } from '../lib/rateLimit.js';
import {
  STAFF_COOKIE_MAX_AGE_MS,
  authenticateStaffToken,
  signStaffToken,
} from '../lib/staffAuth.js';
import { scrubErrorForLog } from '../../shared/safeLog.js';

const router = express.Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;

export const INVALID_LOGIN = { error: 'Invalid username or password' };

/** @type {string | null} */
let dummyPasswordHash = null;

function positiveInt(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function loginLimit() {
  return positiveInt(process.env.LOGIN_RATE_LIMIT, 20);
}

function loginWindowMs() {
  return positiveInt(process.env.LOGIN_RATE_WINDOW_MS, 60 * 1000);
}

async function timingPadHash() {
  if (!dummyPasswordHash) {
    dummyPasswordHash = await bcrypt.hash('timing-pad-not-a-credential', 10);
  }
  return dummyPasswordHash;
}

/** Cookie options for httpOnly JWT auth (use APP_ENV — not NODE_ENV — on Railway/Vercel). */
export function authCookieOptions() {
  const appEnv = resolveAppEnv();
  const secure = appEnv !== 'development';
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge: STAFF_COOKIE_MAX_AGE_MS,
    path: '/',
  };
}

async function completeLogin(input) {
  if (!input.secret) {
    return { status: 503, body: { error: 'Authentication is not configured' } };
  }
  const { username, email, password } = input.body ?? {};
  const loginId = username ?? email;
  if (!loginId || typeof password !== 'string' || !password) {
    return { status: 400, body: { error: 'Username and password required' } };
  }
  const id = String(loginId).trim().toLowerCase();
  if (!id || id.length > 320) {
    return { status: 401, body: INVALID_LOGIN };
  }
  const user = await input.db.user.findFirst({
    where: {
      OR: [{ username: { equals: id, mode: 'insensitive' } }, { email: id }],
    },
  });
  const hash = user?.password || (await timingPadHash());
  const match = await bcrypt.compare(password, hash);
  if (!user || !match || user.role !== 'admin') {
    return { status: 401, body: INVALID_LOGIN };
  }
  return {
    status: 200,
    body: { user: { id: user.id, email: user.email, role: user.role, createdAt: user.createdAt } },
    token: signStaffToken(user, input.secret),
  };
}

/**
 * Rate limit that reads LOGIN_RATE_LIMIT on each attempt.
 */
export function createLoginGuard() {
  const buckets = new Map();
  return {
    /**
     * @param {string} address
     * @param {number} [now]
     */
    consume(address, now = Date.now()) {
      const limit = loginLimit();
      const windowMs = loginWindowMs();
      const stamps = (buckets.get(address) || []).filter((stamp) => now - stamp < windowMs);
      if (stamps.length >= limit) {
        buckets.set(address, stamps);
        return { ok: false, retryAfterMs: Math.max(0, windowMs - (now - stamps[0])) };
      }
      stamps.push(now);
      buckets.set(address, stamps);
      return { ok: true, retryAfterMs: 0 };
    },
    reset() {
      buckets.clear();
    },
  };
}

export const loginGuard = createLoginGuard();

router.post('/login', async (req, res, next) => {
  try {
    const limit = loginGuard.consume(clientAddress(req));
    if (!limit.ok) {
      res.setHeader('Retry-After', String(Math.ceil(limit.retryAfterMs / 1000)));
      console.warn('[security] login_rate_limited');
      return res.status(429).json({ error: 'Too many attempts. Try again later.' });
    }
    const result = await completeLogin({
      body: req.body,
      address: clientAddress(req),
      db: prisma,
      secret: JWT_SECRET,
    });
    if (result.status === 401) console.warn('[security] login_failure');
    if (result.token) res.cookie('token', result.token, authCookieOptions());
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('[security] login_error', scrubErrorForLog(err));
    return next(err);
  }
});

router.post('/logout', (_req, res) => {
  const { path, httpOnly, secure, sameSite } = authCookieOptions();
  res.clearCookie('token', { path, httpOnly, secure, sameSite });
  res.json({ ok: true });
});

router.get('/me', async (req, res, next) => {
  try {
    const result = await authenticateStaffToken(req.cookies?.token, {
      jwtSecret: JWT_SECRET,
      findUser: (id) =>
        prisma.user.findUnique({
          where: { id },
          select: { id: true, email: true, role: true, password: true },
        }),
    });
    if (!result.ok) return res.status(result.status).json({ error: result.error });
    const user = await prisma.user.findUnique({
      where: { id: result.user.id },
      select: { id: true, username: true, email: true, role: true, createdAt: true },
    });
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
    res.setHeader('Cache-Control', 'no-store');
    return res.json({ user });
  } catch (err) {
    return next(err);
  }
});

export { completeLogin };
export default router;
