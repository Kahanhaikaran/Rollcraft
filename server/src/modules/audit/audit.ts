import { prisma } from '../../db/prisma.js';

export async function auditLog(input: {
  actorUserId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  meta: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      meta: input.meta as any,
    },
  });
}

