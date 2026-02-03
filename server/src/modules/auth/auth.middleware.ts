import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../../lib/http.js';
import { verifyAccessToken } from './jwt.js';

export type AuthedUser = {
  id: string;
  role: string;
  kitchenId?: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __rollcraftAuthTypes: true | undefined;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthedUser;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
  if (!token) return next(new HttpError(401, 'Unauthorized', 'Missing access token'));

  try {
    const claims = verifyAccessToken(token);
    req.user = { id: claims.sub, role: claims.role, kitchenId: claims.kitchenId };
    return next();
  } catch {
    return next(new HttpError(401, 'Unauthorized', 'Invalid access token'));
  }
}

