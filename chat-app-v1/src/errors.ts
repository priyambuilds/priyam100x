// Domain errors carry an HTTP status and a stable machine-readable code.
// One global handler (plugins/error-handler.ts) turns them into responses;
// the gateway maps the same codes onto `error` events.
export class AppError extends Error {
  constructor(
    public readonly status: 400 | 401 | 403 | 404 | 409 | 429 | 500 | 501 | 503,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export const badRequest = (message: string, code = 'BAD_REQUEST') => new AppError(400, code, message);
export const unauthorized = (message = 'Unauthorized') => new AppError(401, 'UNAUTHORIZED', message);
export const forbidden = (message = 'Forbidden') => new AppError(403, 'FORBIDDEN', message);
export const notFound = (message = 'Not found') => new AppError(404, 'NOT_FOUND', message);
export const conflict = (message: string) => new AppError(409, 'CONFLICT', message);
export const tooManyRequests = (message = 'Please slow down') => new AppError(429, 'RATE_LIMITED', message);

export const isPrismaError = (err: unknown, code: string): boolean =>
  typeof err === 'object' && err !== null && (err as { code?: string }).code === code;
