import { Request, Response, NextFunction } from 'express';
import logger from '../core/logger.js';

export function loggingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const startHrTime = process.hrtime.bigint();
  logger.info('[REQ]', { method: req.method, path: req.path });

  res.on('finish', () => {
    const endHrTime = process.hrtime.bigint();
    const durationMs = Number(endHrTime - startHrTime) / 1_000_000;
    logger.info('[RES]', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Math.round(durationMs),
    });
  });

  next();
}

export function errorHandlingMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction
) {
  if (res.headersSent) {
    return next(err);
  }

  const isError = err instanceof Error;
  const status = (isError && (err as any).statusCode) || (isError && (err as any).status) || 500;
  const message = status >= 500 ? 'Internal Server Error' : (isError ? err.message : 'Request failed');

  logger.error('Unhandled error', isError ? { message: err.message, stack: err.stack } : { err });
  res.status(status).json({ error: message });
}
