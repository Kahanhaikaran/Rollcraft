import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
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

    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const groupBy = req.query.groupBy === 'category';

    const itemWhere: Prisma.ItemWhereInput = { isActive: true };
    if (q) itemWhere.name = { contains: q, mode: 'insensitive' };
    if (category) itemWhere.category = category;

    const rows = await prisma.kitchenStock.findMany({
      where: {
        kitchenId,
        item: itemWhere,
      },
      include: { item: true },
      orderBy: [{ item: { category: 'asc' } }, { item: { name: 'asc' } }],
    });

    if (groupBy) {
      const groups: Record<string, typeof rows> = {};
      for (const row of rows) {
        const cat = row.item.category ?? 'UNCATEGORIZED';
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(row);
      }
      return res.json({ ok: true, kitchenId, stock: rows, grouped: groups });
    }

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

const consumptionSchema = z.object({
  kitchenId: z.string().min(1),
  lines: z
    .array(
      z.object({
        itemId: z.string().min(1),
        qty: z.number().positive(),
      }),
    )
    .min(1),
  reason: z.string().optional(),
});

stockRouter.post('/stock/adjustments', requireAuth, requireRoleAtLeast(Role.STOREKEEPER), async (req, res, next) => {
  try {
    const body = adjustmentSchema.parse(req.body);

    const item = await prisma.item.findUnique({ where: { id: body.itemId } });
    if (!item) throw new HttpError(404, 'ItemNotFound');

    const result = await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<
        { onHandQty: number; avgCost: number }[]
      >`SELECT "onHandQty", "avgCost" FROM "KitchenStock" WHERE "kitchenId" = ${body.kitchenId} AND "itemId" = ${body.itemId} FOR UPDATE`;
      const current = locked[0];
      const curQty = current?.onHandQty ?? 0;
      const onHandQty = curQty + body.qtyDelta;
      if (onHandQty < 0) throw new HttpError(400, 'InsufficientStock');

      await tx.stockLedger.create({
        data: {
          kitchenId: body.kitchenId,
          itemId: body.itemId,
          type: body.type as 'ADJUSTMENT' | 'WASTAGE',
          qtyDelta: body.qtyDelta,
          refType: 'STOCK_ADJUSTMENT',
          refId: null,
          createdByUserId: req.user?.id ?? null,
        },
      });

      const nextStock = await tx.kitchenStock.upsert({
        where: { kitchenId_itemId: { kitchenId: body.kitchenId, itemId: body.itemId } },
        create: { kitchenId: body.kitchenId, itemId: body.itemId, onHandQty, avgCost: current?.avgCost ?? 0 },
        update: { onHandQty },
      });

      return { nextStock };
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

stockRouter.post('/stock/consumption', requireAuth, requireRoleAtLeast(Role.STOREKEEPER), async (req, res, next) => {
  try {
    const body = consumptionSchema.parse(req.body);

    await prisma.$transaction(async (tx) => {
      for (const line of body.lines) {
        const item = await tx.item.findUnique({ where: { id: line.itemId } });
        if (!item) throw new HttpError(404, 'ItemNotFound');

        const locked = await tx.$queryRaw<
          { onHandQty: number; avgCost: number }[]
        >`SELECT "onHandQty", "avgCost" FROM "KitchenStock" WHERE "kitchenId" = ${body.kitchenId} AND "itemId" = ${line.itemId} FOR UPDATE`;
        const current = locked[0];
        const curQty = current?.onHandQty ?? 0;
        const onHandQty = curQty - line.qty;
        if (onHandQty < 0) throw new HttpError(400, 'InsufficientStock', `${item.name}: need ${line.qty} ${item.uom}, only ${curQty} on hand`);

        await tx.stockLedger.create({
          data: {
            kitchenId: body.kitchenId,
            itemId: line.itemId,
            type: 'CONSUMPTION',
            qtyDelta: -line.qty,
            unitCost: current?.avgCost ?? null,
            refType: 'CONSUMPTION',
            refId: null,
            createdByUserId: req.user?.id ?? null,
          },
        });

        await tx.kitchenStock.upsert({
          where: { kitchenId_itemId: { kitchenId: body.kitchenId, itemId: line.itemId } },
          create: { kitchenId: body.kitchenId, itemId: line.itemId, onHandQty, avgCost: current?.avgCost ?? 0 },
          update: { onHandQty },
        });
      }
    });

    await auditLog({
      actorUserId: req.user?.id,
      action: 'STOCK_CONSUMPTION',
      entityType: 'StockLedger',
      entityId: body.kitchenId,
      meta: body,
    });

    res.json({ ok: true, recorded: body.lines.length });
  } catch (err) {
    next(err);
  }
});

