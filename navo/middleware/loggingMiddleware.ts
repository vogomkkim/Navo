import { Request, Response, NextFunction } from 'express';
import logger from '../core/logger.js';

// Configuration for logging behavior
const LOGGING_CONFIG = {
  // Log levels for different request types
  STATIC_ASSETS: process.env.LOG_STATIC_ASSETS === 'true' ? 'debug' : 'none',
  API_ROUTES: process.env.LOG_API_ROUTES || 'info',
  HEALTH_CHECKS: process.env.LOG_HEALTH_CHECKS || 'debug',
  AUTH_ROUTES: process.env.LOG_AUTH_ROUTES || 'info',
  OTHER_ROUTES: process.env.LOG_OTHER_ROUTES || 'info',

  // Performance threshold for slow requests (in ms)
  SLOW_REQUEST_THRESHOLD: parseInt(
    process.env.SLOW_REQUEST_THRESHOLD || '1000'
  ),

  // Enable/disable request logging entirely
  ENABLE_REQUEST_LOGGING: process.env.ENABLE_REQUEST_LOGGING !== 'false',

  // Enable/disable response logging entirely
  ENABLE_RESPONSE_LOGGING: process.env.ENABLE_RESPONSE_LOGGING !== 'false',
};

// Patterns to identify different types of requests
const REQUEST_PATTERNS = {
  STATIC_ASSETS: /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map)$/i,
  API_ROUTES: /^\/api\//,
  HEALTH_CHECKS: /^\/health/,
  AUTH_ROUTES: /^\/auth/,
  AI_ROUTES: /^\/ai/,
  COMPONENT_ROUTES: /^\/components/,
  PROJECT_ROUTES: /^\/projects/,
  DRAFT_ROUTES: /^\/drafts/,
  EVENT_ROUTES: /^\/events/,
  PAGE_ROUTES: /^\/pages/,
  ANALYTICS_ROUTES: /^\/analytics/,
};

// Determine log level for a given request
function getRequestLogLevel(req: Request): 'debug' | 'info' | 'warn' | 'none' {
  const path = req.path;

  // Static assets (CSS, JS, images, etc.)
  if (REQUEST_PATTERNS.STATIC_ASSETS.test(path)) {
    return LOGGING_CONFIG.STATIC_ASSETS as 'debug' | 'none';
  }

  // Health checks
  if (REQUEST_PATTERNS.HEALTH_CHECKS.test(path)) {
    return LOGGING_CONFIG.HEALTH_CHECKS as 'debug' | 'info';
  }

  // API routes
  if (REQUEST_PATTERNS.API_ROUTES.test(path)) {
    return LOGGING_CONFIG.API_ROUTES as 'debug' | 'info';
  }

  // Auth routes
  if (REQUEST_PATTERNS.AUTH_ROUTES.test(path)) {
    return LOGGING_CONFIG.AUTH_ROUTES as 'debug' | 'info';
  }

  // Other business logic routes
  if (
    REQUEST_PATTERNS.AI_ROUTES.test(path) ||
    REQUEST_PATTERNS.COMPONENT_ROUTES.test(path) ||
    REQUEST_PATTERNS.PROJECT_ROUTES.test(path) ||
    REQUEST_PATTERNS.DRAFT_ROUTES.test(path) ||
    REQUEST_PATTERNS.EVENT_ROUTES.test(path) ||
    REQUEST_PATTERNS.PAGE_ROUTES.test(path) ||
    REQUEST_PATTERNS.ANALYTICS_ROUTES.test(path)
  ) {
    return LOGGING_CONFIG.OTHER_ROUTES as 'debug' | 'info';
  }

  // Default for other routes
  return LOGGING_CONFIG.OTHER_ROUTES as 'debug' | 'info';
}

// Log a message at the appropriate level
function logAtLevel(
  level: 'debug' | 'info' | 'warn' | 'none',
  message: string,
  meta?: any
) {
  switch (level) {
    case 'debug':
      logger.debug(message, meta);
      break;
    case 'info':
      logger.info(message, meta);
      break;
    case 'warn':
      logger.warn(message, meta);
      break;
    case 'none':
      // Don't log anything
      break;
  }
}

interface ResponseMeta {
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  timestamp: string;
  performance_warning?: string;
}

export function loggingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!LOGGING_CONFIG.ENABLE_REQUEST_LOGGING) {
    return next();
  }

  const startHrTime = process.hrtime.bigint();
  const requestLogLevel = getRequestLogLevel(req);

  // REQ 로그는 찍지 않음 (에러가 있을 때만 RES에서 처리)

  // Track response for logging
  res.on('finish', () => {
    if (!LOGGING_CONFIG.ENABLE_RESPONSE_LOGGING) {
      return;
    }

    const endHrTime = process.hrtime.bigint();
    const durationMs = Number(endHrTime - startHrTime) / 1_000_000;
    const responseLogLevel = getRequestLogLevel(req);

    // Don't log responses for static assets
    if (responseLogLevel === 'none') {
      return;
    }

    const responseMeta: ResponseMeta = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Math.round(durationMs),
    };

    // 에러가 있을 때만 로그 찍기
    if (
      res.statusCode >= 400 ||
      durationMs > LOGGING_CONFIG.SLOW_REQUEST_THRESHOLD
    ) {
      // Determine log level based on status code and duration
      let finalLogLevel = responseLogLevel;

      // Upgrade to warn for client errors (4xx)
      if (res.statusCode >= 400 && res.statusCode < 500) {
        finalLogLevel = 'warn';
      }

      // Upgrade to warn for server errors (5xx)
      if (res.statusCode >= 500) {
        finalLogLevel = 'warn';
      }

      // Upgrade to warn for slow requests
      if (durationMs > LOGGING_CONFIG.SLOW_REQUEST_THRESHOLD) {
        finalLogLevel = 'warn';
      }

      // Add performance warning for slow requests
      if (durationMs > LOGGING_CONFIG.SLOW_REQUEST_THRESHOLD) {
        responseMeta['performance_warning'] =
          `Request took ${Math.round(durationMs)}ms (threshold: ${LOGGING_CONFIG.SLOW_REQUEST_THRESHOLD}ms)`;
      }

      logAtLevel(finalLogLevel, '[RES]', responseMeta);
    }
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
  const status =
    (isError && (err as any).statusCode) ||
    (isError && (err as any).status) ||
    500;
  const message =
    status >= 500
      ? 'Internal Server Error'
      : isError
        ? err.message
        : 'Request failed';

  logger.error(
    'Unhandled error',
    isError ? { message: err.message, stack: err.stack } : { err }
  );
  res.status(status).json({ error: message });
}
