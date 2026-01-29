import { Request, Response } from 'express';
import { prisma } from '../db';

export const exportDatabase = async (req: Request, res: Response) => {
  try {
    const data = {
      brands: await prisma.brand.findMany(),
      periods: await prisma.period.findMany(),
      orders: await prisma.serviceOrder.findMany(),
      settings: await prisma.settings.findMany(),
    };
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao exportar backup' });
  }
};

export const importDatabase = async (req: Request, res: Response) => {
  try {
    const { brands, periods, orders, settings } = req.body;

    // Transação para garantir integridade (apaga o atual e insere o backup)
    await prisma.$transaction([
      prisma.serviceOrder.deleteMany(),
      prisma.brand.deleteMany(),
      prisma.period.deleteMany(),
      prisma.settings.deleteMany(),
      
      prisma.brand.createMany({ data: brands }),
      prisma.period.createMany({ data: periods }),
      prisma.serviceOrder.createMany({ data: orders }),
      prisma.settings.createMany({ data: settings }),
    ]);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao importar backup' });
  }
};