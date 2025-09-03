# Navo Logging Guide

This guide provides a comprehensive overview of the logging system in Navo, from quick setup to detailed configuration.

## 🚀 Quick Start Guide

Get your logs cleaned up immediately with these recommended settings.

### Recommended Configurations

**1. Basic Setup (Default)**
Add this to your `.env` file to reduce noise while keeping essential information:
```bash
# .env file
LOG_LEVEL=info
LOG_STATIC_ASSETS=false
```

**2. Development Setup**
For more detailed logs during development:
```bash
# .env file
LOG_LEVEL=info
LOG_STATIC_ASSETS=false
LOG_API_ROUTES=info
LOG_HEALTH_CHECKS=debug
```

**3. Production Setup**
In a production environment, focus on warnings and errors:
```bash
# .env file
LOG_LEVEL=warn
LOG_STATIC_ASSETS=false
ENABLE_REQUEST_LOGGING=true
ENABLE_RESPONSE_LOGGING=true
```

### Checking Current Log Status
```bash
# Check the current log level
echo $LOG_LEVEL

# See the settings in action
npm run dev
```

### Quick Tips
1.  **Development**: Use `LOG_LEVEL=info` to see only necessary information.
2.  **Troubleshooting**: Switch to `LOG_LEVEL=debug` to get all details.
3.  **Production**: Set `LOG_LEVEL=warn` to focus on important alerts.
4.  **Static Assets**: Always keep `LOG_STATIC_ASSETS=false` to eliminate noise.

---

## ⚙️ Detailed Configuration

The intelligent logging middleware automatically filters and categorizes HTTP requests to reduce noise while maintaining visibility into important business logic and performance issues.

### Log Levels Explained

| Level   | Description              | Examples                               |
| ------- | ------------------------ | -------------------------------------- |
| `error` | Errors only              | Database connection failure, server crash |
| `warn`  | Warnings + Errors        | Slow requests, 4xx/5xx HTTP errors     |
| `info`  | Info + Warnings + Errors | API requests, auth attempts, server start |
| `debug` | All logs                 | Detailed parameters, verbose debug info |

### Core Environment Variables

#### Master Controls
- `LOG_LEVEL`: Sets the global logging threshold (e.g., `info`, `warn`, `debug`).
- `ENABLE_REQUEST_LOGGING`: Globally enables/disables request logging (default: `true`).
- `ENABLE_RESPONSE_LOGGING`: Globally enables/disables response logging (default: `true`).

#### Granular Controls by Request Type
- `LOG_STATIC_ASSETS`: Logging for static files like CSS, JS, images (default: `'none'`).
- `LOG_API_ROUTES`: Logging for API endpoints (default: `'info'`).
- `LOG_HEALTH_CHECKS`: Logging for health monitoring endpoints (default: `'debug'`).
- `LOG_AUTH_ROUTES`: Logging for authentication routes (default: `'info'`).
- `LOG_OTHER_ROUTES`: Logging for all other business logic routes (default: `'info'`).

#### Performance Monitoring
- `SLOW_REQUEST_THRESHOLD`: Sets the threshold in milliseconds for flagging a request as "slow" (default: `1000`).

### What Gets Logged

#### Always Logged (if enabled)
- API requests and responses
- Authentication attempts
- Business logic operations
- Performance issues (slow requests)
- Error responses (4xx, 5xx)

#### Filtered Out by Default
- Static asset requests (CSS, JS, images)
- Browser favicon requests
- Source map requests

### Benefits
1.  **Reduced Noise**: No more static asset spam.
2.  **Performance Monitoring**: Automatic detection of slow requests.
3.  **Security**: Maintained audit trail for important operations.
4.  **Flexibility**: Easy to adjust logging levels per environment.
5.  **Business Focus**: Logs focus on actual business value.
