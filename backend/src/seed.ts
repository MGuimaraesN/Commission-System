import { PrismaClient, Prisma } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

const BRANDS = ['Apple', 'Samsung', 'Motorola', 'Xiaomi', 'LG'];

// Utils
const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

// Period Helper
const getBiWeeklyPeriodRange = (dateStr: string) => {
    const parts = dateStr.split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const day = parseInt(parts[2]);

    let startDay = 1;
    let endDay = 15;

    if (day > 15) {
      startDay = 16;
      endDay = new Date(year, month + 1, 0).getDate();
    }

    const start = new Date(year, month, startDay);
    const end = new Date(year, month, endDay);

    return { start, end };
};

async function main() {
  console.log("🌱 Starting Advanced Seeding...");

  // 1. Clean Database
  console.log("🧹 Clearing database...");
  await prisma.auditLog.deleteMany();
  await prisma.serviceOrder.deleteMany();
  await prisma.period.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.user.deleteMany();
  await prisma.settings.deleteMany();

  // 2. Settings
  console.log("⚙️ Creating Settings...");
  await prisma.settings.create({
    data: {
      fixedCommissionPercentage: 10,
      companyName: 'Commission System Pro',
    },
  });

  // 3. User
  console.log("👤 Creating Admin User...");
  await prisma.user.create({
    data: {
      email: 'admin@commission.sys',
      name: 'System Admin',
      passwordHash: 'mock_hash_123', // In prod use bcrypt
    }
  });

  // 4. Brands
  console.log("🏷️ Creating Brands...");
  const brandIds: string[] = [];
  for (const name of BRANDS) {
    const b = await prisma.brand.create({ data: { name } });
    brandIds.push(b.id);
  }

  // 5. Periods
  console.log("📅 Creating Periods...");
  const today = new Date();

  // Past Period (Paid)
  const pastDate = addDays(today, -20);
  const pastDateStr = pastDate.toISOString().split('T')[0];
  const pastRange = getBiWeeklyPeriodRange(pastDateStr);

  const pastPeriod = await prisma.period.create({
      data: {
          startDate: pastRange.start,
          endDate: pastRange.end,
          paid: true,
          paidAt: new Date()
      }
  });

  // Current Period (Open)
  const currentDateStr = today.toISOString().split('T')[0];
  const currentRange = getBiWeeklyPeriodRange(currentDateStr);
  const currentPeriod = await prisma.period.create({
    data: {
        startDate: currentRange.start,
        endDate: currentRange.end,
        paid: false
    }
  });

  // Future Period (Open - for testing)
  const futureDate = addDays(today, 20);
  const futureDateStr = futureDate.toISOString().split('T')[0];
  const futureRange = getBiWeeklyPeriodRange(futureDateStr);
  const futurePeriod = await prisma.period.create({
    data: {
        startDate: futureRange.start,
        endDate: futureRange.end,
        paid: false
    }
  });

  const periods = [pastPeriod, currentPeriod, futurePeriod];

  // 6. Orders
  console.log("📦 Creating 20+ Service Orders...");
  const statuses = ['PENDING', 'PAID'];
  const methods = ['PIX', 'CASH', 'CARD', 'TRANSFER'];

  for (let i = 0; i < 25; i++) {
      const isPast = i < 10;
      const period = isPast ? pastPeriod : (i < 20 ? currentPeriod : futurePeriod);
      const brandId = brandIds[i % brandIds.length];
      const serviceValue = 100 + (i * 25.50);
      const commissionValue = new Prisma.Decimal(serviceValue * 0.10);

      // Randomize date within period
      const start = new Date(period.startDate);
      const end = new Date(period.endDate);
      const randomDate = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

      const status = period.paid ? 'PAID' : (Math.random() > 0.7 ? 'PAID' : 'PENDING');
      const paidAt = status === 'PAID' ? new Date() : null;

      await prisma.serviceOrder.create({
          data: {
              osNumber: 1000 + i,
              entryDate: randomDate,
              customerName: `Customer ${i + 1}`,
              serviceValue: serviceValue,
              commissionValue: commissionValue,
              status: status,
              paymentMethod: methods[i % methods.length],
              brandId: brandId,
              periodId: period.id,
              paidAt: paidAt,
              auditLogs: {
                  create: {
                      action: 'CREATED',
                      details: 'Seeded order'
                  }
              }
          }
      });
  }

  // Recalculate Period Totals (Quick & Dirty implementation for seed)
  console.log("🔄 Recalculating Period Totals...");
  for (const p of periods) {
      const aggr = await prisma.serviceOrder.aggregate({
          where: { periodId: p.id },
          _sum: { commissionValue: true, serviceValue: true },
          _count: { id: true }
      });
      await prisma.period.update({
          where: { id: p.id },
          data: {
              totalOrders: aggr._count.id,
              totalCommission: aggr._sum.commissionValue || 0,
              totalServiceValue: aggr._sum.serviceValue || 0
          }
      });
  }

  console.log("✅ Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
