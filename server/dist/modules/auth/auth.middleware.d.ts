import type { NextFunction, Request, Response } from 'express';
export type AuthedUser = {
    id: string;
    role: string;
    kitchenId?: string;
};
declare global {
    var __rollcraftAuthTypes: true | undefined;
}
declare module 'express-serve-static-core' {
    interface Request {
        user?: AuthedUser;
    }
}
export declare function requireAuth(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=auth.middleware.d.ts.map