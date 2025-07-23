const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticateUser, verifiedUserOnly, flexibleAuth } = require('../lib/auth');

const prisma = new PrismaClient();

// POST /api/analytics/events - Track user behavior events
router.post('/events', flexibleAuth, async (req, res) => {
  try {
    const {
      eventType,
      eventCategory,
      eventData = {},
      sessionId,
      userAgent,
      deviceType
    } = req.body;

    // Validate required fields
    if (!eventType || !eventCategory) {
      return res.status(400).json({ error: 'eventType and eventCategory are required' });
    }

    // Get user IP for analytics (anonymized)
    const ipAddress = req.ip || req.connection.remoteAddress;
    
    // Create behavior event
    const behaviorEvent = await prisma.userBehaviorEvent.create({
      data: {
        userId: req.user?.id || null, // Can track anonymous users too
        eventType,
        eventCategory,
        eventData,
        sessionId,
        userAgent: userAgent || req.get('User-Agent'),
        ipAddress,
        deviceType: deviceType || detectDeviceType(req.get('User-Agent'))
      }
    });

    res.json({
      message: 'Event tracked successfully',
      eventId: behaviorEvent.id
    });
  } catch (error) {
    console.error('Track event error:', error);
    res.status(500).json({ error: 'Failed to track event' });
  }
});

// POST /api/analytics/performance - Track performance metrics
router.post('/performance', flexibleAuth, async (req, res) => {
  try {
    const {
      metricType,
      metricValue,
      metricUnit = 'count',
      sessionId,
      deviceType,
      connectionType,
      metadata = {}
    } = req.body;

    // Validate required fields
    if (!metricType || metricValue === undefined) {
      return res.status(400).json({ error: 'metricType and metricValue are required' });
    }

    // Create performance metric
    const performanceMetric = await prisma.performanceMetric.create({
      data: {
        userId: req.user?.id || null,
        metricType,
        metricValue: parseFloat(metricValue),
        metricUnit,
        sessionId,
        deviceType: deviceType || detectDeviceType(req.get('User-Agent')),
        connectionType,
        metadata
      }
    });

    res.json({
      message: 'Performance metric recorded successfully',
      metricId: performanceMetric.id
    });
  } catch (error) {
    console.error('Track performance error:', error);
    res.status(500).json({ error: 'Failed to track performance metric' });
  }
});

// GET /api/analytics/dashboard - Get user analytics dashboard (verified users only)
router.get('/dashboard', authenticateUser, verifiedUserOnly, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user analytics
    const userAnalytics = await prisma.sleepAnalytics.findUnique({
      where: { userId }
    });

    // Get recent behavior events
    const recentEvents = await prisma.userBehaviorEvent.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: 50,
      select: {
        eventType: true,
        eventCategory: true,
        timestamp: true,
        eventData: true
      }
    });

    // Get call history stats
    const callStats = await prisma.callHistory.aggregate({
      where: { userId },
      _count: { id: true },
      _sum: { duration: true },
      _avg: { 
        duration: true,
        userRating: true,
        compatibilityScore: true
      }
    });

    // Get favorites stats
    const favoritesStats = await prisma.userFavorite.aggregate({
      where: { userId },
      _count: { id: true }
    });

    const mutualFavoritesCount = await prisma.userFavorite.count({
      where: { userId, isMutual: true }
    });

    // Get scheduled calls stats
    const scheduledStats = await prisma.scheduledCall.aggregate({
      where: {
        OR: [
          { creatorId: userId },
          { participantId: userId }
        ]
      },
      _count: { id: true }
    });

    // Get usage patterns for this user
    const usagePatterns = await prisma.usagePattern.findMany({
      where: {
        patternType: 'user_specific',
        patternData: {
          path: ['userId'],
          equals: userId
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Calculate time-based statistics
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentActivity = await prisma.userBehaviorEvent.count({
      where: {
        userId,
        timestamp: { gte: thirtyDaysAgo }
      }
    });

    res.json({
      userAnalytics: userAnalytics || {
        totalSessions: 0,
        totalDuration: 0,
        averageQuality: 0,
        favoritePartnersCount: 0,
        scheduledCallsCount: 0
      },
      callStats: {
        totalCalls: callStats._count.id || 0,
        totalDuration: callStats._sum.duration || 0,
        averageDuration: callStats._avg.duration || 0,
        averageRating: callStats._avg.userRating || 0,
        averageCompatibility: callStats._avg.compatibilityScore || 0
      },
      socialStats: {
        totalFavorites: favoritesStats._count.id || 0,
        mutualFavorites: mutualFavoritesCount,
        scheduledCalls: scheduledStats._count.id || 0
      },
      activityStats: {
        recentEventCount: recentActivity,
        recentEvents: recentEvents.slice(0, 10)
      },
      usagePatterns
    });
  } catch (error) {
    console.error('Analytics dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics dashboard' });
  }
});

