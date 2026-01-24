import { z } from 'zod';

export const createOrderSchema = z.object({
  osNumber: z.number().int().positive(),
  entryDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)), // ISO or YYYY-MM-DD
  customerName: z.string().min(1),
  brandId: z.string().uuid().or(z.string().min(1)), // Accepting UUID or whatever ID
  serviceValue: z.number().positive(),
  paymentMethod: z.string().optional(),
});

export const updateOrderSchema = z.object({
  osNumber: z.number().int().positive().optional(),
  entryDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  customerName: z.string().min(1).optional(),
  brandId: z.string().optional(),
  serviceValue: z.number().positive().optional(),
  paymentMethod: z.string().optional(),
  status: z.enum(['PENDING', 'PAID']).optional(),
});
