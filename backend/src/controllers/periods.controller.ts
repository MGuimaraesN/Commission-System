import { Request, Response } from 'express';
import { prisma } from '../db';

export const getPeriods = async (req: Request, res: Response) => {
  const periods = await prisma.period.findMany({
    orderBy: { startDate: 'desc' }
  });
  res.json(periods);
};

export const payPeriod = async (req: Request, res: Response): Promise<any> => {
  const id = req.params.id as string;
  try {
    const period = await prisma.period.findUnique({ where: { id } });
    if (!period) return res.status(404).json({ error: "Period not found" });
    if (period.paid) return res.status(400).json({ error: "Period already paid" });

    const now = new Date();

    // Transaction to ensure consistency
    await prisma.$transaction(async (tx) => {
      // 1. Mark Period as Paid
      await tx.period.update({
        where: { id },
        data: {
          paid: true,
          paidAt: now
        }
      });

      // 2. Mark Orders as Paid
      const ordersToUpdate = await tx.serviceOrder.findMany({
        where: { periodId: id, status: { not: 'PAID' } }
      });

      if (ordersToUpdate.length > 0) {
        await tx.serviceOrder.updateMany({
            where: { periodId: id, status: { not: 'PAID' } },
            data: {
                status: 'PAID',
                paidAt: now
            }
        });

        // 3. Create Audit Logs
        // Prisma createMany doesn't support relation connections efficiently in some DBs,
        // but for AuditLog we need userId? We'll skip userId or set system default if allowed.
        // We'll just create a log for the Period action? Or per order?
        // DataService created "STATUS_CHANGE" log per order.
        // That's a lot of logs if many orders.
        // But requested logic "Replica EXATAMENTE".
        // We can batch create logs.

        const logs = ordersToUpdate.map(o => ({
            action: 'STATUS_CHANGE',
            details: 'Period closed and paid',
            timestamp: now,
            serviceOrderId: o.id
            // userId?
        }));

        await tx.auditLog.createMany({
            data: logs
        });
      }
    });

    res.json({ success: true });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};