// GET /api/analytics/usage-patterns - Get usage patterns (admin only)
router.get('/usage-patterns', authenticateUser, async (req, res) => {
  try {
    // For now, any verified user can see general patterns
    // In production, this would be admin-only
    
    const { patternType, limit = 10 } = req.query;
    
    let whereClause = {};
    if (patternType) {
      whereClause.patternType = patternType;
    }

    const patterns = await prisma.usagePattern.findMany({
      where: whereClause,
      orderBy: { confidence: 'desc' },
      take: parseInt(limit)
    });

    res.json({ patterns });
  } catch (error) {
    console.error('Usage patterns error:', error);
    res.status(500).json({ error: 'Failed to fetch usage patterns' });
  }
});

// GET /api/analytics/performance-insights - Get system performance insights
router.get('/performance-insights', async (req, res) => {
  try {
    const { timeframe = '24h', metricType } = req.query;
    
    // Calculate time range
    const now = new Date();
    let startTime = new Date();
    
    switch (timeframe) {
      case '1h':
        startTime.setHours(startTime.getHours() - 1);
        break;
      case '24h':
        startTime.setDate(startTime.getDate() - 1);
        break;
      case '7d':
        startTime.setDate(startTime.getDate() - 7);
        break;
      case '30d':
        startTime.setDate(startTime.getDate() - 30);
        break;
      default:
        startTime.setDate(startTime.getDate() - 1);
    }

    let whereClause = {
      timestamp: { gte: startTime }
    };

    if (metricType) {
      whereClause.metricType = metricType;
    }

    // Get performance metrics summary
    const performanceStats = await prisma.performanceMetric.aggregate({
      where: whereClause,
      _count: { id: true },
      _avg: { metricValue: true },
      _min: { metricValue: true },
      _max: { metricValue: true }
    });

    // Get metrics by type
    const metricsByType = await prisma.performanceMetric.groupBy({
      by: ['metricType'],
      where: whereClause,
      _count: { metricType: true },
      _avg: { metricValue: true }
    });

    // Get device type distribution
    const deviceStats = await prisma.performanceMetric.groupBy({
      by: ['deviceType'],
      where: whereClause,
      _count: { deviceType: true }
    });

    res.json({
      timeframe,
      summary: {
        totalMetrics: performanceStats._count.id || 0,
        averageValue: performanceStats._avg.metricValue || 0,
        minValue: performanceStats._min.metricValue || 0,
        maxValue: performanceStats._max.metricValue || 0
      },
      metricTypes: metricsByType.map(m => ({
        type: m.metricType,
        count: m._count.metricType,
        averageValue: m._avg.metricValue
      })),
      deviceDistribution: deviceStats.map(d => ({
        device: d.deviceType,
        count: d._count.deviceType
      }))
    });
  } catch (error) {
    console.error('Performance insights error:', error);
    res.status(500).json({ error: 'Failed to fetch performance insights' });
  }
});

// POST /api/analytics/generate-patterns - Generate usage patterns (admin/system)
router.post('/generate-patterns', async (req, res) => {
  try {
    // This would typically be called by a scheduled job
    const { patternType = 'peak_hours', lookbackDays = 7 } = req.body;
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - lookbackDays);

    let patternData = {};
    let confidence = 0;
    let userCount = 0;
    let sessionCount = 0;

    if (patternType === 'peak_hours') {
      // Analyze peak usage hours
      const hourlyStats = await prisma.userBehaviorEvent.findMany({
        where: {
          timestamp: { gte: startDate, lte: endDate },
          eventType: { in: ['queue_join', 'call_start'] }
        },
        select: {
          timestamp: true
        }
      });

      const hourCounts = {};
      hourlyStats.forEach(event => {
        const hour = event.timestamp.getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });

      const peakHours = Object.entries(hourCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([hour, count]) => ({ hour: parseInt(hour), count }));

      patternData = {
        peakHours,
        hourlyDistribution: hourCounts,
        totalEvents: hourlyStats.length
      };

      confidence = hourlyStats.length > 100 ? 0.9 : 0.5;
      sessionCount = hourlyStats.length;
    }

    // Create or update pattern
    const pattern = await prisma.usagePattern.create({
      data: {
        patternType,
        patternName: `${patternType.replace('_', ' ')} - ${lookbackDays} days`,
        patternData,
        confidence,
        periodStart: startDate,
        periodEnd: endDate,
        userCount,
        sessionCount
      }
    });

    res.json({
      message: 'Usage pattern generated successfully',
      pattern
    });
  } catch (error) {
    console.error('Generate patterns error:', error);
    res.status(500).json({ error: 'Failed to generate usage patterns' });
  }
});

// Utility function to detect device type
function detectDeviceType(userAgent) {
  if (!userAgent) return 'unknown';
  
  userAgent = userAgent.toLowerCase();
  
  if (userAgent.includes('mobile') || userAgent.includes('android') || userAgent.includes('iphone')) {
    return 'mobile';
  } else if (userAgent.includes('tablet') || userAgent.includes('ipad')) {
    return 'tablet';
  } else {
    return 'desktop';
  }
}

module.exports = router; 