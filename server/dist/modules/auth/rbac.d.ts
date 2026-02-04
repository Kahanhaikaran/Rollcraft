import type { NextFunction, Request, Response } from 'express';
export declare const Role: {
    readonly OWNER: "OWNER";
    readonly ADMIN: "ADMIN";
    readonly MANAGER: "MANAGER";
    readonly STOREKEEPER: "STOREKEEPER";
    readonly HR: "HR";
    readonly EMPLOYEE: "EMPLOYEE";
};
export type RoleName = (typeof Role)[keyof typeof Role];
export declare function requireRoleAtLeast(minRole: RoleName): (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=rbac.d.ts.map