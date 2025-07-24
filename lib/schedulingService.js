/**
 * Scheduling Service - Business logic for scheduled calls
 * Extracted from routes/scheduling.js to eliminate 300+ line violation
 */
const prisma = require('./prisma');
const { handleDatabaseError } = require('./errorHandler');

/**
 * Get user's scheduled calls with filtering and pagination
 */
async function getUserScheduledCalls(userId, options = {}) {
  const { 
    status = 'all', 
    upcoming = false, 
    page = 1, 
    limit = 50 
  } = options;
  
  const offset = (page - 1) * limit;

  let whereClause = {
    OR: [
      { creatorId: userId },
      { participantId: userId }
    ]
  };

  // Filter by status
  if (status !== 'all') {
    whereClause.status = status;
  }

  // Filter for upcoming calls only
  if (upcoming === 'true') {
    whereClause.scheduledTime = { gte: new Date() };
    whereClause.status = 'scheduled';
  }

  try {
    const scheduledCalls = await prisma.scheduledCall.findMany({
      where: whereClause,
      orderBy: { scheduledTime: 'asc' },
      take: parseInt(limit),
      skip: parseInt(offset),
      include: {
        creator: {
          select: {
            id: true,
            displayName: true,
            userType: true
          }
        },
        participant: {
          select: {
            id: true,
            displayName: true,
            userType: true
          }
        }
      }
    });

    // Get total count for pagination
    const totalCount = await prisma.scheduledCall.count({
      where: whereClause
    });

    return {
      calls: scheduledCalls,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    };

  } catch (error) {
    handleDatabaseError(error, 'Get scheduled calls');
  }
}

/**
 * Create a new scheduled call
 */
async function createScheduledCall(creatorId, callData) {
  const {
    participantId,
    scheduledTime,
    duration = 30,
    timezone,
    title,
    description,
    isRecurring = false,
    recurrencePattern
  } = callData;

  try {
    // Validate scheduled time is in the future
    const scheduledDate = new Date(scheduledTime);
    if (scheduledDate <= new Date()) {
      throw new Error('Scheduled time must be in the future');
    }

    // Check for conflicts
    await checkSchedulingConflicts(creatorId, scheduledDate, duration);
    
    if (participantId) {
      await checkSchedulingConflicts(participantId, scheduledDate, duration);
    }

    const newCall = await prisma.scheduledCall.create({
      data: {
        creatorId,
        participantId,
        scheduledTime: scheduledDate,
        duration,
        timezone,
        title,
        description,
        isRecurring,
        recurrencePattern,
        status: 'scheduled'
      },
      include: {
        creator: {
          select: {
            id: true,
            displayName: true,
            userType: true
          }
        },
        participant: {
          select: {
            id: true,
            displayName: true,
            userType: true
          }
        }
      }
    });

    return newCall;

  } catch (error) {
    handleDatabaseError(error, 'Create scheduled call');
  }
}

/**
 * Update an existing scheduled call
 */
async function updateScheduledCall(callId, userId, updateData) {
  try {
    // First, verify the user has permission to update this call
    const existingCall = await prisma.scheduledCall.findUnique({
      where: { id: callId }
    });

    if (!existingCall) {
      throw new Error('Scheduled call not found');
    }

    if (existingCall.creatorId !== userId && existingCall.participantId !== userId) {
      throw new Error('Access denied: You can only update your own scheduled calls');
    }

    // Only creator can update core details
    if (existingCall.creatorId !== userId && 
        (updateData.scheduledTime || updateData.duration || updateData.title)) {
      throw new Error('Only the call creator can update scheduling details');
    }

    const updatedCall = await prisma.scheduledCall.update({
      where: { id: callId },
      data: updateData,
      include: {
        creator: {
          select: {
            id: true,
            displayName: true,
            userType: true
          }
        },
        participant: {
          select: {
            id: true,
            displayName: true,
            userType: true
          }
        }
      }
    });

    return updatedCall;

  } catch (error) {
    handleDatabaseError(error, 'Update scheduled call');
  }
}

/**
 * Delete a scheduled call
 */
async function deleteScheduledCall(callId, userId) {
  try {
    const existingCall = await prisma.scheduledCall.findUnique({
      where: { id: callId }
    });

    if (!existingCall) {
      throw new Error('Scheduled call not found');
    }

    // Only creator can delete the call
    if (existingCall.creatorId !== userId) {
      throw new Error('Access denied: Only the call creator can delete scheduled calls');
    }

    await prisma.scheduledCall.delete({
      where: { id: callId }
    });

    return { message: 'Scheduled call deleted successfully' };

  } catch (error) {
    handleDatabaseError(error, 'Delete scheduled call');
  }
}

