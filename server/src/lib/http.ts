export class HttpError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message?: string, details?: unknown) {
    super(message ?? code);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function asHttpError(err: unknown): HttpError | null {
  if (err instanceof HttpError) return err;
  return null;
}

