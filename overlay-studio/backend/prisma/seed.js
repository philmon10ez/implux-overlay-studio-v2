import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@implux.io' },
    update: {},
    create: {
      email: 'admin@implux.io',
      password: hashedPassword,
      role: 'admin',
    },
  });

  console.log('Seed completed: admin user created (admin@implux.io)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
