import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { requireRoleAtLeast, Role } from '../auth/rbac.js';
import { auditLog } from '../audit/audit.js';

export const itemsRouter = Router();

/** Categories for cloud kitchen inventory */
export const ITEM_CATEGORIES = [
  'BASE_CORE',
  'VEG_FILLINGS',
  'NON_VEG',
  'MOMOS_SPECIFIC',
  'ROLLS_WRAPS',
  'SPICES_MASALA',
  'SAUCES',
  'OILS_FATS',
  'PACKAGING',
  'MISC',
] as const;

itemsRouter.get('/items/categories', requireAuth, async (_req, res) => {
  const categories = await prisma.item.findMany({
    where: { isActive: true, category: { not: null } },
    select: { category: true },
    distinct: ['category'],
    orderBy: { category: 'asc' },
  });
  const list = [...new Set(categories.map((c) => c.category).filter(Boolean))] as string[];
  res.json({ ok: true, categories: list });
});

itemsRouter.get('/items', requireAuth, async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const category = typeof req.query.category === 'string' ? req.query.category : undefined;
  const groupBy = req.query.groupBy === 'category';
  const isActive = req.query.isActive !== 'false';

  const where: Prisma.ItemWhereInput = { isActive };
  if (q) {
    where.name = { contains: q, mode: 'insensitive' };
  }
  if (category) {
    where.category = category;
  }

  const items = await prisma.item.findMany({
    where,
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });

  if (groupBy) {
    const groups: Record<string, typeof items> = {};
    for (const item of items) {
      const cat = item.category ?? 'UNCATEGORIZED';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    }
    return res.json({ ok: true, items, grouped: groups });
  }

  res.json({ ok: true, items });
});

const upsertSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1).optional(),
  uom: z.string().min(1),
  reorderPoint: z.number().min(0).default(0),
  isActive: z.boolean().default(true),
});

itemsRouter.post('/items', requireAuth, requireRoleAtLeast(Role.MANAGER), async (req, res, next) => {
  try {
    const body = upsertSchema.parse(req.body);
    const item = await prisma.item.create({
      data: {
        name: body.name,
        category: body.category ?? null,
        uom: body.uom,
        reorderPoint: body.reorderPoint,
        isActive: body.isActive,
      },
    });
    await auditLog({ actorUserId: req.user?.id, action: 'ITEM_CREATE', entityType: 'Item', entityId: item.id, meta: body });
    res.json({ ok: true, item });
  } catch (err) {
    next(err);
  }
});

