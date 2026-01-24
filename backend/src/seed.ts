import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
  // Seed Settings
  const settings = await prisma.settings.findFirst();
  if (!settings) {
    await prisma.settings.create({
      data: {
        fixedCommissionPercentage: 10,
        companyName: 'My Commission System',
      },
    });
    console.log('Settings seeded');
  }

  // Seed Brands
  const defaultBrands = ['Samsung', 'Apple', 'LG', 'Motorola'];
  for (const name of defaultBrands) {
    const existing = await prisma.brand.findUnique({ where: { name } });
    if (!existing) {
      await prisma.brand.create({
        data: { name },
      });
      console.log(`Brand ${name} seeded`);
    }
  }

  // Seed Default User (Optional but good for testing)
  const user = await prisma.user.findUnique({ where: { email: 'admin@system.com' } });
  if (!user) {
    await prisma.user.create({
      data: {
        email: 'admin@system.com',
        name: 'Admin',
        passwordHash: 'hashedpassword', // In real app, hash this
      }
    });
    console.log('Admin user seeded');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
