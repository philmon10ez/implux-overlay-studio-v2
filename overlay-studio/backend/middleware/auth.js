/**
 * JWT verification from httpOnly cookie.
 * Expects cookie name: token (or similar). Attaches req.user = { id, email, role }.
 */
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.warn('JWT_SECRET is not set — auth will fail');
}

export default function authMiddleware(req, res, next) {
  const token = req.cookies?.token ?? req.cookies?.accessToken;

  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { id, email, role } = decoded;
    if (!id || !email) {
      return res.status(401).json({ error: 'Invalid token payload' });
    }
    req.user = { id, email, role };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Optional: load full user from DB and attach to req.user
 */
export async function attachUser(req, res, next) {
  if (!req.user?.id) return next();
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, role: true, createdAt: true },
    });
    if (user) req.user = user;
  } catch (_) {}
  next();
}
