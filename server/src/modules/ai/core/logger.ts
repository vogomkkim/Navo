export class Logger {
  constructor(name, level = 'info') {
    this.name = name;
    this.level = level;
  }

  info(message, meta = {}) {
    console.log(`[${this.name}] INFO: ${message}`, meta);
  }

  error(message, meta = {}) {
    console.error(`[${this.name}] ERROR: ${message}`, meta);
  }

  debug(message, meta = {}) {
    if (this.level === 'debug') {
      console.log(`[${this.name}] DEBUG: ${message}`, meta);
    }
  }

  warn(message, meta = {}) {
    console.warn(`[${this.name}] WARN: ${message}`, meta);
  }
}

export function createLogger(name, level = 'info') {
  return new Logger(name, level);
}
