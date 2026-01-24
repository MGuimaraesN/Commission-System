import { Request, Response } from 'express';
import { prisma } from '../db';

export const getDashboard = async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const startOfCurrentMonth = new Date(currentYear, currentMonth, 1);
    const startOfNextMonth = new Date(currentYear, currentMonth + 1, 1);
    const startOfPrevMonth = new Date(currentYear, currentMonth - 1, 1);

    // Current Month Stats
    const currentStats = await prisma.serviceOrder.aggregate({
      where: {
        entryDate: {
          gte: startOfCurrentMonth,
          lt: startOfNextMonth
        }
      },
      _sum: {
        commissionValue: true
      }
    });

    const currentPaid = await prisma.serviceOrder.aggregate({
      where: {
        entryDate: { gte: startOfCurrentMonth, lt: startOfNextMonth },
        status: 'PAID'
      },
      _sum: { commissionValue: true }
    });

    const currentPending = await prisma.serviceOrder.aggregate({
      where: {
        entryDate: { gte: startOfCurrentMonth, lt: startOfNextMonth },
        status: 'PENDING'
      },
      _sum: { commissionValue: true }
    });

    // Prev Month Stats
    const prevStats = await prisma.serviceOrder.aggregate({
      where: {
        entryDate: {
          gte: startOfPrevMonth,
          lt: startOfCurrentMonth
        }
      },
      _sum: {
        commissionValue: true
      }
    });

    const currentTotal = Number(currentStats._sum.commissionValue || 0);
    const prevTotal = Number(prevStats._sum.commissionValue || 0);

    const growth = prevTotal === 0 ? 100 : ((currentTotal - prevTotal) / prevTotal) * 100;

    // Rankings (Top 5 Brands by Commission)
    const brandRankings = await prisma.serviceOrder.groupBy({
      by: ['brandId'],
      _sum: {
        commissionValue: true
      },
      orderBy: {
        _sum: {
          commissionValue: 'desc'
        }
      },
      take: 5
    });

    // Need to join Brand Names manually or via separate query as groupBy doesn't support include
    const brandIds = brandRankings.map(b => b.brandId);
    const brands = await prisma.brand.findMany({
        where: { id: { in: brandIds } }
    });

    const topBrands = brandRankings.map(r => {
        const brand = brands.find(b => b.id === r.brandId);
        return {
            name: brand?.name || 'Unknown',
            value: Number(r._sum.commissionValue || 0)
        };
    });

    // Top Customers
    const customerRankings = await prisma.serviceOrder.groupBy({
        by: ['customerName'],
        _sum: { serviceValue: true },
        orderBy: { _sum: { serviceValue: 'desc' } },
        take: 5
    });

    const topCustomers = customerRankings.map(r => ({
        name: r.customerName,
        value: Number(r._sum.serviceValue || 0)
    }));

    res.json({
        monthlyStats: {
            currentMonth: {
                total: currentTotal,
                paid: Number(currentPaid._sum.commissionValue || 0),
                pending: Number(currentPending._sum.commissionValue || 0)
            },
            prevMonth: {
                total: prevTotal
            },
            growth
        },
        rankings: {
            topBrands,
            topCustomers
        }
    });

  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};
