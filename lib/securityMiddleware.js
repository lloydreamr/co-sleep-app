/**
 * Security Middleware - Production-grade security enhancements
 * Phase 3.1: Enhanced security measures for production hardening
 */
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const helmet = require('helmet');
const { sanitizeString } = require('./validationUtils');

/**
 * Enhanced rate limiting for different endpoint types
 */
const createRateLimiters = () => {
  // Strict rate limiting for authentication endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 login attempts per 15 minutes
    message: {
      error: 'Too many authentication attempts, please try again later.',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.ip + ':auth'
  });

  // Moderate rate limiting for API endpoints
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 API requests per 15 minutes
    message: {
      error: 'Too many API requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path === '/health' || req.path === '/ping'
  });

  // Generous rate limiting for static content
  const staticLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 500, // 500 static requests per 5 minutes
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.ip + ':static'
  });

  // Slow down for excessive requests (before hitting rate limit)
  const speedLimiter = slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 50, // allow 50 requests per 15 minutes at full speed
    delayMs: () => 100, // Fixed: new express-slow-down v2 format
    maxDelayMs: 3000, // max delay of 3 seconds
    skip: (req) => req.path === '/health' || req.path === '/ping',
    validate: { delayMs: false } // Disable warning message
  });

  return {
    authLimiter,
    apiLimiter,
    staticLimiter,
    speedLimiter
  };
};

/**
 * Enhanced helmet configuration for production security
 */
const getSecurityHeaders = () => {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", "wss:", "ws:", "https:"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // Required for inline event handlers
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "https:"],
        fontSrc: ["'self'", "https:", "data:", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'", "https://www.soundjay.com", "https:"],
        frameSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"] // Prevent clickjacking
      },
      reportOnly: false
    },
    crossOriginEmbedderPolicy: false, // Required for WebRTC
    hsts: process.env.NODE_ENV === 'production' ? {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    } : false,
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    permittedCrossDomainPolicies: false
  });
};

/**
 * Input sanitization middleware
 */
const sanitizeInput = (req, res, next) => {
  // Sanitize query parameters
  if (req.query) {
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === 'string') {
        req.query[key] = sanitizeString(value, 1000);
      }
    }
  }

  // Sanitize URL parameters
  if (req.params) {
    for (const [key, value] of Object.entries(req.params)) {
      if (typeof value === 'string') {
        req.params[key] = sanitizeString(value, 200);
      }
    }
  }

  // Sanitize request body (selective sanitization)
  if (req.body && typeof req.body === 'object') {
    sanitizeBodyRecursively(req.body);
  }

  next();
};

/**
 * Recursively sanitize object properties
 */
function sanitizeBodyRecursively(obj, depth = 0) {
  if (depth > 10) return; // Prevent deep recursion

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      // Only sanitize certain fields, preserve passwords and tokens
      const sensitiveFields = ['password', 'token', 'jwt', 'secret', 'key'];
      const shouldSanitize = !sensitiveFields.some(field => 
        key.toLowerCase().includes(field.toLowerCase())
      );
      
      if (shouldSanitize) {
        obj[key] = sanitizeString(value, 5000);
      }
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitizeBodyRecursively(value, depth + 1);
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (typeof item === 'string') {
          value[index] = sanitizeString(item, 1000);
        } else if (typeof item === 'object' && item !== null) {
          sanitizeBodyRecursively(item, depth + 1);
        }
      });
    }
  }
}

/**
 * Security headers middleware for API responses
 */
const securityHeaders = (req, res, next) => {
  // Additional security headers
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });

  // Remove server information
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');

  next();
};

/**
 * Request size limiting middleware
 */
const requestSizeLimiter = (options = {}) => {
  const {
    jsonLimit = '1mb',
    urlEncodedLimit = '1mb',
    fileUploadLimit = '10mb'
  } = options;

  return {
    jsonLimit,
    urlEncodedLimit,
    fileUploadLimit
  };
};

/**
 * IP whitelist/blacklist middleware
 */
const ipFilter = (options = {}) => {
  const { whitelist = [], blacklist = [] } = options;

  return (req, res, next) => {
    const clientIp = req.ip || req.connection.remoteAddress;

    // Check blacklist first
    if (blacklist.includes(clientIp)) {
      return res.status(403).json({
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    // If whitelist is specified, check it
    if (whitelist.length > 0 && !whitelist.includes(clientIp)) {
      return res.status(403).json({
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
};

/**
 * Suspicious activity detection
 */
const suspiciousActivityDetector = (req, res, next) => {
  const suspiciousPatterns = [
    /(\<script\>)/gi,
    /(javascript\:)/gi,
    /(eval\()/gi,
    /(expression\()/gi,
    /(\<iframe)/gi,
    /(onload\=)/gi,
    /(onerror\=)/gi,
    /(\bselect\b.*\bfrom\b)/gi,
    /(\bunion\b.*\bselect\b)/gi,
    /(\bdrop\b.*\btable\b)/gi
  ];

  const userAgent = req.get('User-Agent') || '';
  const requestUrl = req.originalUrl || '';
  const requestBody = JSON.stringify(req.body || {});

  // Check for suspicious patterns
  const isSuspicious = suspiciousPatterns.some(pattern => 
    pattern.test(userAgent) || 
    pattern.test(requestUrl) || 
    pattern.test(requestBody)
  );

  if (isSuspicious) {
    console.warn('🚨 Suspicious activity detected:', {
      ip: req.ip,
      userAgent,
      url: requestUrl,
      timestamp: new Date().toISOString()
    });

    return res.status(400).json({
      error: 'Invalid request',
      timestamp: new Date().toISOString()
    });
  }

  next();
};

/**
 * Request validation middleware
 */
const requestValidator = (req, res, next) => {
  // Validate Content-Type for POST/PUT requests
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.get('Content-Type');
    
    if (!contentType) {
      return res.status(400).json({
        error: 'Content-Type header is required',
        timestamp: new Date().toISOString()
      });
    }

    if (!contentType.includes('application/json') && 
        !contentType.includes('application/x-www-form-urlencoded') &&
        !contentType.includes('multipart/form-data')) {
      return res.status(400).json({
        error: 'Unsupported Content-Type',
        timestamp: new Date().toISOString()
      });
    }
  }

  // Validate request size
  const contentLength = parseInt(req.get('Content-Length') || '0');
  if (contentLength > 50 * 1024 * 1024) { // 50MB max
    return res.status(413).json({
      error: 'Request entity too large',
      timestamp: new Date().toISOString()
    });
  }

  next();
};

module.exports = {
  createRateLimiters,
  getSecurityHeaders,
  sanitizeInput,
  securityHeaders,
  requestSizeLimiter,
  ipFilter,
  suspiciousActivityDetector,
  requestValidator
}; 