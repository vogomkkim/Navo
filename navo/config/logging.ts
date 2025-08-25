/**
 * Logging Configuration
 *
 * This file documents all available environment variables for controlling
 * the intelligent logging middleware behavior.
 */

export const LOGGING_ENV_VARS = {
  /**
   * Enable/disable request logging entirely
   * Default: true (enabled)
   * Set to 'false' to disable all request logging
   */
  ENABLE_REQUEST_LOGGING: 'ENABLE_REQUEST_LOGGING',

  /**
   * Enable/disable response logging entirely
   * Default: true (enabled)
   * Set to 'false' to disable all response logging
   */
  ENABLE_RESPONSE_LOGGING: 'ENABLE_RESPONSE_LOGGING',

  /**
   * Log level for static assets (CSS, JS, images, fonts)
   * Default: 'none' (no logging)
   * Options: 'none', 'debug'
   * Set to 'true' to enable debug logging for static assets
   */
  LOG_STATIC_ASSETS: 'LOG_STATIC_ASSETS',

  /**
   * Log level for API routes (/api/*)
   * Default: 'info'
   * Options: 'debug', 'info'
   */
  LOG_API_ROUTES: 'LOG_API_ROUTES',

  /**
   * Log level for health check routes (/health/*)
   * Default: 'debug'
   * Options: 'debug', 'info'
   */
  LOG_HEALTH_CHECKS: 'LOG_HEALTH_CHECKS',

  /**
   * Log level for authentication routes (/auth/*)
   * Default: 'info'
   * Options: 'debug', 'info'
   */
  LOG_AUTH_ROUTES: 'LOG_AUTH_ROUTES',

  /**
   * Log level for other business logic routes
   * Default: 'info'
   * Options: 'debug', 'info'
   */
  LOG_OTHER_ROUTES: 'LOG_OTHER_ROUTES',

  /**
   * Performance threshold for slow requests (in milliseconds)
   * Default: 1000 (1 second)
   * Requests taking longer than this will be logged at 'warn' level
   */
  SLOW_REQUEST_THRESHOLD: 'SLOW_REQUEST_THRESHOLD',
};

/**
 * Example .env configuration:
 *
 * # Disable static asset logging (recommended for production)
 * LOG_STATIC_ASSETS=false
 *
 * # Set API routes to debug level for development
 * LOG_API_ROUTES=debug
 *
 * # Set slow request threshold to 500ms
 * SLOW_REQUEST_THRESHOLD=500
 *
 * # Disable all logging in production
 * ENABLE_REQUEST_LOGGING=false
 * ENABLE_RESPONSE_LOGGING=false
 */

/**
 * Recommended production settings:
 *
 * LOG_STATIC_ASSETS=false
 * LOG_API_ROUTES=info
 * LOG_HEALTH_CHECKS=debug
 * LOG_AUTH_ROUTES=info
 * LOG_OTHER_ROUTES=info
 * SLOW_REQUEST_THRESHOLD=1000
 * ENABLE_REQUEST_LOGGING=true
 * ENABLE_RESPONSE_LOGGING=true
 *
 * This will:
 * - Filter out static asset noise
 * - Keep important business logic logging
 * - Monitor performance issues
 * - Maintain security audit trail
 */
