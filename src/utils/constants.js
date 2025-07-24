// src/utils/constants.js
// Centralized constants for the CoSleepApp

// API Endpoints
export const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://hence-app-production.up.railway.app' 
  : 'http://localhost:3000';

// WebRTC Configuration
export const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

// Connection Settings
export const CONNECTION_TIMEOUT = 30000;
export const MAX_RETRY_COUNT = 3;
export const MAX_AUDIO_CONTEXTS = 3;

// UI States
export const CONNECTION_STATES = {
  IDLE: 'idle',
  SEARCHING: 'searching',
  MATCHED: 'matched',
  CONNECTED: 'connected'
};

export const VOICE_STATES = {
  MUTED: 'muted',
  UNMUTED: 'unmuted',
  SPEAKING: 'speaking'
};

// Local Storage Keys
export const STORAGE_KEYS = {
  ONBOARDING_COMPLETE: 'hence_onboarding_complete',
  USER_ID: 'hence_user_id',
  USER_TYPE: 'hence_user_type',
  DISPLAY_NAME: 'hence_display_name',
  AUTH_TOKEN: 'hence_auth_token',
  USER_PREFERENCES: 'hence_user_preferences',
  CALL_HISTORY: 'hence_call_history'
};

// Analytics Events
export const ANALYTICS_EVENTS = {
  CALL_START: 'call_start',
  CALL_END: 'call_end',
  QUEUE_JOIN: 'queue_join',
  QUEUE_LEAVE: 'queue_leave',
  CONNECTION_ERROR: 'connection_error',
  MUTE_TOGGLE: 'mute_toggle'
};

// Error Messages
export const ERROR_MESSAGES = {
  CONNECTION_FAILED: 'Connection failed. Please try again.',
  NETWORK_ERROR: 'Network error. Check your connection.',
  PERMISSION_DENIED: 'Microphone access denied. Please enable permissions.',
  NO_PARTNERS: 'No partners available. Please try again later.',
  WEBRTC_ERROR: 'WebRTC initialization failed. Please refresh the page.'
};

// UI Configuration
export const UI_CONFIG = {
  DEBOUNCE_DELAY: 300,
  STATUS_UPDATE_INTERVAL: 5000,
  CONNECTION_CHECK_INTERVAL: 1000,
  MAX_VISIBLE_CALLS: 50
}; 