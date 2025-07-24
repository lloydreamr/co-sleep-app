/**
 * Error Handler - Centralized error handling utilities
 * Eliminates duplication of try/catch patterns across route files
 */

/**
 * Standard error response format
 */
function createErrorResponse(message, statusCode = 500, details = null) {
  const error = {
    error: message,
    timestamp: new Date().toISOString()
  };
  
  if (details) {
    error.details = details;
  }
  
  return { statusCode, error };
}

/**
 * Common error types with standard messages and status codes
 */
const ErrorTypes = {
  VALIDATION_ERROR: (message = 'Validation failed') => createErrorResponse(message, 400),
  UNAUTHORIZED: (message = 'Authentication required') => createErrorResponse(message, 401),
  FORBIDDEN: (message = 'Access denied') => createErrorResponse(message, 403),
  NOT_FOUND: (message = 'Resource not found') => createErrorResponse(message, 404),
  CONFLICT: (message = 'Resource already exists') => createErrorResponse(message, 409),
  INTERNAL_ERROR: (message = 'Internal server error') => createErrorResponse(message, 500),
  DATABASE_ERROR: (message = 'Database operation failed') => createErrorResponse(message, 500),
  NETWORK_ERROR: (message = 'Network error') => createErrorResponse(message, 503)
};

/**
 * Async wrapper for route handlers to eliminate try/catch duplication
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    return Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Validate required fields in request body
 */
function validateRequiredFields(body, requiredFields) {
  const missingFields = requiredFields.filter(field => !body[field]);
  
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }
}

/**
 * Validate email format
 */
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }
}

/**
 * Validate password strength
 */
function validatePassword(password) {
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters long');
  }
}

/**
 * Handle database errors with proper logging
 */
function handleDatabaseError(error, operation = 'Database operation') {
  console.error(`${operation} failed:`, error);
  
  // Check for common Prisma/database errors
  if (error.code === 'P2002') {
    throw new Error('A record with this data already exists');
  }
  
  if (error.code === 'P2025') {
    throw new Error('Record not found');
  }
  
  if (error.code === 'P2003') {
    throw new Error('Foreign key constraint failed');
  }
  
  // Generic database error
  throw new Error('Database operation failed');
}

/**
 * Express error middleware - handles all errors in consistent format
 */
function errorMiddleware(err, req, res, next) {
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });
  
  // Check if error is one of our custom error responses
  if (err.statusCode && err.error) {
    return res.status(err.statusCode).json(err.error);
  }
  
  // Handle validation errors
  if (err.message && err.message.includes('required') || err.message.includes('Invalid')) {
    const { statusCode, error } = ErrorTypes.VALIDATION_ERROR(err.message);
    return res.status(statusCode).json(error);
  }
  
  // Handle authentication errors
  if (err.message && (err.message.includes('token') || err.message.includes('Authentication'))) {
    const { statusCode, error } = ErrorTypes.UNAUTHORIZED(err.message);
    return res.status(statusCode).json(error);
  }
  
  // Handle authorization errors
  if (err.message && err.message.includes('Access denied')) {
    const { statusCode, error } = ErrorTypes.FORBIDDEN(err.message);
    return res.status(statusCode).json(error);
  }
  
  // Default to internal server error
  const { statusCode, error } = ErrorTypes.INTERNAL_ERROR();
  res.status(statusCode).json(error);
}

/**
 * Success response helper
 */
function createSuccessResponse(data, message = null) {
  const response = { ...data };
  
  if (message) {
    response.message = message;
  }
  
  return response;
}

module.exports = {
  // Error types
  ErrorTypes,
  
  // Utilities
  asyncHandler,
  createErrorResponse,
  createSuccessResponse,
  
  // Validation helpers
  validateRequiredFields,
  validateEmail,
  validatePassword,
  
  // Error handlers
  handleDatabaseError,
  errorMiddleware
}; 