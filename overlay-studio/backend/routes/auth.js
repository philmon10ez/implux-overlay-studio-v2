/**
 * Auth: login (set JWT cookie), logout (clear cookie), me (current user).
 */
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { resolveAppEnv } from '../../shared/appEnv.js';

const router = express.Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;

/** Cookie options for httpOnly JWT auth (use APP_ENV — not NODE_ENV — on Railway/Vercel). */
function authCookieOptions() {
  const appEnv = resolveAppEnv();
  const secure = appEnv !== 'development';
  // Staging admin should call /api via same-origin Vercel rewrite (first-party cookie).
  // Lax works for that. None kept as fallback if a client still hits Railway directly.
  const sameSite =
    appEnv === 'staging' || appEnv === 'preview'
      ? 'lax'
      : appEnv === 'production'
        ? 'lax'
        : 'strict';
  return {
    httpOnly: true,
    secure,
    sameSite,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  };
}

// POST /api/auth/login — accept username or email
router.post('/login', async (req, res, next) => {
  try {
    const { username, email, password } = req.body ?? {};
    const loginId = username ?? email;
    if (!loginId || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    const id = String(loginId).trim().toLowerCase();
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: id, mode: 'insensitive' } },
          { email: id },
        ],
      },
    });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    const match = await bcrypt.compare(String(password), user.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.cookie('token', token, authCookieOptions());
    res.json({
      user: { id: user.id, email: user.email, role: user.role, createdAt: user.createdAt },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', (_req, res) => {
  const { path, httpOnly, secure, sameSite } = authCookieOptions();
  res.clearCookie('token', { path, httpOnly, secure, sameSite });
  res.json({ ok: true });
});

// GET /api/auth/me
router.get('/me', async (req, res, next) => {
  try {
    const token = req.cookies?.token ?? req.cookies?.accessToken;
    if (!token || !JWT_SECRET) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, username: true, email: true, role: true, createdAt: true },
    });
    if (!user) return res.status(401).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    next(err);
  }
});

export default router;
