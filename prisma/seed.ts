import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import process from 'process';

const prisma = new PrismaClient();

async function main() {
  await prisma.systemConfig.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      maxConcurrentContainers: 10,
      rateLimitAttempts: 3,
      rateLimitWindowMinutes: 10,
      containerTimeoutMinutes: 30,
    },
  });
  console.log('Created SystemConfig with id=1');

  const adminPassword = await bcrypt.hash('ChangeMe123!', 12);
  await prisma.user.upsert({
    where: { universityId: 'ADMIN001' },
    update: {},
    create: {
      universityId: 'ADMIN001',
      name: 'SEU Admin',
      email: 'admin@seu.edu.sa',
      passwordHash: adminPassword,
      role: Role.ADMIN,
    },
  });
  console.log('Created ADMIN user');

  const teacherPassword = await bcrypt.hash('ChangeMe123!', 12);
  await prisma.user.upsert({
    where: { universityId: 'TEACHER001' },
    update: {},
    create: {
      universityId: 'TEACHER001',
      name: 'SEU Teacher',
      email: 'teacher@seu.edu.sa',
      passwordHash: teacherPassword,
      role: Role.TEACHER,
    },
  });
  console.log('Created TEACHER user');
}

main()
  .catch((e) => {
    console.log(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });