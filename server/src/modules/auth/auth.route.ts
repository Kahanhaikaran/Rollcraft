import { Router } from 'express';
import argon2 from 'argon2';
import { z } from 'zod';
import { prisma } from '../../db/prisma.js';
import { HttpError } from '../../lib/http.js';
import { env } from '../../config/env.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from './jwt.js';
import { requireAuth } from './auth.middleware.js';
import { requireRoleAtLeast, Role } from './rbac.js';
import { auditLog } from '../audit/audit.js';

export const authRouter = Router();

const loginSchema = z.object({
  identifier: z.string().min(1), // email or phone
  password: z.string().min(6),
});

authRouter.post('/auth/login', async (req, res, next) => {
  try {
    const { identifier, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findFirst({
      where: {
        isActive: true,
        OR: [{ email: identifier }, { phone: identifier }],
      },
    });
    if (!user) throw new HttpError(401, 'InvalidCredentials');

    const ok = await argon2.verify(user.passwordHash, password);
    if (!ok) throw new HttpError(401, 'InvalidCredentials');

    const accessToken = signAccessToken({ sub: user.id, role: user.role, kitchenId: user.kitchenId ?? undefined });
    const refreshToken = signRefreshToken(user.id);

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.NODE_ENV === 'production',
      maxAge: env.JWT_REFRESH_TTL_SECONDS * 1000,
      path: '/auth/refresh',
    });

    await auditLog({ actorUserId: user.id, action: 'AUTH_LOGIN', entityType: 'User', entityId: user.id, meta: {} });

    res.json({
      ok: true,
      accessToken,
      user: { id: user.id, role: user.role, email: user.email, phone: user.phone, kitchenId: user.kitchenId },
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/auth/refresh', async (req, res, next) => {
  try {
    const token = req.cookies?.refresh_token as string | undefined;
    if (!token) throw new HttpError(401, 'Unauthorized', 'Missing refresh token');

    const { sub } = verifyRefreshToken(token);
    const user = await prisma.user.findUnique({ where: { id: sub } });
    if (!user || !user.isActive) throw new HttpError(401, 'Unauthorized');

    const accessToken = signAccessToken({ sub: user.id, role: user.role, kitchenId: user.kitchenId ?? undefined });
    res.json({ ok: true, accessToken });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/auth/logout', async (req, res) => {
  res.clearCookie('refresh_token', { path: '/auth/refresh' });
  res.json({ ok: true });
});

const createUserSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().min(6).optional(),
  password: z.string().min(6),
  role: z.enum([Role.OWNER, Role.ADMIN, Role.MANAGER, Role.STOREKEEPER, Role.HR, Role.EMPLOYEE]).default(Role.EMPLOYEE),
  kitchenId: z.string().optional(),
  fullName: z.string().min(1).optional(),
  baseSalaryMonthly: z.number().int().min(0).optional(),
  overtimeRatePerHour: z.number().int().min(0).optional(),
  latePenaltyPerMinute: z.number().int().min(0).optional(),
});

authRouter.post('/auth/users', requireAuth, requireRoleAtLeast(Role.ADMIN), async (req, res, next) => {
  try {
    const body = createUserSchema.parse(req.body);
    if (!body.email && !body.phone) throw new HttpError(400, 'ValidationError', 'Provide email or phone');

    const passwordHash = await argon2.hash(body.password);

    const user = await prisma.user.create({
      data: {
        email: body.email ?? null,
        phone: body.phone ?? null,
        passwordHash,
        role: body.role as any,
        kitchenId: body.kitchenId ?? null,
        employeeProfile:
          body.fullName && body.baseSalaryMonthly != null
            ? {
                create: {
                  fullName: body.fullName,
                  baseSalaryMonthly: body.baseSalaryMonthly,
                  overtimeRatePerHour: body.overtimeRatePerHour ?? 0,
                  latePenaltyPerMinute: body.latePenaltyPerMinute ?? 0,
                },
              }
            : undefined,
      },
      select: { id: true, email: true, phone: true, role: true, kitchenId: true },
    });

    await auditLog({
      actorUserId: req.user?.id,
      action: 'USER_CREATE',
      entityType: 'User',
      entityId: user.id,
      meta: { role: user.role, kitchenId: user.kitchenId },
    });

    res.json({ ok: true, user });
  } catch (err) {
    next(err);
  }
});

