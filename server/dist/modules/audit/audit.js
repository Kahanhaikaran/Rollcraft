import { prisma } from '../../db/prisma.js';
export async function auditLog(input) {
    await prisma.auditLog.create({
        data: {
            actorUserId: input.actorUserId ?? null,
            action: input.action,
            entityType: input.entityType,
            entityId: input.entityId ?? null,
            meta: input.meta,
        },
    });
}
//# sourceMappingURL=audit.js.map