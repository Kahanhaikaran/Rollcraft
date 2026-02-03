import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma.js';
import { HttpError } from '../../lib/http.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { requireRoleAtLeast, Role } from '../auth/rbac.js';
import { auditLog } from '../audit/audit.js';

export const stockRouter = Router();

stockRouter.get('/stock', requireAuth, async (req, res, next) => {
  try {
    const kitchenId = typeof req.query.kitchenId === 'string' ? req.query.kitchenId : req.user?.kitchenId;
    if (!kitchenId) throw new HttpError(400, 'ValidationError', 'kitchenId is required');

    const rows = await prisma.kitchenStock.findMany({
      where: { kitchenId },
      include: { item: true },
      orderBy: { item: { name: 'asc' } },
    });
    res.json({ ok: true, kitchenId, stock: rows });
  } catch (err) {
    next(err);
  }
});

const adjustmentSchema = z.object({
  kitchenId: z.string().min(1),
  itemId: z.string().min(1),
  qtyDelta: z.number(),
  reason: z.string().min(1).optional(),
  type: z.enum(['ADJUSTMENT', 'WASTAGE']).default('ADJUSTMENT'),
});

stockRouter.post('/stock/adjustments', requireAuth, requireRoleAtLeast(Role.STOREKEEPER), async (req, res, next) => {
  try {
    const body = adjustmentSchema.parse(req.body);

    const item = await prisma.item.findUnique({ where: { id: body.itemId } });
    if (!item) throw new HttpError(404, 'ItemNotFound');

    const result = await prisma.$transaction(async (tx) => {
      const ledger = await tx.stockLedger.create({
        data: {
          kitchenId: body.kitchenId,
          itemId: body.itemId,
          type: body.type as any,
          qtyDelta: body.qtyDelta,
          refType: 'STOCK_ADJUSTMENT',
          refId: null,
          createdByUserId: req.user?.id ?? null,
        },
      });

      const current = await tx.kitchenStock.findUnique({
        where: { kitchenId_itemId: { kitchenId: body.kitchenId, itemId: body.itemId } },
      });
      const onHandQty = (current?.onHandQty ?? 0) + body.qtyDelta;
      if (onHandQty < 0) throw new HttpError(400, 'InsufficientStock');

      const nextStock = await tx.kitchenStock.upsert({
        where: { kitchenId_itemId: { kitchenId: body.kitchenId, itemId: body.itemId } },
        create: { kitchenId: body.kitchenId, itemId: body.itemId, onHandQty, avgCost: current?.avgCost ?? 0 },
        update: { onHandQty },
      });

      return { ledger, nextStock };
    });

    await auditLog({
      actorUserId: req.user?.id,
      action: 'STOCK_ADJUST',
      entityType: 'KitchenStock',
      entityId: `${body.kitchenId}:${body.itemId}`,
      meta: body,
    });

    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
});

