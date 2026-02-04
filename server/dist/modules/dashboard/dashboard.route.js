import { Router } from 'express';
import { prisma } from '../../db/prisma.js';
import { HttpError } from '../../lib/http.js';
import { requireAuth } from '../auth/auth.middleware.js';
export const dashboardRouter = Router();
/**
 * Dashboard stats: kitchens count, low stock, depletion rate, inventory velocity.
 * Depletion = outgoing qty (TRANSFER_OUT, WASTAGE, CONSUMPTION, negative ADJUSTMENT) over time.
 */
dashboardRouter.get('/dashboard/stats', requireAuth, async (req, res, next) => {
    try {
        const kitchenId = typeof req.query.kitchenId === 'string' ? req.query.kitchenId : req.user?.kitchenId;
        const [kitchensCount, lowStockItems, depletionStats, recentLedger] = await Promise.all([
            prisma.kitchen.count(),
            kitchenId
                ? prisma.kitchenStock
                    .findMany({
                    where: { kitchenId, item: { isActive: true } },
                    include: { item: true },
                })
                    .then((rows) => rows.filter((r) => r.item.reorderPoint > 0 && r.onHandQty <= r.item.reorderPoint))
                : [],
            kitchenId
                ? prisma.stockLedger.groupBy({
                    by: ['type'],
                    where: {
                        kitchenId,
                        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
                        type: { in: ['TRANSFER_OUT', 'WASTAGE', 'CONSUMPTION'] },
                    },
                    _sum: { qtyDelta: true },
                    _count: true,
                })
                : [],
            kitchenId
                ? prisma.stockLedger.findMany({
                    where: { kitchenId },
                    include: { item: true },
                    orderBy: { createdAt: 'desc' },
                    take: 15,
                })
                : [],
        ]);
        const depletionByType = depletionStats.reduce((acc, s) => {
            acc[s.type] = { totalQty: Math.abs(s._sum.qtyDelta ?? 0), count: s._count };
            return acc;
        }, {});
        const totalDepletion7d = (depletionByType.TRANSFER_OUT?.totalQty ?? 0) +
            (depletionByType.WASTAGE?.totalQty ?? 0) +
            (depletionByType.CONSUMPTION?.totalQty ?? 0);
        const stockVelocity = kitchenId
            ? await prisma.stockLedger.aggregate({
                where: {
                    kitchenId,
                    type: { in: ['TRANSFER_OUT', 'WASTAGE', 'CONSUMPTION'] },
                    createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
                },
                _sum: { qtyDelta: true },
            })
            : null;
        const depletion24h = Math.abs(stockVelocity?._sum.qtyDelta ?? 0);
        res.json({
            ok: true,
            stats: {
                kitchensCount,
                lowStockCount: lowStockItems.length,
                lowStockItems: lowStockItems.map((s) => ({
                    itemId: s.itemId,
                    itemName: s.item.name,
                    uom: s.item.uom,
                    onHandQty: s.onHandQty,
                    reorderPoint: s.item.reorderPoint,
                })),
                depletionLast7Days: totalDepletion7d,
                depletionLast24Hours: depletion24h,
                depletionByType,
                recentLedger: recentLedger.map((l) => ({
                    id: l.id,
                    type: l.type,
                    qtyDelta: l.qtyDelta,
                    itemName: l.item.name,
                    uom: l.item.uom,
                    createdAt: l.createdAt,
                })),
            },
        });
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=dashboard.route.js.map