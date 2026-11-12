/**
 * Staff JWT verification. Loads the user from the database on every request.
 * A deleted user, a changed password, or a non-admin role is rejected.
 * Shopify merchant sessions are not staff credentials.
 */
import { PrismaClient } from '@prisma/client';
import { authenticateStaffToken } from '../lib/staffAuth.js';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.warn('[security] JWT_SECRET is not set — staff auth will fail');
}

async function findStaffUser(id) {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, role: true, password: true },
  });
}

export default async function authMiddleware(req, res, next) {
  try {
    const result = await authenticateStaffToken(req.cookies?.token, {
      jwtSecret: JWT_SECRET,
      findUser: findStaffUser,
    });
    if (!result.ok) {
      return res.status(result.status).json({ error: result.error });
    }
    req.user = result.user;
    return next();
  } catch (err) {
    return next(err);
  }
}

/**
 * @deprecated Use the default middleware. Kept so older imports still reject missing users.
 */
export async function attachUser(req, res, next) {
  return authMiddleware(req, res, next);
}
