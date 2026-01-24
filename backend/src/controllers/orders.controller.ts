import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { createOrderSchema, updateOrderSchema } from '../schemas';
import { getBiWeeklyPeriodRange } from '../utils/period.utils';

// Helper to ensure period exists
const ensurePeriodExists = async (dateStr: string) => {
  const { start, end } = getBiWeeklyPeriodRange(dateStr);

  // Try to find
  let period = await prisma.period.findFirst({
    where: {
      startDate: start,
      endDate: end
    }
  });

  if (!period) {
    period = await prisma.period.create({
      data: {
        startDate: start,
        endDate: end,
        paid: false
      }
    });
  }
  return period;
};

// Helper to recalculate period totals
const recalculatePeriodTotals = async (periodId: string) => {
  const aggregations = await prisma.serviceOrder.aggregate({
    where: { periodId },
    _sum: {
      commissionValue: true,
      serviceValue: true,
    },
    _count: {
      id: true
    }
  });

  await prisma.period.update({
    where: { id: periodId },
    data: {
      totalOrders: aggregations._count.id,
      totalCommission: aggregations._sum.commissionValue || 0,
      totalServiceValue: aggregations._sum.serviceValue || 0
    }
  });
};

export const createOrder = async (req: Request, res: Response): Promise<any> => {
  try {
    const validation = createOrderSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }
    const data = validation.data;

    // 1. Period Logic
    const entryDateStr = new Date(data.entryDate).toISOString().split('T')[0];
    const period = await ensurePeriodExists(entryDateStr);

    if (period.paid) {
      return res.status(400).json({ error: "Cannot add orders to a paid period." });
    }

    // 2. Resolve Brand (Name or ID)
    let brandId = data.brandId;
    // Check if it's a UUID or existing ID, if not treat as name
    const brandCheck = await prisma.brand.findUnique({ where: { id: brandId } });
    if (!brandCheck) {
        // Try to find by name
        const brandByName = await prisma.brand.findUnique({ where: { name: brandId } });
        if (brandByName) {
            brandId = brandByName.id;
        } else {
            // Optional: Create brand if not exists? Or Error?
            // Prompt implied Brand is managed. Let's assume error if not found to be safe,
            // or create it to mimic dataService "lazy" behavior?
            // dataService adds brand if not exists in 'addBrand' but 'createOrder' takes a brand string.
            // We will assume valid ID is sent or strictly valid Name.
            // Let's create it if missing to be user-friendly during migration
            const newBrand = await prisma.brand.create({ data: { name: brandId } });
            brandId = newBrand.id;
        }
    }

    // 3. Commission Logic
    const settings = await prisma.settings.findFirst();
    const percentage = settings?.fixedCommissionPercentage || 10;
    const commissionValue = new Prisma.Decimal((data.serviceValue * Number(percentage)) / 100);

    // 4. Create Order
    const newOrder = await prisma.serviceOrder.create({
      data: {
        osNumber: data.osNumber,
        entryDate: new Date(data.entryDate),
        customerName: data.customerName,
        serviceValue: data.serviceValue,
        commissionValue,
        status: 'PENDING',
        paymentMethod: data.paymentMethod,
        periodId: period.id,
        brandId: brandId,
        auditLogs: {
            create: {
                action: 'CREATED',
                details: `Order created with value ${data.serviceValue}`,
                // userId: req.user?.id // Needs middleware
            }
        }
      }
    });

    // 5. Update Totals
    await recalculatePeriodTotals(period.id);

    return res.status(201).json(newOrder);

  } catch (e: any) {
    console.error(e);
    // Unique constraint on OS Number
    if (e.code === 'P2002') return res.status(400).json({ error: "OS Number already exists" });
    return res.status(500).json({ error: e.message });
  }
};

