import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { email: true, role: true, status: true, passwordHash: true },
  });
  console.log('userCount', users.length);
  for (const u of users) {
    const ok = await bcrypt.compare('Password123!', u.passwordHash);
    console.log(u.email, u.role, u.status, 'passwordOk=', ok);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
