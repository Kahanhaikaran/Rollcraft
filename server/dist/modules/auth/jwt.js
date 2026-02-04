import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
export function signAccessToken(claims) {
    return jwt.sign(claims, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_TTL_SECONDS });
}
export function signRefreshToken(userId) {
    return jwt.sign({ sub: userId }, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_TTL_SECONDS });
}
export function verifyAccessToken(token) {
    return jwt.verify(token, env.JWT_ACCESS_SECRET);
}
export function verifyRefreshToken(token) {
    return jwt.verify(token, env.JWT_REFRESH_SECRET);
}
//# sourceMappingURL=jwt.js.map