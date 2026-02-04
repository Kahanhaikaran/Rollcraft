export class HttpError extends Error {
    status;
    code;
    details;
    constructor(status, code, message, details) {
        super(message ?? code);
        this.status = status;
        this.code = code;
        this.details = details;
    }
}
export function asHttpError(err) {
    if (err instanceof HttpError)
        return err;
    return null;
}
//# sourceMappingURL=http.js.map