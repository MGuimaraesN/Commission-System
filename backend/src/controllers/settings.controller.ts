import { Request, Response } from 'express';
import { prisma } from '../db';

export const getSettings = async (req: Request, res: Response) => {
  const settings = await prisma.settings.findFirst();
  res.json(settings || {});
};

export const updateSettings = async (req: Request, res: Response) => {
  const settings = await prisma.settings.findFirst();
  if (settings) {
    const updated = await prisma.settings.update({
      where: { id: settings.id },
      data: req.body
    });
    res.json(updated);
  } else {
    // Should not happen if seeded, but handle it
    const newSettings = await prisma.settings.create({
      data: req.body
    });
    res.json(newSettings);
  }
};
