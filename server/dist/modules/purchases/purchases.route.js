import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma.js';
import { HttpError } from '../../lib/http.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { requireRoleAtLeast, Role } from '../auth/rbac.js';
import { auditLog } from '../audit/audit.js';
export const purchasesRouter = Router();
// Suppliers
const supplierSchema = z.object({
    name: z.string().min(1),
    contact: z.string().min(1).optional(),
});
purchasesRouter.get('/suppliers', requireAuth, requireRoleAtLeast(Role.STOREKEEPER), async (req, res) => {
    const suppliers = await prisma.supplier.findMany({ orderBy: { name: 'asc' } });
    res.json({ ok: true, suppliers });
});
purchasesRouter.post('/suppliers', requireAuth, requireRoleAtLeast(Role.MANAGER), async (req, res, next) => {
    try {
        const body = supplierSchema.parse(req.body);
        const supplier = await prisma.supplier.create({ data: { name: body.name, contact: body.contact ?? null } });
        await auditLog({ actorUserId: req.user?.id, action: 'SUPPLIER_CREATE', entityType: 'Supplier', entityId: supplier.id, meta: body });
        res.json({ ok: true, supplier });
    }
    catch (err) {
        next(err);
    }
});
// Purchase Orders (simple: create + receive)
const createPoSchema = z.object({
    kitchenId: z.string().min(1),
    supplierId: z.string().min(1).optional(),
    lines: z
        .array(z.object({
        itemId: z.string().min(1),
        qty: z.number().positive(),
        unitCost: z.number().nonnegative(),
    }))
        .min(1),
});
purchasesRouter.post('/purchases/po', requireAuth, requireRoleAtLeast(Role.STOREKEEPER), async (req, res, next) => {
    try {
        const body = createPoSchema.parse(req.body);
        const po = await prisma.purchaseOrder.create({
            data: {
                kitchenId: body.kitchenId,
                supplierId: body.supplierId ?? null,
                status: 'RECEIVED',
                createdByUserId: req.user?.id ?? null,
                lines: {
                    create: body.lines.map((l) => ({ itemId: l.itemId, qty: l.qty, unitCost: l.unitCost })),
                },
            },
            include: { lines: true },
        });
        // Receive immediately: write ledger entries and update avg cost.
        await prisma.$transaction(async (tx) => {
            for (const line of po.lines) {
                await tx.stockLedger.create({
                    data: {
                        kitchenId: po.kitchenId,
                        itemId: line.itemId,
                        type: 'PURCHASE',
                        qtyDelta: line.qty,
                        unitCost: line.unitCost,
                        refType: 'PURCHASE_ORDER',
                        refId: po.id,
                        createdByUserId: req.user?.id ?? null,
                    },
                });
                const current = await tx.kitchenStock.findUnique({
                    where: { kitchenId_itemId: { kitchenId: po.kitchenId, itemId: line.itemId } },
                });
                const curQty = current?.onHandQty ?? 0;
                const curCost = current?.avgCost ?? 0;
                const newQty = curQty + line.qty;
                const newAvgCost = newQty <= 0 ? 0 : (curQty * curCost + line.qty * line.unitCost) / newQty;
                await tx.kitchenStock.upsert({
                    where: { kitchenId_itemId: { kitchenId: po.kitchenId, itemId: line.itemId } },
                    create: { kitchenId: po.kitchenId, itemId: line.itemId, onHandQty: newQty, avgCost: newAvgCost },
                    update: { onHandQty: newQty, avgCost: newAvgCost },
                });
            }
        });
        await auditLog({ actorUserId: req.user?.id, action: 'PURCHASE_RECEIVE', entityType: 'PurchaseOrder', entityId: po.id, meta: body });
        res.json({ ok: true, purchaseOrder: po });
    }
    catch (err) {
        next(err);
    }
});
purchasesRouter.get('/purchases/po', requireAuth, requireRoleAtLeast(Role.STOREKEEPER), async (req, res, next) => {
    try {
        const kitchenId = typeof req.query.kitchenId === 'string' ? req.query.kitchenId : req.user?.kitchenId;
        if (!kitchenId)
            throw new HttpError(400, 'ValidationError', 'kitchenId is required');
        const pos = await prisma.purchaseOrder.findMany({
            where: { kitchenId },
            include: { lines: { include: { item: true } }, supplier: true },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
        res.json({ ok: true, purchaseOrders: pos });
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=purchases.route.js.map