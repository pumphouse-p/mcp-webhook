/**
 * Structured logging utility for MCP Webhook Server
 */

// Log levels
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

// Get configured log level from environment
const configuredLevel = process.env.LOG_LEVEL?.toUpperCase() || "INFO";
const currentLogLevel = LOG_LEVELS[configuredLevel] || LOG_LEVELS.INFO;

// Configuration
const CONFIG = {
  level: currentLogLevel,
  enableRequestLogging: process.env.LOG_REQUESTS !== "false", // Default true
  enableResponseLogging: process.env.LOG_RESPONSES !== "false", // Default true
  enableBodyLogging: process.env.LOG_BODIES === "true", // Default false (can be verbose)
  prettyPrint: process.env.LOG_PRETTY === "true", // Default false (JSON)
  maxBodyLength: parseInt(process.env.LOG_MAX_BODY_LENGTH || "1000", 10),
};

/**
 * Get current timestamp in ISO format
 */
function getTimestamp() {
  return new Date().toISOString();
}

/**
 * Truncate large strings
 */
function truncate(str, maxLength) {
  if (typeof str !== "string") {
    str = JSON.stringify(str);
  }
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength) + `... (${str.length - maxLength} more chars)`;
}

/**
 * Format log entry
 */
function formatLog(level, message, data = {}) {
  const entry = {
    timestamp: getTimestamp(),
    level,
    message,
    ...data,
  };

  if (CONFIG.prettyPrint) {
    return JSON.stringify(entry, null, 2);
  }
  return JSON.stringify(entry);
}

/**
 * Write log to stderr
 */
function writeLog(level, message, data) {
  const levelValue = LOG_LEVELS[level] || LOG_LEVELS.INFO;
  if (levelValue >= CONFIG.level) {
    console.error(formatLog(level, message, data));
  }
}

/**
 * Logger class
 */
class Logger {
  constructor(context = {}) {
    this.context = context;
  }

  /**
   * Create child logger with additional context
   */
  child(additionalContext) {
    return new Logger({ ...this.context, ...additionalContext });
  }

  /**
   * Log debug message
   */
  debug(message, data = {}) {
    writeLog("DEBUG", message, { ...this.context, ...data });
  }

  /**
   * Log info message
   */
  info(message, data = {}) {
    writeLog("INFO", message, { ...this.context, ...data });
  }

  /**
   * Log warning message
   */
  warn(message, data = {}) {
    writeLog("WARN", message, { ...this.context, ...data });
  }

  /**
   * Log error message
   */
  error(message, error, data = {}) {
    const errorData = {
      ...this.context,
      ...data,
    };

    if (error instanceof Error) {
      errorData.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    } else if (error) {
      errorData.error = error;
    }

    writeLog("ERROR", message, errorData);
  }

  /**
   * Log HTTP request
   */
  logRequest(req, requestId) {
    if (!CONFIG.enableRequestLogging) return;

    const data = {
      requestId,
      method: req.method,
      path: req.path || req.url,
      ip: req.ip,
      headers: {
        "content-type": req.headers["content-type"],
        "user-agent": req.headers["user-agent"],
        authorization: req.headers.authorization ? "[REDACTED]" : undefined,
        accept: req.headers.accept,
      },
    };

    if (CONFIG.enableBodyLogging && req.body) {
      data.body = truncate(
        typeof req.body === "string" ? req.body : JSON.stringify(req.body),
        CONFIG.maxBodyLength
      );
    }

    this.info("HTTP Request", data);
  }

  /**
   * Log HTTP response
   */
  logResponse(req, statusCode, responseBody, requestId, duration) {
    if (!CONFIG.enableResponseLogging) return;

    const data = {
      requestId,
      method: req.method,
      path: req.path || req.url,
      ip: req.ip,
      statusCode,
      duration: `${duration}ms`,
    };

    if (CONFIG.enableBodyLogging && responseBody) {
      data.responseBody = truncate(
        typeof responseBody === "string"
          ? responseBody
          : JSON.stringify(responseBody),
        CONFIG.maxBodyLength
      );
    }

    const level = statusCode >= 400 ? "WARN" : "INFO";
    writeLog(level, "HTTP Response", { ...this.context, ...data });
  }

  /**
   * Log MCP request
   */
  logMcpRequest(method, params, requestId) {
    const data = {
      requestId,
      mcpMethod: method,
    };

    if (CONFIG.enableBodyLogging && params) {
      data.params = truncate(JSON.stringify(params), CONFIG.maxBodyLength);
    }

    this.debug("MCP Request", data);
  }

  /**
   * Log MCP response
   */
  logMcpResponse(method, result, requestId, duration) {
    const data = {
      requestId,
      mcpMethod: method,
      duration: `${duration}ms`,
    };

    if (CONFIG.enableBodyLogging && result) {
      data.result = truncate(JSON.stringify(result), CONFIG.maxBodyLength);
    }

    this.debug("MCP Response", data);
  }

  /**
   * Log tool execution
   */
  logToolExecution(toolName, args, requestId) {
    const data = {
      requestId,
      tool: toolName,
    };

    if (CONFIG.enableBodyLogging && args) {
      const safeArgs = { ...args };
      // Redact sensitive fields
      if (safeArgs.basic_auth) {
        safeArgs.basic_auth = { username: "[REDACTED]", password: "[REDACTED]" };
      }
      if (safeArgs.api_key) {
        safeArgs.api_key = { ...safeArgs.api_key, key: "[REDACTED]" };
      }
      data.arguments = truncate(JSON.stringify(safeArgs), CONFIG.maxBodyLength);
    }

    this.info("Tool Execution", data);
  }

  /**
   * Log tool result
   */
  logToolResult(toolName, statusCode, requestId, duration, error) {
    const data = {
      requestId,
      tool: toolName,
      statusCode,
      duration: `${duration}ms`,
      success: !error && statusCode >= 200 && statusCode < 300,
    };

    if (error) {
      data.error = error.message;
    }

    const level = error || statusCode >= 400 ? "WARN" : "INFO";
    writeLog(level, "Tool Result", { ...this.context, ...data });
  }

  /**
   * Log authentication attempt
   */
  logAuthAttempt(success, reason, requestId, ip = null) {
    const data = {
      requestId,
      success,
      reason: reason || (success ? "valid_credentials" : "invalid_credentials"),
    };

    if (ip) {
      data.ip = ip;
    }

    const level = success ? "INFO" : "WARN";
    writeLog(level, "Authentication", { ...this.context, ...data });
  }
}

/**
 * Generate unique request ID
 */
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create default logger instance
 */
const defaultLogger = new Logger();

export { Logger, defaultLogger, generateRequestId, CONFIG as logConfig };
