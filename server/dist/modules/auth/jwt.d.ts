export type AccessTokenClaims = {
    sub: string;
    role: string;
    kitchenId?: string;
};
export declare function signAccessToken(claims: AccessTokenClaims): string;
export declare function signRefreshToken(userId: string): string;
export declare function verifyAccessToken(token: string): AccessTokenClaims;
export declare function verifyRefreshToken(token: string): {
    sub: string;
};
//# sourceMappingURL=jwt.d.ts.map