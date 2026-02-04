import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { requireRoleAtLeast, Role } from '../auth/rbac.js';
import { auditLog } from '../audit/audit.js';
export const itemsRouter = Router();
itemsRouter.get('/items', requireAuth, async (req, res) => {
    const items = await prisma.item.findMany({ orderBy: { name: 'asc' } });
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
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=items.route.js.map