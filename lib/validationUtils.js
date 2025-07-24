/**
 * Validation Utils - Centralized input validation
 * Eliminates duplication of validation logic across route files
 */

/**
 * User registration validation
 */
function validateRegistrationInput({ email, username, name, password }) {
  const errors = [];
  
  // Required fields
  if (!email) errors.push('Email is required');
  if (!password) errors.push('Password is required');
  
  // Email format validation
  if (email && !isValidEmail(email)) {
    errors.push('Invalid email format');
  }
  
  // Password strength validation
  if (password && password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }
  
  // Username validation (optional but must be valid if provided)
  if (username && !isValidUsername(username)) {
    errors.push('Username must be 3-20 characters and contain only letters, numbers, and underscores');
  }
  
  // Name validation (optional but must be valid if provided)
  if (name && name.length > 100) {
    errors.push('Name must be less than 100 characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * User login validation
 */
function validateLoginInput({ email, password }) {
  const errors = [];
  
  if (!email) errors.push('Email is required');
  if (!password) errors.push('Password is required');
  
  if (email && !isValidEmail(email)) {
    errors.push('Invalid email format');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * User profile update validation
 */
function validateProfileUpdateInput(data) {
  const errors = [];
  const {
    name,
    username,
    displayName,
    timezone,
    sleepTime,
    wakeTime,
    disconnectTime
  } = data;
  
  // Name validation
  if (name && (typeof name !== 'string' || name.length > 100)) {
    errors.push('Name must be a string with less than 100 characters');
  }
  
  // Username validation
  if (username && !isValidUsername(username)) {
    errors.push('Username must be 3-20 characters and contain only letters, numbers, and underscores');
  }
  
  // Display name validation
  if (displayName && (typeof displayName !== 'string' || displayName.length > 50)) {
    errors.push('Display name must be a string with less than 50 characters');
  }
  
  // Timezone validation
  if (timezone && !isValidTimezone(timezone)) {
    errors.push('Invalid timezone format');
  }
  
  // Time validation
  if (sleepTime && !isValidTimeFormat(sleepTime)) {
    errors.push('Sleep time must be in HH:MM format');
  }
  
  if (wakeTime && !isValidTimeFormat(wakeTime)) {
    errors.push('Wake time must be in HH:MM format');
  }
  
  // Disconnect time validation (in minutes)
  if (disconnectTime !== undefined && (!Number.isInteger(disconnectTime) || disconnectTime < 1 || disconnectTime > 1440)) {
    errors.push('Disconnect time must be between 1 and 1440 minutes');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Email format validation
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Username format validation
 */
function isValidUsername(username) {
  if (typeof username !== 'string' || username.length < 3 || username.length > 20) {
    return false;
  }
  
  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  return usernameRegex.test(username);
}

/**
 * Time format validation (HH:MM)
 */
function isValidTimeFormat(time) {
  if (typeof time !== 'string') return false;
  
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}

/**
 * Basic timezone validation
 */
function isValidTimezone(timezone) {
  if (typeof timezone !== 'string') return false;
  
  // Basic check for common timezone formats
  const timezoneRegex = /^[A-Za-z_]+\/[A-Za-z_]+$|^UTC$|^GMT[+-]\d{1,2}$/;
  return timezoneRegex.test(timezone);
}

/**
 * Sanitize string input (remove harmful characters)
 */
function sanitizeString(input, maxLength = 1000) {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .substring(0, maxLength)
    .replace(/[<>]/g, ''); // Remove potential HTML tags
}

/**
 * Validate pagination parameters
 */
function validatePaginationParams({ page, limit }) {
  const errors = [];
  
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  
  if (page !== undefined && (isNaN(pageNum) || pageNum < 1)) {
    errors.push('Page must be a positive integer');
  }
  
  if (limit !== undefined && (isNaN(limitNum) || limitNum < 1 || limitNum > 100)) {
    errors.push('Limit must be between 1 and 100');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    page: pageNum || 1,
    limit: limitNum || 20
  };
}

/**
 * Validate date range parameters
 */
function validateDateRange({ startDate, endDate }) {
  const errors = [];
  
  let start = null;
  let end = null;
  
  if (startDate) {
    start = new Date(startDate);
    if (isNaN(start.getTime())) {
      errors.push('Invalid start date format');
    }
  }
  
  if (endDate) {
    end = new Date(endDate);
    if (isNaN(end.getTime())) {
      errors.push('Invalid end date format');
    }
  }
  
  if (start && end && start > end) {
    errors.push('Start date must be before end date');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    startDate: start,
    endDate: end
  };
}

module.exports = {
  // Input validation functions
  validateRegistrationInput,
  validateLoginInput,
  validateProfileUpdateInput,
  validatePaginationParams,
  validateDateRange,
  
  // Individual validators
  isValidEmail,
  isValidUsername,
  isValidTimeFormat,
  isValidTimezone,
  
  // Utility functions
  sanitizeString
}; 