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
    await prisma.$transaction(async (tx: any) => {
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

        const logs = ordersToUpdate.map((o: any) => ({
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

export const createPeriod = async (req: Request, res: Response): Promise<any> => {
    try {
        const { startDate, endDate } = req.body;
        // Basic Validation
        if (!startDate || !endDate) return res.status(400).json({ error: "Dates required" });

        const start = new Date(startDate);
        const end = new Date(endDate);

        // Check overlap? For now, just create.
        // Or unique constraint might trigger if same dates.

        const period = await prisma.period.create({
            data: {
                startDate: start,
                endDate: end,
                paid: false
            }
        });
        res.json(period);
    } catch(e: any) {
        res.status(500).json({ error: e.message });
    }
};

export const updatePeriod = async (req: Request, res: Response): Promise<any> => {
    const id = req.params.id as string;
    try {
        const { startDate, endDate } = req.body;
        const data: any = {};
        if (startDate) data.startDate = new Date(startDate);
        if (endDate) data.endDate = new Date(endDate);

        const period = await prisma.period.update({
            where: { id },
            data
        });
        res.json(period);
    } catch(e: any) {
        res.status(500).json({ error: e.message });
    }
};
