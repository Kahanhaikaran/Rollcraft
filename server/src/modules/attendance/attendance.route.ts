import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma.js';
import { HttpError } from '../../lib/http.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { requireRoleAtLeast, Role } from '../auth/rbac.js';
import { auditLog } from '../audit/audit.js';
import { haversineDistanceMeters } from './geo.js';

export const attendanceRouter = Router();

const checkSchema = z.object({
  kitchenId: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
  type: z.enum(['IN', 'OUT']),
});

attendanceRouter.post('/attendance/check', requireAuth, async (req, res, next) => {
  try {
    const body = checkSchema.parse(req.body);

    const kitchen = await prisma.kitchen.findUnique({ where: { id: body.kitchenId } });
    if (!kitchen) throw new HttpError(404, 'KitchenNotFound');
    if (kitchen.lat == null || kitchen.lng == null) throw new HttpError(400, 'KitchenGeoNotConfigured');

    const distanceMeters = haversineDistanceMeters({ lat: kitchen.lat, lng: kitchen.lng }, { lat: body.lat, lng: body.lng });
    const within = distanceMeters <= kitchen.geofenceRadiusMeters;

    // If outside geofence, only manager+ can override.
    const role = req.user?.role ?? 'EMPLOYEE';
    const canOverride = ['OWNER', 'ADMIN', 'MANAGER'].includes(role);
    if (!within && !canOverride) throw new HttpError(403, 'OutsideGeofence');

    const event = await prisma.attendanceEvent.create({
      data: {
        employeeUserId: req.user!.id,
        kitchenId: body.kitchenId,
        type: body.type as any,
        method: within ? 'GEO' : 'MANUAL',
        lat: body.lat,
        lng: body.lng,
        distanceMeters,
      },
    });

    await auditLog({
      actorUserId: req.user?.id,
      action: 'ATTENDANCE_EVENT',
      entityType: 'AttendanceEvent',
      entityId: event.id,
      meta: { ...body, distanceMeters, within },
    });

    res.json({ ok: true, event, within, distanceMeters, geofenceRadiusMeters: kitchen.geofenceRadiusMeters });
  } catch (err) {
    next(err);
  }
});

attendanceRouter.get('/attendance/me', requireAuth, async (req, res) => {
  const events = await prisma.attendanceEvent.findMany({
    where: { employeeUserId: req.user!.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  res.json({ ok: true, events });
});

// Manager override: create an event without geo (records as MANUAL)
const overrideSchema = z.object({
  employeeUserId: z.string().min(1),
  kitchenId: z.string().min(1),
  type: z.enum(['IN', 'OUT']),
  note: z.string().min(1).optional(),
});

attendanceRouter.post('/attendance/override', requireAuth, requireRoleAtLeast(Role.MANAGER), async (req, res, next) => {
  try {
    const body = overrideSchema.parse(req.body);
    const event = await prisma.attendanceEvent.create({
      data: {
        employeeUserId: body.employeeUserId,
        kitchenId: body.kitchenId,
        type: body.type as any,
        method: 'MANUAL',
      },
    });
    await auditLog({
      actorUserId: req.user?.id,
      action: 'ATTENDANCE_OVERRIDE',
      entityType: 'AttendanceEvent',
      entityId: event.id,
      meta: body,
    });
    res.json({ ok: true, event });
  } catch (err) {
    next(err);
  }
});

