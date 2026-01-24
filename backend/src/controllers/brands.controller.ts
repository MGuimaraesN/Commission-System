import { Request, Response } from 'express';
import { prisma } from '../db';

export const getBrands = async (req: Request, res: Response) => {
  const brands = await prisma.brand.findMany({ orderBy: { name: 'asc' } });
  res.json(brands);
};

export const createBrand = async (req: Request, res: Response): Promise<any> => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Name required" });

    const existing = await prisma.brand.findUnique({ where: { name } });
    if (existing) return res.status(400).json({ error: "Brand exists" });

    const brand = await prisma.brand.create({ data: { name } });
    res.json(brand);
};

export const deleteBrand = async (req: Request, res: Response) => {
    const id = req.params.id as string;
    try {
        await prisma.brand.delete({ where: { id } });
        res.json({ success: true });
    } catch (e) {
        res.status(400).json({ error: "Cannot delete brand (likely used in orders)" });
    }
}