export const updateOrder = async (req: Request, res: Response): Promise<any> => {
  const id = req.params.id as string;
  try {
    const validation = updateOrderSchema.safeParse(req.body);
    if (!validation.success) return res.status(400).json({ error: validation.error });
    const updates = validation.data;

    const existingOrder = await prisma.serviceOrder.findUnique({
        where: { id },
        include: { period: true }
    });
    if (!existingOrder) return res.status(404).json({ error: "Order not found" });

    if (existingOrder.status === 'PAID') {
        return res.status(400).json({ error: "Cannot edit a PAID order" });
    }
    if (existingOrder.period.paid) {
        return res.status(400).json({ error: "Cannot edit orders in a paid period" });
    }

    // Prepare data
    const dataToUpdate: any = { ...updates };
    let newPeriodId = existingOrder.periodId;
    let newCommission = existingOrder.commissionValue;

    // Check Date Change -> Period Change
    if (updates.entryDate) {
        const dateStr = new Date(updates.entryDate).toISOString().split('T')[0];
        const newPeriod = await ensurePeriodExists(dateStr);
        if (newPeriod.paid) {
            return res.status(400).json({ error: "Cannot move order to a paid period" });
        }
        newPeriodId = newPeriod.id;
        dataToUpdate.periodId = newPeriodId;
    }

    // Check Value Change -> Commission Change
    if (updates.serviceValue !== undefined) {
        const settings = await prisma.settings.findFirst();
        const percentage = settings?.fixedCommissionPercentage || 10;
        newCommission = new Prisma.Decimal((Number(updates.serviceValue) * Number(percentage)) / 100);
        dataToUpdate.commissionValue = newCommission;
    }

    // Status Change
    if (updates.status === 'PAID' && existingOrder.status !== 'PAID') {
        dataToUpdate.paidAt = new Date();
    } else if (updates.status === 'PENDING') {
        dataToUpdate.paidAt = null;
    }

    // Brand Resolution (if updated)
    if (updates.brandId) {
       let bId = updates.brandId;
       const bCheck = await prisma.brand.findUnique({ where: { id: bId } });
       if (!bCheck) {
           const bName = await prisma.brand.findUnique({ where: { name: bId } });
           if (bName) bId = bName.id;
           else {
               // Create if not exists (lazy)
               const newB = await prisma.brand.create({ data: { name: bId } });
               bId = newB.id;
           }
       }
       dataToUpdate.brandId = bId;
    }

    // Audit Log Construction
    const changes: string[] = [];
    if (updates.serviceValue) changes.push(`Value: ${existingOrder.serviceValue} -> ${updates.serviceValue}`);
    if (updates.status) changes.push(`Status: ${existingOrder.status} -> ${updates.status}`);
    // ... add more as needed

    const updatedOrder = await prisma.serviceOrder.update({
        where: { id },
        data: {
            ...dataToUpdate,
            auditLogs: {
                create: {
                    action: 'UPDATED',
                    details: changes.join(', ') || 'Updated details'
                }
            }
        }
    });

    // Recalculate totals
    await recalculatePeriodTotals(existingOrder.periodId);
    if (newPeriodId !== existingOrder.periodId) {
        await recalculatePeriodTotals(newPeriodId);
    }

    return res.json(updatedOrder);

  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
};

export const getOrders = async (req: Request, res: Response) => {
    const orders = await prisma.serviceOrder.findMany({
        include: { brand: true, period: true, auditLogs: true },
        orderBy: { createdAt: 'desc' }
    });
    // Map brand name to flattened structure if needed by frontend
    const mapped = orders.map(o => ({
        ...o,
        brand: o.brand.name,
        brandId: o.brandId,
        history: o.auditLogs // Map for frontend compatibility
    }));
    res.json(mapped);
};

export const deleteOrder = async (req: Request, res: Response): Promise<any> => {
    const id = req.params.id as string;
    try {
        const order = await prisma.serviceOrder.findUnique({ where: { id }, include: { period: true } });
        if (!order) return res.status(404).json({ error: "Not found" });

        if (order.status === 'PAID') return res.status(400).json({ error: "Cannot delete PAID order" });
        if (order.period.paid) return res.status(400).json({ error: "Cannot delete from PAID period" });

        // Delete audit logs first? Cascade? Prisma usually handles cascade if configured,
        // but schema didn't specify cascade delete.
        // Actually, schema doesn't have onDelete: Cascade.
        // We should delete logs or allow cascade.
        // Let's delete logs manually for safety here.
        await prisma.auditLog.deleteMany({ where: { serviceOrderId: id } });

        await prisma.serviceOrder.delete({ where: { id } });
        await recalculatePeriodTotals(order.periodId);

        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
}
