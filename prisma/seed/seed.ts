import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../../lib/auth';

const prisma = new PrismaClient();

async function main() {
  // Check if admin exists
  const existingAdmin = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
  });

  if (existingAdmin) {
    console.log('Admin user already exists');
    return;
  }

  // Create admin user
  const adminPassword = await hashPassword('admin123');
  
  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      password: adminPassword,
      fullName: 'Administrator',
      role: 'ADMIN',
      isActive: true,
    },
  });

  console.log('Admin user created:');
  console.log('Username: admin');
  console.log('Password: admin123');
  console.log('Please change the password after first login!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
