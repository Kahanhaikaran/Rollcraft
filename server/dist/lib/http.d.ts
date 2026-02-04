export declare class HttpError extends Error {
    status: number;
    code: string;
    details?: unknown;
    constructor(status: number, code: string, message?: string, details?: unknown);
}
export declare function asHttpError(err: unknown): HttpError | null;
//# sourceMappingURL=http.d.ts.map