/**
 * Get a specific scheduled call by ID
 */
async function getScheduledCallById(callId, userId) {
  try {
    const call = await prisma.scheduledCall.findUnique({
      where: { id: callId },
      include: {
        creator: {
          select: {
            id: true,
            displayName: true,
            userType: true
          }
        },
        participant: {
          select: {
            id: true,
            displayName: true,
            userType: true
          }
        }
      }
    });

    if (!call) {
      throw new Error('Scheduled call not found');
    }

    // Verify user has access to this call
    if (call.creatorId !== userId && call.participantId !== userId) {
      throw new Error('Access denied: You can only view your own scheduled calls');
    }

    return call;

  } catch (error) {
    handleDatabaseError(error, 'Get scheduled call');
  }
}

/**
 * Get upcoming scheduled calls for a user
 */
async function getUpcomingCalls(userId, limit = 10) {
  try {
    const upcomingCalls = await prisma.scheduledCall.findMany({
      where: {
        OR: [
          { creatorId: userId },
          { participantId: userId }
        ],
        scheduledTime: { gte: new Date() },
        status: 'scheduled'
      },
      orderBy: { scheduledTime: 'asc' },
      take: parseInt(limit),
      include: {
        creator: {
          select: {
            id: true,
            displayName: true,
            userType: true
          }
        },
        participant: {
          select: {
            id: true,
            displayName: true,
            userType: true
          }
        }
      }
    });

    return upcomingCalls;

  } catch (error) {
    handleDatabaseError(error, 'Get upcoming calls');
  }
}

/**
 * Join a scheduled call (mark as active)
 */
async function joinScheduledCall(callId, userId) {
  try {
    const call = await prisma.scheduledCall.findUnique({
      where: { id: callId }
    });

    if (!call) {
      throw new Error('Scheduled call not found');
    }

    // Verify user has permission to join
    if (call.creatorId !== userId && call.participantId !== userId) {
      throw new Error('Access denied: You are not invited to this call');
    }

    // Check if call is ready to join (within 15 minutes of scheduled time)
    const now = new Date();
    const scheduledTime = new Date(call.scheduledTime);
    const timeDiff = scheduledTime.getTime() - now.getTime();
    const fifteenMinutes = 15 * 60 * 1000;

    if (timeDiff > fifteenMinutes) {
      throw new Error('Call cannot be joined more than 15 minutes before scheduled time');
    }

    if (call.status === 'completed') {
      throw new Error('This call has already been completed');
    }

    if (call.status === 'cancelled') {
      throw new Error('This call has been cancelled');
    }

    // Update call status to active
    const updatedCall = await prisma.scheduledCall.update({
      where: { id: callId },
      data: { 
        status: 'active',
        actualStartTime: now
      },
      include: {
        creator: {
          select: {
            id: true,
            displayName: true,
            userType: true
          }
        },
        participant: {
          select: {
            id: true,
            displayName: true,
            userType: true
          }
        }
      }
    });

    return updatedCall;

  } catch (error) {
    handleDatabaseError(error, 'Join scheduled call');
  }
}

/**
 * Check for scheduling conflicts
 */
async function checkSchedulingConflicts(userId, scheduledTime, duration) {
  const startTime = new Date(scheduledTime);
  const endTime = new Date(startTime.getTime() + (duration * 60 * 1000));

  const conflicts = await prisma.scheduledCall.findMany({
    where: {
      OR: [
        { creatorId: userId },
        { participantId: userId }
      ],
      status: 'scheduled',
      OR: [
        {
          scheduledTime: {
            gte: startTime,
            lt: endTime
          }
        },
        {
          AND: [
            { scheduledTime: { lte: startTime } },
            {
              // Calculate end time of existing call
              scheduledTime: {
                gte: new Date(startTime.getTime() - (30 * 60 * 1000)) // Assume 30min default
              }
            }
          ]
        }
      ]
    }
  });

  if (conflicts.length > 0) {
    throw new Error('Scheduling conflict: You already have a call scheduled during this time');
  }
}

module.exports = {
  getUserScheduledCalls,
  createScheduledCall,
  updateScheduledCall,
  deleteScheduledCall,
  getScheduledCallById,
  getUpcomingCalls,
  joinScheduledCall,
  checkSchedulingConflicts
}; 