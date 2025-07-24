/**
 * Analytics Routes - Optimized version using analytics service
 * Reduced from 401 lines to under 150 lines by extracting business logic
 */
const express = require('express');
const router = express.Router();
const { authenticateUser, verifiedUserOnly, flexibleAuth } = require('../lib/auth');
const { 
  asyncHandler, 
  ErrorTypes, 
  createSuccessResponse 
} = require('../lib/errorHandler');
const { 
  validateRequiredFields,
  sanitizeString 
} = require('../lib/validationUtils');
const {
  trackBehaviorEvent,
  trackPerformanceMetrics,
  getAnalyticsDashboard,
  getUsagePatterns,
  getPerformanceInsights,
  generateUsagePatterns
} = require('../lib/analyticsService');

// POST /api/analytics/events - Track user behavior events
router.post('/events', flexibleAuth, asyncHandler(async (req, res) => {
  const {
    eventType,
    eventCategory,
    eventData = {},
    sessionId,
    userAgent,
    deviceType
  } = req.body;

  // Validate required fields
  validateRequiredFields(req.body, ['eventType', 'eventCategory']);

  // Get user IP for analytics (anonymized)
  const ipAddress = req.ip || req.connection.remoteAddress;
  
  const eventInfo = {
    eventType: sanitizeString(eventType, 50),
    eventCategory: sanitizeString(eventCategory, 50),
    eventData,
    sessionId: sanitizeString(sessionId, 100),
    userAgent: userAgent || req.get('User-Agent'),
    deviceType,
    ipAddress
  };

  const result = await trackBehaviorEvent(eventInfo, { userId: req.user?.id });
  
  res.json(createSuccessResponse(result));
}));

// POST /api/analytics/performance - Track performance metrics
router.post('/performance', flexibleAuth, asyncHandler(async (req, res) => {
  const {
    loadTime,
    renderTime,
    connectionTime,
    audioLatency,
    errorCount,
    memoryUsage,
    deviceSpecs = {}
  } = req.body;

  const metricsData = {
    loadTime: Number(loadTime),
    renderTime: Number(renderTime),
    connectionTime: Number(connectionTime),
    audioLatency: Number(audioLatency),
    errorCount: Number(errorCount) || 0,
    memoryUsage: Number(memoryUsage),
    deviceSpecs
  };

  const result = await trackPerformanceMetrics(metricsData, { userId: req.user?.id });
  
  res.json(createSuccessResponse(result));
}));

// GET /api/analytics/dashboard - Get analytics dashboard (verified users only)
router.get('/dashboard', authenticateUser, verifiedUserOnly, asyncHandler(async (req, res) => {
  const dashboardData = await getAnalyticsDashboard(req.user.id);
  
  res.json(createSuccessResponse({ dashboard: dashboardData }));
}));

// GET /api/analytics/usage-patterns - Get usage patterns 
router.get('/usage-patterns', authenticateUser, asyncHandler(async (req, res) => {
  const patterns = await getUsagePatterns(req.user.id);
  
  res.json(createSuccessResponse({ patterns }));
}));

// GET /api/analytics/performance-insights - Get performance insights (public)
router.get('/performance-insights', asyncHandler(async (req, res) => {
  const insights = await getPerformanceInsights();
  
  res.json(createSuccessResponse({ insights }));
}));

// POST /api/analytics/generate-patterns - Generate usage patterns (public)
router.post('/generate-patterns', asyncHandler(async (req, res) => {
  const { timeRange = '30d', userId = null } = req.body;
  
  // Validate time range
  const validRanges = ['7d', '30d', '90d'];
  if (!validRanges.includes(timeRange)) {
    const { statusCode, error } = ErrorTypes.VALIDATION_ERROR('Invalid time range. Must be 7d, 30d, or 90d');
    return res.status(statusCode).json(error);
  }

  const patterns = await generateUsagePatterns({ timeRange, userId });
  
  res.json(createSuccessResponse({ patterns }));
}));

module.exports = router; 