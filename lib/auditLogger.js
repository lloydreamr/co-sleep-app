/**
 * Audit Logger - Structured logging and monitoring system
 * Phase 3.2: Comprehensive logging for production monitoring
 */
const fs = require('fs');
const path = require('path');

/**
 * Log levels for different types of events
 */
const LogLevel = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG',
  SECURITY: 'SECURITY',
  PERFORMANCE: 'PERFORMANCE',
  AUDIT: 'AUDIT'
};

/**
 * Structured logger class
 */
class AuditLogger {
  constructor(options = {}) {
    this.logLevel = options.logLevel || LogLevel.INFO;
    this.enableConsole = options.enableConsole !== false;
    this.enableFile = options.enableFile || false;
    this.logDirectory = options.logDirectory || './logs';
    this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB
    this.maxFiles = options.maxFiles || 5;
    
    // Create logs directory if file logging is enabled
    if (this.enableFile) {
      this.ensureLogDirectory();
    }
  }

  /**
   * Ensure log directory exists
   */
  ensureLogDirectory() {
    if (!fs.existsSync(this.logDirectory)) {
      fs.mkdirSync(this.logDirectory, { recursive: true });
    }
  }

  /**
   * Create structured log entry
   */
  createLogEntry(level, message, metadata = {}) {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...metadata,
      pid: process.pid,
      memory: this.getMemoryUsage(),
      uptime: process.uptime()
    };
  }

  /**
   * Get current memory usage
   */
  getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100,
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100,
      external: Math.round(usage.external / 1024 / 1024 * 100) / 100
    };
  }

  /**
   * Write log entry
   */
  writeLog(logEntry) {
    const logString = JSON.stringify(logEntry);

    // Console logging
    if (this.enableConsole) {
      const colorMap = {
        [LogLevel.ERROR]: '\x1b[31m',     // Red
        [LogLevel.WARN]: '\x1b[33m',      // Yellow
        [LogLevel.INFO]: '\x1b[36m',      // Cyan
        [LogLevel.DEBUG]: '\x1b[37m',     // White
        [LogLevel.SECURITY]: '\x1b[35m',  // Magenta
        [LogLevel.PERFORMANCE]: '\x1b[32m', // Green
        [LogLevel.AUDIT]: '\x1b[34m'      // Blue
      };

      const color = colorMap[logEntry.level] || '\x1b[37m';
      const reset = '\x1b[0m';
      
      console.log(`${color}[${logEntry.level}]${reset} ${logEntry.timestamp} - ${logEntry.message}`);
      
      if (Object.keys(logEntry).length > 6) { // More than basic fields
        console.log('  Metadata:', JSON.stringify(logEntry, null, 2));
      }
    }

    // File logging
    if (this.enableFile) {
      this.writeToFile(logString + '\n');
    }
  }

  /**
   * Write to log file with rotation
   */
  writeToFile(logString) {
    const logFile = path.join(this.logDirectory, 'app.log');
    
    try {
      // Check file size and rotate if necessary
      if (fs.existsSync(logFile)) {
        const stats = fs.statSync(logFile);
        if (stats.size > this.maxFileSize) {
          this.rotateLogFile(logFile);
        }
      }

      fs.appendFileSync(logFile, logString);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  /**
   * Rotate log files
   */
  rotateLogFile(logFile) {
    try {
      // Shift existing log files
      for (let i = this.maxFiles - 1; i >= 1; i--) {
        const oldFile = `${logFile}.${i}`;
        const newFile = `${logFile}.${i + 1}`;
        
        if (fs.existsSync(oldFile)) {
          if (i === this.maxFiles - 1) {
            fs.unlinkSync(oldFile); // Delete oldest
          } else {
            fs.renameSync(oldFile, newFile);
          }
        }
      }

      // Move current log to .1
      if (fs.existsSync(logFile)) {
        fs.renameSync(logFile, `${logFile}.1`);
      }
    } catch (error) {
      console.error('Failed to rotate log file:', error);
    }
  }

  /**
   * Log methods for different levels
   */
  error(message, metadata = {}) {
    this.writeLog(this.createLogEntry(LogLevel.ERROR, message, metadata));
  }

  warn(message, metadata = {}) {
    this.writeLog(this.createLogEntry(LogLevel.WARN, message, metadata));
  }

  info(message, metadata = {}) {
    this.writeLog(this.createLogEntry(LogLevel.INFO, message, metadata));
  }

  debug(message, metadata = {}) {
    if (this.logLevel === LogLevel.DEBUG) {
      this.writeLog(this.createLogEntry(LogLevel.DEBUG, message, metadata));
    }
  }

  security(message, metadata = {}) {
    this.writeLog(this.createLogEntry(LogLevel.SECURITY, message, {
      ...metadata,
      alert: true
    }));
  }

  performance(message, metadata = {}) {
    this.writeLog(this.createLogEntry(LogLevel.PERFORMANCE, message, metadata));
  }

  audit(message, metadata = {}) {
    this.writeLog(this.createLogEntry(LogLevel.AUDIT, message, {
      ...metadata,
      audit: true
    }));
  }
}

/**
 * Request logging middleware
 */
function requestLogger(logger) {
  return (req, res, next) => {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substr(2, 9);

    // Log incoming request
    logger.info('Incoming request', {
      requestId,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      contentLength: req.get('Content-Length'),
      userId: req.user?.id
    });

    // Override res.end to log response
    const originalEnd = res.end;
    res.end = function(chunk, encoding) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Log response
      logger.info('Request completed', {
        requestId,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        contentLength: res.get('Content-Length'),
        userId: req.user?.id
      });

      // Log slow requests as performance issues
      if (duration > 5000) { // 5 seconds
        logger.performance('Slow request detected', {
          requestId,
          method: req.method,
          url: req.originalUrl,
          duration: `${duration}ms`,
          statusCode: res.statusCode
        });
      }

      originalEnd.call(this, chunk, encoding);
    };

    next();
  };
}

