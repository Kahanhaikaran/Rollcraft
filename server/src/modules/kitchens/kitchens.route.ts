import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma.js';
import { HttpError } from '../../lib/http.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { requireRoleAtLeast, Role } from '../auth/rbac.js';
import { auditLog } from '../audit/audit.js';

export const kitchensRouter = Router();

kitchensRouter.get('/kitchens', requireAuth, async (req, res) => {
  const kitchens = await prisma.kitchen.findMany({ orderBy: { name: 'asc' } });
  res.json({ ok: true, kitchens });
});

const createSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['KING', 'BRANCH']),
  address: z.string().min(1).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  geofenceRadiusMeters: z.number().int().min(10).max(2000).default(150),
});

kitchensRouter.post('/kitchens', requireAuth, requireRoleAtLeast(Role.ADMIN), async (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);
    const kitchen = await prisma.kitchen.create({
      data: {
        name: body.name,
        type: body.type as any,
        address: body.address ?? null,
        lat: body.lat ?? null,
        lng: body.lng ?? null,
        geofenceRadiusMeters: body.geofenceRadiusMeters,
      },
    });
    await auditLog({ actorUserId: req.user?.id, action: 'KITCHEN_CREATE', entityType: 'Kitchen', entityId: kitchen.id, meta: body });
    res.json({ ok: true, kitchen });
  } catch (err) {
    next(err);
  }
});

const updateGeoSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  geofenceRadiusMeters: z.number().int().min(10).max(2000),
});

kitchensRouter.put('/kitchens/:id/geofence', requireAuth, requireRoleAtLeast(Role.ADMIN), async (req, res, next) => {
  try {
    const id = req.params.id;
    const body = updateGeoSchema.parse(req.body);
    const kitchen = await prisma.kitchen.update({
      where: { id },
      data: { lat: body.lat, lng: body.lng, geofenceRadiusMeters: body.geofenceRadiusMeters },
    });
    await auditLog({ actorUserId: req.user?.id, action: 'KITCHEN_GEOFENCE_UPDATE', entityType: 'Kitchen', entityId: id, meta: body });
    res.json({ ok: true, kitchen });
  } catch (err) {
    next(err);
  }
});

kitchensRouter.get('/kitchens/:id', requireAuth, async (req, res, next) => {
  try {
    const kitchen = await prisma.kitchen.findUnique({ where: { id: req.params.id } });
    if (!kitchen) throw new HttpError(404, 'KitchenNotFound');
    res.json({ ok: true, kitchen });
  } catch (err) {
    next(err);
  }
});

