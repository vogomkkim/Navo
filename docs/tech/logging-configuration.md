# Logging Configuration

## Overview

The intelligent logging middleware automatically filters and categorizes HTTP requests to reduce noise while maintaining visibility into important business logic and performance issues.

## Environment Variables

### Core Control

- `ENABLE_REQUEST_LOGGING` - Enable/disable request logging (default: true)
- `ENABLE_RESPONSE_LOGGING` - Enable/disable response logging (default: true)

### Log Levels by Request Type

- `LOG_STATIC_ASSETS` - Static files like CSS, JS, images (default: 'none')
- `LOG_API_ROUTES` - API endpoints (default: 'info')
- `LOG_HEALTH_CHECKS` - Health monitoring (default: 'debug')
- `LOG_AUTH_ROUTES` - Authentication (default: 'info')
- `LOG_OTHER_ROUTES` - Business logic routes (default: 'info')

### Performance Monitoring

- `SLOW_REQUEST_THRESHOLD` - Slow request threshold in ms (default: 1000)

## Example Configurations

### Development (Recommended)

```bash
ENABLE_REQUEST_LOGGING=true
ENABLE_RESPONSE_LOGGING=true
LOG_STATIC_ASSETS=false
LOG_API_ROUTES=info
LOG_HEALTH_CHECKS=debug
LOG_AUTH_ROUTES=info
LOG_OTHER_ROUTES=info
SLOW_REQUEST_THRESHOLD=1000
```

### Production

```bash
ENABLE_REQUEST_LOGGING=true
ENABLE_RESPONSE_LOGGING=true
LOG_STATIC_ASSETS=false
LOG_API_ROUTES=info
LOG_HEALTH_CHECKS=debug
LOG_AUTH_ROUTES=info
LOG_OTHER_ROUTES=info
SLOW_REQUEST_THRESHOLD=1000
```

### Debug/Troubleshooting

```bash
ENABLE_REQUEST_LOGGING=true
ENABLE_RESPONSE_LOGGING=true
LOG_STATIC_ASSETS=true
LOG_API_ROUTES=debug
LOG_HEALTH_CHECKS=debug
LOG_AUTH_ROUTES=debug
LOG_OTHER_ROUTES=debug
SLOW_REQUEST_THRESHOLD=500
```

## What Gets Logged

### Always Logged (if enabled)

- API requests and responses
- Authentication attempts
- Business logic operations
- Performance issues (slow requests)
- Error responses (4xx, 5xx)

### Filtered Out by Default

- Static asset requests (CSS, JS, images)
- Browser favicon requests
- Source map requests

### Smart Log Level Selection

- **Info**: Normal business operations
- **Debug**: Health checks, detailed debugging
- **Warn**: Client errors (4xx), server errors (5xx), slow requests
- **None**: Static assets (when disabled)

## Benefits

1. **Reduced Noise**: No more static asset spam
2. **Performance Monitoring**: Automatic detection of slow requests
3. **Security**: Maintained audit trail for important operations
4. **Flexibility**: Easy to adjust logging levels per environment
5. **Business Focus**: Logs focus on actual business value

## Migration from Old System

The new system is backward compatible. If no environment variables are set, it will:

- Log all requests at 'info' level (same as before)
- Log all responses at 'info' level (same as before)
- Add performance warnings for slow requests (new feature)

To reduce noise immediately, just set:

```bash
LOG_STATIC_ASSETS=false
```
