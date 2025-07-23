const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticateUser, verifiedUserOnly, flexibleAuth } = require('../lib/auth');

const prisma = new PrismaClient();

// GET /api/history - Get user's call history (verified users only)
router.get('/', authenticateUser, verifiedUserOnly, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const history = await prisma.callHistory.findMany({
      where: { userId: req.user.id },
      orderBy: { startTime: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
      select: {
        id: true,
        partnerId: true,
        partnerType: true,
        startTime: true,
        endTime: true,
        duration: true,
        connectionQuality: true,
        endReason: true,
        userRating: true,
        createdAt: true
      }
    });

    // Get total count for pagination
    const totalCount = await prisma.callHistory.count({
      where: { userId: req.user.id }
    });

    res.json({
      history,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNext: offset + history.length < totalCount,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('History fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch call history' });
  }
});

// GET /api/history/stats - Get call history statistics (verified users only)
router.get('/stats', authenticateUser, verifiedUserOnly, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get basic stats
    const stats = await prisma.callHistory.aggregate({
      where: { userId },
      _count: { id: true },
      _sum: { duration: true },
      _avg: { 
        duration: true,
        userRating: true
      }
    });

    // Get connection quality distribution
    const qualityStats = await prisma.callHistory.groupBy({
      by: ['connectionQuality'],
      where: { userId },
      _count: { connectionQuality: true }
    });

    // Get end reason distribution
    const endReasonStats = await prisma.callHistory.groupBy({
      by: ['endReason'],
      where: { userId },
      _count: { endReason: true }
    });

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentActivity = await prisma.callHistory.count({
      where: {
        userId,
        startTime: { gte: thirtyDaysAgo }
      }
    });

    // Calculate average session length in minutes
    const avgDurationMinutes = stats._avg.duration ? Math.round(stats._avg.duration / 60) : 0;
    const totalDurationHours = stats._sum.duration ? Math.round(stats._sum.duration / 3600 * 10) / 10 : 0;

    res.json({
      totalCalls: stats._count.id || 0,
      totalDuration: stats._sum.duration || 0,
      totalDurationHours,
      averageDuration: stats._avg.duration || 0,
      averageDurationMinutes: avgDurationMinutes,
      averageRating: stats._avg.userRating ? Math.round(stats._avg.userRating * 10) / 10 : null,
      recentCallsCount: recentActivity,
      connectionQuality: qualityStats.map(q => ({
        quality: q.connectionQuality,
        count: q._count.connectionQuality
      })),
      endReasons: endReasonStats.map(r => ({
        reason: r.endReason,
        count: r._count.endReason
      }))
    });
  } catch (error) {
    console.error('History stats error:', error);
    res.status(500).json({ error: 'Failed to fetch call statistics' });
  }
});

// POST /api/history/:id/rating - Rate a specific call (verified users only)
router.post('/:id/rating', authenticateUser, verifiedUserOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { rating } = req.body;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Verify the call belongs to the user
    const callHistory = await prisma.callHistory.findFirst({
      where: {
        id,
        userId: req.user.id
      }
    });

    if (!callHistory) {
      return res.status(404).json({ error: 'Call not found' });
    }

    // Update the rating
    const updatedCall = await prisma.callHistory.update({
      where: { id },
      data: { userRating: parseInt(rating) },
      select: {
        id: true,
        userRating: true,
        startTime: true,
        duration: true
      }
    });

    res.json({
      message: 'Rating updated successfully',
      call: updatedCall
    });
  } catch (error) {
    console.error('Rating update error:', error);
    res.status(500).json({ error: 'Failed to update rating' });
  }
});

// DELETE /api/history/:id - Delete a specific call from history (verified users only)
router.delete('/:id', authenticateUser, verifiedUserOnly, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify the call belongs to the user
    const callHistory = await prisma.callHistory.findFirst({
      where: {
        id,
        userId: req.user.id
      }
    });

    if (!callHistory) {
      return res.status(404).json({ error: 'Call not found' });
    }

    // Delete the call history entry
    await prisma.callHistory.delete({
      where: { id }
    });

    res.json({ message: 'Call history entry deleted successfully' });
  } catch (error) {
    console.error('History delete error:', error);
    res.status(500).json({ error: 'Failed to delete call history' });
  }
});

// GET /api/history/export - Export call history as JSON (verified users only)
router.get('/export', authenticateUser, verifiedUserOnly, async (req, res) => {
  try {
    const history = await prisma.callHistory.findMany({
      where: { userId: req.user.id },
      orderBy: { startTime: 'desc' },
      select: {
        id: true,
        partnerId: true,
        partnerType: true,
        startTime: true,
        endTime: true,
        duration: true,
        connectionQuality: true,
        endReason: true,
        userRating: true,
        createdAt: true
      }
    });

    // Set appropriate headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="hence-call-history-${req.user.id}-${Date.now()}.json"`);

    res.json({
      exportedAt: new Date(),
      userId: req.user.id,
      userType: req.user.userType,
      totalCalls: history.length,
      history
    });
  } catch (error) {
    console.error('History export error:', error);
    res.status(500).json({ error: 'Failed to export call history' });
  }
});

module.exports = router; 