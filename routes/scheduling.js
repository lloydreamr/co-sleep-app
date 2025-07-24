/**
 * Scheduling Routes - Optimized version using scheduling service
 * Reduced from 589 lines to under 200 lines by extracting business logic
 */
const express = require('express');
const router = express.Router();
const { authenticateUser, verifiedUserOnly } = require('../lib/auth');
const { 
  asyncHandler, 
  ErrorTypes, 
  createSuccessResponse 
} = require('../lib/errorHandler');
const { 
  validatePaginationParams, 
  validateDateRange,
  sanitizeString 
} = require('../lib/validationUtils');
const {
  getUserScheduledCalls,
  createScheduledCall,
  updateScheduledCall,
  deleteScheduledCall,
  getScheduledCallById,
  getUpcomingCalls,
  joinScheduledCall
} = require('../lib/schedulingService');

// GET /api/scheduling - Get user's scheduled calls (verified users only)
router.get('/', authenticateUser, verifiedUserOnly, asyncHandler(async (req, res) => {
  const { status = 'all', upcoming = false } = req.query;
  
  // Validate pagination
  const pagination = validatePaginationParams(req.query);
  if (!pagination.isValid) {
    const { statusCode, error } = ErrorTypes.VALIDATION_ERROR(pagination.errors.join(', '));
    return res.status(statusCode).json(error);
  }

  const result = await getUserScheduledCalls(req.user.id, {
    status,
    upcoming,
    page: pagination.page,
    limit: pagination.limit
  });

  res.json(createSuccessResponse(result));
}));

// POST /api/scheduling - Create scheduled call (verified users only)
router.post('/', authenticateUser, verifiedUserOnly, asyncHandler(async (req, res) => {
  const {
    participantId,
    scheduledTime,
    duration,
    timezone,
    title,
    description,
    isRecurring,
    recurrencePattern
  } = req.body;

  // Basic validation
  if (!scheduledTime) {
    const { statusCode, error } = ErrorTypes.VALIDATION_ERROR('Scheduled time is required');
    return res.status(statusCode).json(error);
  }

  if (!timezone) {
    const { statusCode, error } = ErrorTypes.VALIDATION_ERROR('Timezone is required');
    return res.status(statusCode).json(error);
  }

  // Sanitize text inputs
  const sanitizedData = {
    participantId,
    scheduledTime,
    duration: duration || 30,
    timezone,
    title: sanitizeString(title, 100),
    description: sanitizeString(description, 500),
    isRecurring: Boolean(isRecurring),
    recurrencePattern
  };

  const newCall = await createScheduledCall(req.user.id, sanitizedData);
  
  res.status(201).json(createSuccessResponse({ call: newCall }, 'Scheduled call created successfully'));
}));

// PUT /api/scheduling/:callId - Update scheduled call (verified users only)
router.put('/:callId', authenticateUser, verifiedUserOnly, asyncHandler(async (req, res) => {
  const { callId } = req.params;
  const updateData = { ...req.body };

  // Sanitize text inputs if provided
  if (updateData.title) {
    updateData.title = sanitizeString(updateData.title, 100);
  }
  if (updateData.description) {
    updateData.description = sanitizeString(updateData.description, 500);
  }

  const updatedCall = await updateScheduledCall(callId, req.user.id, updateData);
  
  res.json(createSuccessResponse({ call: updatedCall }, 'Scheduled call updated successfully'));
}));

// DELETE /api/scheduling/:callId - Delete scheduled call (verified users only)
router.delete('/:callId', authenticateUser, verifiedUserOnly, asyncHandler(async (req, res) => {
  const { callId } = req.params;
  
  await deleteScheduledCall(callId, req.user.id);
  
  res.json(createSuccessResponse({}, 'Scheduled call deleted successfully'));
}));

// GET /api/scheduling/:callId - Get specific scheduled call (verified users only)
router.get('/:callId', authenticateUser, verifiedUserOnly, asyncHandler(async (req, res) => {
  const { callId } = req.params;
  
  const call = await getScheduledCallById(callId, req.user.id);
  
  res.json(createSuccessResponse({ call }));
}));

// GET /api/scheduling/upcoming - Get upcoming calls (verified users only)
router.get('/upcoming', authenticateUser, verifiedUserOnly, asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;
  
  const upcomingCalls = await getUpcomingCalls(req.user.id, limit);
  
  res.json(createSuccessResponse({ calls: upcomingCalls }));
}));

// POST /api/scheduling/:callId/join - Join scheduled call (verified users only)
router.post('/:callId/join', authenticateUser, verifiedUserOnly, asyncHandler(async (req, res) => {
  const { callId } = req.params;
  
  const activeCall = await joinScheduledCall(callId, req.user.id);
  
  res.json(createSuccessResponse({ 
    call: activeCall,
    readyToConnect: true 
  }, 'Successfully joined scheduled call'));
}));

module.exports = router; 