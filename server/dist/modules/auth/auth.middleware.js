import { HttpError } from '../../lib/http.js';
import { verifyAccessToken } from './jwt.js';
export function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
    if (!token)
        return next(new HttpError(401, 'Unauthorized', 'Missing access token'));
    try {
        const claims = verifyAccessToken(token);
        req.user = { id: claims.sub, role: claims.role, kitchenId: claims.kitchenId };
        return next();
    }
    catch {
        return next(new HttpError(401, 'Unauthorized', 'Invalid access token'));
    }
}
//# sourceMappingURL=auth.middleware.js.map