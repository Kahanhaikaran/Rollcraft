import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../../lib/http.js';

export const Role = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  STOREKEEPER: 'STOREKEEPER',
  HR: 'HR',
  EMPLOYEE: 'EMPLOYEE',
} as const;

export type RoleName = (typeof Role)[keyof typeof Role];

const roleRank: Record<RoleName, number> = {
  OWNER: 100,
  ADMIN: 90,
  MANAGER: 70,
  STOREKEEPER: 50,
  HR: 50,
  EMPLOYEE: 10,
};

export function requireRoleAtLeast(minRole: RoleName) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.user?.role as RoleName | undefined;
    if (!role) return next(new HttpError(401, 'Unauthorized'));
    if ((roleRank[role] ?? 0) < roleRank[minRole]) return next(new HttpError(403, 'Forbidden'));
    return next();
  };
}