/**
 * Error logging middleware
 */
function errorLogger(logger) {
  return (error, req, res, next) => {
    logger.error('Unhandled error', {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      request: {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.id
      }
    });

    next(error);
  };
}

/**
 * Authentication audit logger
 */
function authAuditLogger(logger) {
  return {
    logLogin: (userId, ip, userAgent, success = true) => {
      logger.audit(success ? 'User login successful' : 'User login failed', {
        userId,
        ip,
        userAgent,
        success,
        event: 'login'
      });
    },

    logLogout: (userId, ip) => {
      logger.audit('User logout', {
        userId,
        ip,
        event: 'logout'
      });
    },

    logRegistration: (userId, email, ip) => {
      logger.audit('User registration', {
        userId,
        email,
        ip,
        event: 'registration'
      });
    },

    logPasswordChange: (userId, ip) => {
      logger.audit('Password change', {
        userId,
        ip,
        event: 'password_change'
      });
    }
  };
}

/**
 * Security event logger
 */
function securityLogger(logger) {
  return {
    logSuspiciousActivity: (ip, userAgent, details) => {
      logger.security('Suspicious activity detected', {
        ip,
        userAgent,
        details,
        event: 'suspicious_activity'
      });
    },

    logRateLimitExceeded: (ip, endpoint, limit) => {
      logger.security('Rate limit exceeded', {
        ip,
        endpoint,
        limit,
        event: 'rate_limit_exceeded'
      });
    },

    logInvalidInput: (ip, endpoint, input) => {
      logger.security('Invalid input detected', {
        ip,
        endpoint,
        input: typeof input === 'string' ? input.substring(0, 200) : input,
        event: 'invalid_input'
      });
    }
  };
}

/**
 * Create default logger instance
 */
function createLogger(options = {}) {
  return new AuditLogger({
    enableConsole: true,
    enableFile: process.env.NODE_ENV === 'production',
    logLevel: process.env.LOG_LEVEL || LogLevel.INFO,
    ...options
  });
}

module.exports = {
  AuditLogger,
  LogLevel,
  createLogger,
  requestLogger,
  errorLogger,
  authAuditLogger,
  securityLogger
}; 