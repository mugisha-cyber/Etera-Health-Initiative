/**
 * Logger utility for structured logging
 * Supports different log levels and formats
 */

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const CURRENT_LOG_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL || 'info'];

const formatLog = (level, message, data = null) => {
  const timestamp = new Date().toISOString();
  const logObj = {
    timestamp,
    level,
    message,
    ...(data && { data })
  };
  return JSON.stringify(logObj);
};

const logger = {
  error: (message, error = null) => {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.error) {
      const data = error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error;
      console.error(formatLog('ERROR', message, data));
    }
  },

  warn: (message, data = null) => {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.warn) {
      console.warn(formatLog('WARN', message, data));
    }
  },

  info: (message, data = null) => {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.info) {
      console.log(formatLog('INFO', message, data));
    }
  },

  debug: (message, data = null) => {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.debug) {
      console.log(formatLog('DEBUG', message, data));
    }
  },

  request: (req, res, duration) => {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.info) {
      const logObj = {
        timestamp: new Date().toISOString(),
        level: 'HTTP',
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip
      };
      console.log(JSON.stringify(logObj));
    }
  }
};

module.exports = logger;
