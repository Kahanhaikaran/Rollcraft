import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma.js';
import { HttpError } from '../../lib/http.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { requireRoleAtLeast, Role } from '../auth/rbac.js';
import { auditLog } from '../audit/audit.js';
export const transfersRouter = Router();
const requestSchema = z.object({
    fromKitchenId: z.string().min(1),
    toKitchenId: z.string().min(1),
    lines: z
        .array(z.object({
        itemId: z.string().min(1),
        qty: z.number().positive(),
    }))
        .min(1),
});
transfersRouter.post('/transfers', requireAuth, requireRoleAtLeast(Role.STOREKEEPER), async (req, res, next) => {
    try {
        const body = requestSchema.parse(req.body);
        const transfer = await prisma.transfer.create({
            data: {
                fromKitchenId: body.fromKitchenId,
                toKitchenId: body.toKitchenId,
                status: 'REQUESTED',
                requestedByUserId: req.user?.id ?? null,
                lines: { create: body.lines.map((l) => ({ itemId: l.itemId, qty: l.qty })) },
            },
            include: { lines: true },
        });
        await auditLog({ actorUserId: req.user?.id, action: 'TRANSFER_REQUEST', entityType: 'Transfer', entityId: transfer.id, meta: body });
        res.json({ ok: true, transfer });
    }
    catch (err) {
        next(err);
    }
});
transfersRouter.get('/transfers', requireAuth, async (req, res) => {
    const kitchenId = typeof req.query.kitchenId === 'string' ? req.query.kitchenId : req.user?.kitchenId;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const where = kitchenId
        ? { OR: [{ fromKitchenId: kitchenId }, { toKitchenId: kitchenId }], ...(status ? { status } : {}) }
        : status
            ? { status }
            : {};
    const transfers = await prisma.transfer.findMany({
        where,
        include: { lines: { include: { item: true } }, fromKitchen: true, toKitchen: true },
        orderBy: { requestedAt: 'desc' },
        take: 100,
    });
    res.json({ ok: true, transfers });
});
function requireStatus(transfer, allowed) {
    if (!allowed.includes(transfer.status))
        throw new HttpError(400, 'InvalidTransferStatus');
}
transfersRouter.post('/transfers/:id/approve', requireAuth, requireRoleAtLeast(Role.MANAGER), async (req, res, next) => {
    try {
        const id = req.params.id;
        const transfer = await prisma.transfer.findUnique({ where: { id }, include: { lines: true } });
        if (!transfer)
            throw new HttpError(404, 'TransferNotFound');
        requireStatus(transfer, ['REQUESTED']);
        const updated = await prisma.transfer.update({
            where: { id },
            data: { status: 'APPROVED', approvedByUserId: req.user?.id ?? null, approvedAt: new Date() },
            include: { lines: true },
        });
        await auditLog({ actorUserId: req.user?.id, action: 'TRANSFER_APPROVE', entityType: 'Transfer', entityId: id, meta: {} });
        res.json({ ok: true, transfer: updated });
    }
    catch (err) {
        next(err);
    }
});
transfersRouter.post('/transfers/:id/dispatch', requireAuth, requireRoleAtLeast(Role.STOREKEEPER), async (req, res, next) => {
    try {
        const id = req.params.id;
        const transfer = await prisma.transfer.findUnique({ where: { id }, include: { lines: true } });
        if (!transfer)
            throw new HttpError(404, 'TransferNotFound');
        requireStatus(transfer, ['APPROVED']);
        const updated = await prisma.$transaction(async (tx) => {
            // Ensure stock exists
            for (const line of transfer.lines) {
                const current = await tx.kitchenStock.findUnique({
                    where: { kitchenId_itemId: { kitchenId: transfer.fromKitchenId, itemId: line.itemId } },
                });
                if ((current?.onHandQty ?? 0) < line.qty)
                    throw new HttpError(400, 'InsufficientStock');
            }
            // Deduct + ledger out
            for (const line of transfer.lines) {
                const current = await tx.kitchenStock.findUnique({
                    where: { kitchenId_itemId: { kitchenId: transfer.fromKitchenId, itemId: line.itemId } },
                });
                const newQty = (current?.onHandQty ?? 0) - line.qty;
                await tx.kitchenStock.upsert({
                    where: { kitchenId_itemId: { kitchenId: transfer.fromKitchenId, itemId: line.itemId } },
                    create: { kitchenId: transfer.fromKitchenId, itemId: line.itemId, onHandQty: newQty, avgCost: current?.avgCost ?? 0 },
                    update: { onHandQty: newQty },
                });
                await tx.stockLedger.create({
                    data: {
                        kitchenId: transfer.fromKitchenId,
                        itemId: line.itemId,
                        type: 'TRANSFER_OUT',
                        qtyDelta: -line.qty,
                        unitCost: current?.avgCost ?? null,
                        refType: 'TRANSFER',
                        refId: transfer.id,
                        createdByUserId: req.user?.id ?? null,
                    },
                });
            }
            return await tx.transfer.update({
                where: { id: transfer.id },
                data: { status: 'DISPATCHED', dispatchedByUserId: req.user?.id ?? null, dispatchedAt: new Date() },
                include: { lines: true },
            });
        });
        await auditLog({ actorUserId: req.user?.id, action: 'TRANSFER_DISPATCH', entityType: 'Transfer', entityId: id, meta: {} });
        res.json({ ok: true, transfer: updated });
    }
    catch (err) {
        next(err);
    }
});
transfersRouter.post('/transfers/:id/receive', requireAuth, requireRoleAtLeast(Role.STOREKEEPER), async (req, res, next) => {
    try {
        const id = req.params.id;
        const transfer = await prisma.transfer.findUnique({ where: { id }, include: { lines: true } });
        if (!transfer)
            throw new HttpError(404, 'TransferNotFound');
        requireStatus(transfer, ['DISPATCHED']);
        const updated = await prisma.$transaction(async (tx) => {
            for (const line of transfer.lines) {
                // Determine cost from latest fromKitchen avgCost (best effort)
                const fromStock = await tx.kitchenStock.findUnique({
                    where: { kitchenId_itemId: { kitchenId: transfer.fromKitchenId, itemId: line.itemId } },
                });
                const unitCost = fromStock?.avgCost ?? 0;
                const current = await tx.kitchenStock.findUnique({
                    where: { kitchenId_itemId: { kitchenId: transfer.toKitchenId, itemId: line.itemId } },
                });
                const curQty = current?.onHandQty ?? 0;
                const curCost = current?.avgCost ?? 0;
                const newQty = curQty + line.qty;
                const newAvgCost = newQty <= 0 ? 0 : (curQty * curCost + line.qty * unitCost) / newQty;
                await tx.kitchenStock.upsert({
                    where: { kitchenId_itemId: { kitchenId: transfer.toKitchenId, itemId: line.itemId } },
                    create: { kitchenId: transfer.toKitchenId, itemId: line.itemId, onHandQty: newQty, avgCost: newAvgCost },
                    update: { onHandQty: newQty, avgCost: newAvgCost },
                });
                await tx.stockLedger.create({
                    data: {
                        kitchenId: transfer.toKitchenId,
                        itemId: line.itemId,
                        type: 'TRANSFER_IN',
                        qtyDelta: line.qty,
                        unitCost,
                        refType: 'TRANSFER',
                        refId: transfer.id,
                        createdByUserId: req.user?.id ?? null,
                    },
                });
            }
            return await tx.transfer.update({
                where: { id: transfer.id },
                data: { status: 'RECEIVED', receivedByUserId: req.user?.id ?? null, receivedAt: new Date() },
                include: { lines: true },
            });
        });
        await auditLog({ actorUserId: req.user?.id, action: 'TRANSFER_RECEIVE', entityType: 'Transfer', entityId: id, meta: {} });
        res.json({ ok: true, transfer: updated });
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=transfers.route.js.map