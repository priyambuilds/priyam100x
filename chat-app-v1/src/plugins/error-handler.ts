import { Elysia } from 'elysia';
import { AppError, isPrismaError } from '../errors';

const body = (code: string, message: string) => ({ error: { code, message } });

// One place maps every failure to { error: { code, message } } + a status.
export const errorHandler = new Elysia({ name: 'error-handler' })
  .error({ APP_ERROR: AppError })
  .onError({ as: 'global' }, ({ code, error, set }) => {
    if (error instanceof AppError) {
      set.status = error.status;
      return body(error.code, error.message);
    }
    if (code === 'VALIDATION') {
      set.status = 400;
      return body('VALIDATION', 'Request validation failed');
    }
    if (code === 'NOT_FOUND') {
      set.status = 404;
      return body('NOT_FOUND', 'Route not found');
    }
    if (isPrismaError(error, 'P2002')) {
      set.status = 409;
      return body('CONFLICT', 'Already exists');
    }
    if (isPrismaError(error, 'P2025')) {
      set.status = 404;
      return body('NOT_FOUND', 'Not found');
    }
    console.error('[unhandled]', error);
    set.status = 500;
    return body('INTERNAL_SERVER_ERROR', 'Something went wrong');
  });

export const ErrorBody = {
  type: 'object',
  properties: { error: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' } } } },
} as const;
