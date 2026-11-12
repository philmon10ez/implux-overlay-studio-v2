/**
 * Optional first-time staff bootstrap. Never overwrites an existing password.
 * Refuses to run on staging or production unless an operator sets ALLOW_ADMIN_BOOTSTRAP=YES
 * and supplies ADMIN_BOOTSTRAP_PASSWORD out of band. The password is not logged.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const ADMIN_EMAIL = 'admin@implux.io';

async function main() {
  const appEnv = String(process.env.APP_ENV || 'development').trim().toLowerCase();
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  const deployed = appEnv === 'production' || appEnv === 'staging' || appEnv === 'preview';

  if (!password) {
    console.log('Seed skipped: ADMIN_BOOTSTRAP_PASSWORD is not set. No user was created or modified.');
    return;
  }
  if (deployed && process.env.ALLOW_ADMIN_BOOTSTRAP !== 'YES') {
    console.error(
      'Refusing to bootstrap a staff user on staging or production. Set the password directly in the database.'
    );
    process.exitCode = 1;
    return;
  }
  if (String(password).length < 16) {
    console.error('ADMIN_BOOTSTRAP_PASSWORD must be at least 16 characters.');
    process.exitCode = 1;
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL }, select: { id: true } });
  if (existing) {
    console.log('Seed skipped: staff user already exists. The password was not changed.');
    return;
  }

  const hashedPassword = await bcrypt.hash(String(password), 12);
  await prisma.user.create({
    data: {
      username: 'admin',
      email: ADMIN_EMAIL,
      password: hashedPassword,
      role: 'admin',
    },
  });
  console.log('Seed completed: initial staff user created. The password was not printed.');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err?.code || err?.name || 'error');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
