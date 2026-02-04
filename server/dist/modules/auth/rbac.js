import { HttpError } from '../../lib/http.js';
export const Role = {
    OWNER: 'OWNER',
    ADMIN: 'ADMIN',
    MANAGER: 'MANAGER',
    STOREKEEPER: 'STOREKEEPER',
    HR: 'HR',
    EMPLOYEE: 'EMPLOYEE',
};
const roleRank = {
    OWNER: 100,
    ADMIN: 90,
    MANAGER: 70,
    STOREKEEPER: 50,
    HR: 50,
    EMPLOYEE: 10,
};
export function requireRoleAtLeast(minRole) {
    return (req, res, next) => {
        const role = req.user?.role;
        if (!role)
            return next(new HttpError(401, 'Unauthorized'));
        if ((roleRank[role] ?? 0) < roleRank[minRole])
            return next(new HttpError(403, 'Forbidden'));
        return next();
    };
}
//# sourceMappingURL=rbac.js.map