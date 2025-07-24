// src/utils/helpers.js
// Utility functions for the CoSleepApp

/**
 * Debounce function to limit rapid function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Delay in milliseconds
 * @returns {Function} - Debounced function
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Generate unique ID for calls and sessions
 * @returns {string} - Unique ID
 */
export const generateCallId = () => {
  return `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Format date for display
 * @param {Date} date - Date to format
 * @returns {string} - Formatted date string
 */
export const formatDate = (date) => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

/**
 * Format duration for display
 * @param {number} seconds - Duration in seconds
 * @returns {string} - Formatted duration string
 */
export const formatDuration = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

/**
 * Check if user has completed onboarding
 * @returns {boolean} - Onboarding completion status
 */
export const isOnboardingComplete = () => {
  const onboardingComplete = localStorage.getItem('hence_onboarding_complete');
  const userId = localStorage.getItem('hence_user_id');
  const userType = localStorage.getItem('hence_user_type');
  return !!(onboardingComplete && userId && userType);
};

/**
 * Get user authentication data
 * @returns {Object} - User auth data
 */
export const getUserAuthData = () => {
  return {
    userId: localStorage.getItem('hence_user_id'),
    userType: localStorage.getItem('hence_user_type'),
    displayName: localStorage.getItem('hence_display_name'),
    authToken: localStorage.getItem('hence_auth_token')
  };
};

/**
 * Save user authentication data
 * @param {Object} data - User auth data
 */
export const saveUserAuthData = (data) => {
  if (data.userId) localStorage.setItem('hence_user_id', data.userId);
  if (data.userType) localStorage.setItem('hence_user_type', data.userType);
  if (data.displayName) localStorage.setItem('hence_display_name', data.displayName);
  if (data.authToken) localStorage.setItem('hence_auth_token', data.authToken);
};

/**
 * Clear user authentication data
 */
export const clearUserAuthData = () => {
  localStorage.removeItem('hence_user_id');
  localStorage.removeItem('hence_user_type');
  localStorage.removeItem('hence_display_name');
  localStorage.removeItem('hence_auth_token');
  localStorage.removeItem('hence_onboarding_complete');
};

/**
 * Get connection quality score
 * @param {RTCPeerConnection} peerConnection - WebRTC peer connection
 * @returns {number} - Quality score (0-100)
 */
export const getConnectionQualityScore = (peerConnection) => {
  if (!peerConnection) return 0;
  
  const stats = peerConnection.getStats();
  let score = 100;
  
  // Basic quality assessment
  if (peerConnection.connectionState === 'connected') {
    score = 90;
  } else if (peerConnection.connectionState === 'connecting') {
    score = 70;
  } else {
    score = 30;
  }
  
  return Math.max(0, Math.min(100, score));
};

/**
 * Detect device type
 * @returns {string} - Device type (mobile, tablet, desktop)
 */
export const detectDeviceType = () => {
  const userAgent = navigator.userAgent;
  const screenWidth = window.innerWidth;
  
  if (/Mobi|Android/i.test(userAgent)) {
    return 'mobile';
  } else if (/Tablet|iPad/i.test(userAgent) || screenWidth <= 768) {
    return 'tablet';
  } else {
    return 'desktop';
  }
};

/**
 * Validate form data
 * @param {Object} data - Form data to validate
 * @returns {Object} - Validation result
 */
export const validateFormData = (data) => {
  const errors = {};
  
  Object.keys(data).forEach(key => {
    if (!data[key] || data[key].trim() === '') {
      errors[key] = `${key.charAt(0).toUpperCase() + key.slice(1)} is required`;
    }
  });
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Update last activity timestamp
 */
export const updateLastActivity = async () => {
  try {
    const userId = localStorage.getItem('hence_user_id');
    if (userId) {
      localStorage.setItem('hence_last_activity', Date.now().toString());
    }
  } catch (error) {
    console.error('Error updating last activity:', error);
  }
}; 