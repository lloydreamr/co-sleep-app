const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticateUser, verifiedUserOnly } = require('../lib/auth');

const prisma = new PrismaClient();

// GET /api/scheduling - Get user's scheduled calls (verified users only)
router.get('/', authenticateUser, verifiedUserOnly, async (req, res) => {
  try {
    const { status = 'all', upcoming = false, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = {
      OR: [
        { creatorId: req.user.id },
        { participantId: req.user.id }
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

    res.json({
      scheduledCalls,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNext: offset + scheduledCalls.length < totalCount,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Scheduled calls fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch scheduled calls' });
  }
});

// POST /api/scheduling - Create a new scheduled call (verified users only)
router.post('/', authenticateUser, verifiedUserOnly, async (req, res) => {
  try {
    const {
      scheduledTime,
      duration = 30,
      timezone,
      participantId,
      isPrivate = false,
      description,
      maxParticipants = 1
    } = req.body;

    // Validate required fields
    if (!scheduledTime || !timezone) {
      return res.status(400).json({ error: 'scheduledTime and timezone are required' });
    }

    const scheduledDate = new Date(scheduledTime);
    const now = new Date();

    // Can't schedule calls in the past
    if (scheduledDate <= now) {
      return res.status(400).json({ error: 'Cannot schedule calls in the past' });
    }

    // Can't schedule more than 30 days in advance
    const maxAdvanceTime = new Date();
    maxAdvanceTime.setDate(maxAdvanceTime.getDate() + 30);
    if (scheduledDate > maxAdvanceTime) {
      return res.status(400).json({ error: 'Cannot schedule calls more than 30 days in advance' });
    }

    // If private call, validate participant
    if (isPrivate) {
      if (!participantId) {
        return res.status(400).json({ error: 'participantId required for private calls' });
      }

      if (participantId === req.user.id) {
        return res.status(400).json({ error: 'Cannot schedule call with yourself' });
      }

      // Check if participant exists and is verified
      const participant = await prisma.user.findUnique({
        where: { id: participantId },
        select: { id: true, isVerified: true, displayName: true }
      });

      if (!participant) {
        return res.status(404).json({ error: 'Participant not found' });
      }

      if (!participant.isVerified) {
        return res.status(400).json({ error: 'Can only schedule with verified users' });
      }
    }

    // Check for scheduling conflicts (same user, overlapping time)
    const conflictStart = new Date(scheduledDate);
    conflictStart.setMinutes(conflictStart.getMinutes() - duration);
    const conflictEnd = new Date(scheduledDate);
    conflictEnd.setMinutes(conflictEnd.getMinutes() + duration);

    const conflicts = await prisma.scheduledCall.count({
      where: {
        OR: [
          { creatorId: req.user.id },
          { participantId: req.user.id }
        ],
        status: 'scheduled',
        scheduledTime: {
          gte: conflictStart,
          lte: conflictEnd
        }
      }
    });

    if (conflicts > 0) {
      return res.status(400).json({ error: 'You have a scheduling conflict at this time' });
    }

    // Create the scheduled call
    const scheduledCall = await prisma.scheduledCall.create({
      data: {
        creatorId: req.user.id,
        participantId: isPrivate ? participantId : null,
        scheduledTime: scheduledDate,
        duration,
        timezone,
        isPrivate,
        description,
        maxParticipants
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

    // Update user analytics
    await prisma.sleepAnalytics.upsert({
      where: { userId: req.user.id },
      update: {
        scheduledCallsCount: {
          increment: 1
        }
      },
      create: {
        userId: req.user.id,
        scheduledCallsCount: 1
      }
    });

    // Log behavior event
    await prisma.userBehaviorEvent.create({
      data: {
        userId: req.user.id,
        eventType: 'call_scheduled',
        eventCategory: 'scheduling',
        eventData: {
          scheduledCallId: scheduledCall.id,
          isPrivate,
          duration,
          participantId: participantId || null
        }
      }
    });

    res.json({
      message: 'Call scheduled successfully',
      scheduledCall
    });
  } catch (error) {
    console.error('Schedule call error:', error);
    res.status(500).json({ error: 'Failed to schedule call' });
  }
});

// PUT /api/scheduling/:callId - Update a scheduled call (verified users only)
router.put('/:callId', authenticateUser, verifiedUserOnly, async (req, res) => {
  try {
    const { callId } = req.params;
    const { scheduledTime, duration, description, status } = req.body;

    // Find the scheduled call
    const scheduledCall = await prisma.scheduledCall.findUnique({
      where: { id: callId },
      include: {
        creator: { select: { id: true } },
        participant: { select: { id: true } }
      }
    });

    if (!scheduledCall) {
      return res.status(404).json({ error: 'Scheduled call not found' });
    }

    // Check if user has permission to update
    const canUpdate = scheduledCall.creatorId === req.user.id || 
                     scheduledCall.participantId === req.user.id;

    if (!canUpdate) {
      return res.status(403).json({ error: 'Not authorized to update this call' });
    }

    // Only creator can modify scheduling details
    const isCreator = scheduledCall.creatorId === req.user.id;

    let updateData = {};

    if (isCreator) {
      if (scheduledTime) {
        const newScheduledDate = new Date(scheduledTime);
        const now = new Date();
        
        if (newScheduledDate <= now) {
          return res.status(400).json({ error: 'Cannot reschedule to past time' });
        }
        
        updateData.scheduledTime = newScheduledDate;
      }
      
      if (duration) updateData.duration = duration;
      if (description !== undefined) updateData.description = description;
    }

    if (status) {
      // Validate status transitions
      const validTransitions = {
        'scheduled': ['cancelled'],
        'active': ['completed', 'cancelled'],
        'completed': [], // No transitions from completed
        'cancelled': [] // No transitions from cancelled
      };

      if (!validTransitions[scheduledCall.status]?.includes(status)) {
        return res.status(400).json({ 
          error: `Cannot transition from ${scheduledCall.status} to ${status}` 
        });
      }

      updateData.status = status;
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

    // Log behavior event
    await prisma.userBehaviorEvent.create({
      data: {
        userId: req.user.id,
        eventType: 'call_updated',
        eventCategory: 'scheduling',
        eventData: {
          scheduledCallId: callId,
          changes: updateData,
          isCreator
        }
      }
    });

    res.json({
      message: 'Scheduled call updated successfully',
      scheduledCall: updatedCall
    });
  } catch (error) {
    console.error('Update scheduled call error:', error);
    res.status(500).json({ error: 'Failed to update scheduled call' });
  }
});

// DELETE /api/scheduling/:callId - Cancel a scheduled call (verified users only)
router.delete('/:callId', authenticateUser, verifiedUserOnly, async (req, res) => {
  try {
    const { callId } = req.params;

    // Find the scheduled call
    const scheduledCall = await prisma.scheduledCall.findUnique({
      where: { id: callId }
    });

    if (!scheduledCall) {
      return res.status(404).json({ error: 'Scheduled call not found' });
    }

    // Check if user has permission to cancel
    const canCancel = scheduledCall.creatorId === req.user.id || 
                     scheduledCall.participantId === req.user.id;

    if (!canCancel) {
      return res.status(403).json({ error: 'Not authorized to cancel this call' });
    }

    // Can only cancel scheduled calls
    if (scheduledCall.status !== 'scheduled') {
      return res.status(400).json({ error: 'Can only cancel scheduled calls' });
    }

    // Update status to cancelled instead of deleting
    await prisma.scheduledCall.update({
      where: { id: callId },
      data: { status: 'cancelled' }
    });

    // Update analytics if user was the creator
    if (scheduledCall.creatorId === req.user.id) {
      await prisma.sleepAnalytics.update({
        where: { userId: req.user.id },
        data: {
          scheduledCallsCount: {
            decrement: 1
          }
        }
      });
    }

    // Log behavior event
    await prisma.userBehaviorEvent.create({
      data: {
        userId: req.user.id,
        eventType: 'call_cancelled',
        eventCategory: 'scheduling',
        eventData: {
          scheduledCallId: callId,
          isCreator: scheduledCall.creatorId === req.user.id
        }
      }
    });

    res.json({ message: 'Scheduled call cancelled successfully' });
  } catch (error) {
    console.error('Cancel scheduled call error:', error);
    res.status(500).json({ error: 'Failed to cancel scheduled call' });
  }
});

// GET /api/scheduling/:callId - Get specific scheduled call details (verified users only)
router.get('/:callId', authenticateUser, verifiedUserOnly, async (req, res) => {
  try {
    const { callId } = req.params;

    const scheduledCall = await prisma.scheduledCall.findUnique({
      where: { id: callId },
      include: {
        creator: {
          select: {
            id: true,
            displayName: true,
            userType: true,
            timezone: true
          }
        },
        participant: {
          select: {
            id: true,
            displayName: true,
            userType: true,
            timezone: true
          }
        }
      }
    });

    if (!scheduledCall) {
      return res.status(404).json({ error: 'Scheduled call not found' });
    }

    // Check if user has permission to view
    const canView = scheduledCall.creatorId === req.user.id || 
                   scheduledCall.participantId === req.user.id ||
                   (!scheduledCall.isPrivate && scheduledCall.status === 'scheduled');

    if (!canView) {
      return res.status(403).json({ error: 'Not authorized to view this call' });
    }

    res.json({ scheduledCall });
  } catch (error) {
    console.error('Get scheduled call error:', error);
    res.status(500).json({ error: 'Failed to fetch scheduled call' });
  }
});

// GET /api/scheduling/upcoming - Get upcoming calls for the next 24 hours (verified users only)
router.get('/upcoming', authenticateUser, verifiedUserOnly, async (req, res) => {
  try {
    const now = new Date();
    const next24Hours = new Date();
    next24Hours.setHours(next24Hours.getHours() + 24);

    const upcomingCalls = await prisma.scheduledCall.findMany({
      where: {
        OR: [
          { creatorId: req.user.id },
          { participantId: req.user.id }
        ],
        status: 'scheduled',
        scheduledTime: {
          gte: now,
          lte: next24Hours
        }
      },
      orderBy: { scheduledTime: 'asc' },
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

    res.json({
      upcomingCalls,
      count: upcomingCalls.length
    });
  } catch (error) {
    console.error('Upcoming calls error:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming calls' });
  }
});

// POST /api/scheduling/:callId/join - Join a scheduled call (verified users only)
router.post('/:callId/join', authenticateUser, verifiedUserOnly, async (req, res) => {
  try {
    const { callId } = req.params;

    const scheduledCall = await prisma.scheduledCall.findUnique({
      where: { id: callId }
    });

    if (!scheduledCall) {
      return res.status(404).json({ error: 'Scheduled call not found' });
    }

    // Check if call is scheduled and not private
    if (scheduledCall.status !== 'scheduled') {
      return res.status(400).json({ error: 'Call is not available to join' });
    }

    if (scheduledCall.isPrivate) {
      return res.status(403).json({ error: 'Cannot join private call' });
    }

    // Check if call time is close (within 15 minutes)
    const now = new Date();
    const callTime = new Date(scheduledCall.scheduledTime);
    const timeDiff = callTime.getTime() - now.getTime();
    const fifteenMinutes = 15 * 60 * 1000;

    if (timeDiff > fifteenMinutes) {
      return res.status(400).json({ 
        error: 'Call is not yet available to join. Please wait until 15 minutes before the scheduled time.' 
      });
    }

    if (timeDiff < -fifteenMinutes) {
      return res.status(400).json({ error: 'Call time has passed' });
    }

    // Update the call to add participant and mark as active
    const updatedCall = await prisma.scheduledCall.update({
      where: { id: callId },
      data: {
        participantId: req.user.id,
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

    // Log behavior event
    await prisma.userBehaviorEvent.create({
      data: {
        userId: req.user.id,
        eventType: 'call_joined',
        eventCategory: 'scheduling',
        eventData: {
          scheduledCallId: callId,
          creatorId: scheduledCall.creatorId
        }
      }
    });

    res.json({
      message: 'Successfully joined scheduled call',
      scheduledCall: updatedCall,
      callData: {
        initiator: false,
        partnerId: scheduledCall.creatorId,
        sessionSource: 'scheduled'
      }
    });
  } catch (error) {
    console.error('Join scheduled call error:', error);
    res.status(500).json({ error: 'Failed to join scheduled call' });
  }
});

module.exports = router; 