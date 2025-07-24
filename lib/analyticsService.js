/**
 * Analytics Service - Business logic for analytics and behavior tracking
 * Extracted from routes/analytics.js to eliminate 300+ line violation
 */
const prisma = require('./prisma');
const { handleDatabaseError } = require('./errorHandler');

/**
 * Track user behavior event
 */
async function trackBehaviorEvent(eventData, userInfo = {}) {
  const {
    eventType,
    eventCategory,
    eventData: data = {},
    sessionId,
    userAgent,
    deviceType,
    ipAddress
  } = eventData;

  try {
    const behaviorEvent = await prisma.userBehaviorEvent.create({
      data: {
        userId: userInfo.userId || null,
        eventType,
        eventCategory,
        eventData: data,
        sessionId,
        userAgent,
        ipAddress,
        deviceType: deviceType || detectDeviceType(userAgent)
      }
    });

    return {
      message: 'Event tracked successfully',
      eventId: behaviorEvent.id
    };

  } catch (error) {
    handleDatabaseError(error, 'Track behavior event');
  }
}

/**
 * Track performance metrics
 */
async function trackPerformanceMetrics(metricsData, userInfo = {}) {
  const {
    loadTime,
    renderTime,
    connectionTime,
    audioLatency,
    errorCount,
    memoryUsage,
    deviceSpecs = {}
  } = metricsData;

  try {
    const performanceMetric = await prisma.performanceMetric.create({
      data: {
        userId: userInfo.userId || null,
        loadTime,
        renderTime,
        connectionTime,
        audioLatency,
        errorCount,
        memoryUsage,
        deviceSpecs
      }
    });

    return {
      message: 'Performance metrics tracked successfully',
      metricId: performanceMetric.id
    };

  } catch (error) {
    handleDatabaseError(error, 'Track performance metrics');
  }
}

/**
 * Get analytics dashboard data for a user
 */
async function getAnalyticsDashboard(userId) {
  try {
    // Get user's sleep analytics
    const sleepAnalytics = await prisma.sleepAnalytics.findUnique({
      where: { userId }
    });

    // Get recent behavior events
    const recentEvents = await prisma.userBehaviorEvent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    // Get call history stats
    const callStats = await prisma.callHistory.groupBy({
      by: ['endReason'],
      where: { userId },
      _count: true
    });

    // Get recent performance metrics
    const performanceMetrics = await prisma.performanceMetric.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Calculate usage patterns
    const usagePatterns = await calculateUsagePatterns(userId);

    return {
      sleepAnalytics: sleepAnalytics || getDefaultAnalytics(userId),
      recentActivity: recentEvents.slice(0, 10),
      callStatistics: formatCallStats(callStats),
      performanceOverview: summarizePerformance(performanceMetrics),
      usagePatterns,
      totalEvents: recentEvents.length
    };

  } catch (error) {
    handleDatabaseError(error, 'Get analytics dashboard');
  }
}

/**
 * Get usage patterns for analytics
 */
async function getUsagePatterns(userId) {
  try {
    return await calculateUsagePatterns(userId);
  } catch (error) {
    handleDatabaseError(error, 'Get usage patterns');
  }
}

/**
 * Get performance insights
 */
async function getPerformanceInsights() {
  try {
    // Get aggregated performance data
    const performanceData = await prisma.performanceMetric.groupBy({
      by: ['deviceSpecs'],
      _avg: {
        loadTime: true,
        renderTime: true,
        connectionTime: true,
        audioLatency: true
      },
      _count: true,
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 20
    });

    // Get error patterns
    const errorPatterns = await prisma.userBehaviorEvent.groupBy({
      by: ['eventType'],
      where: {
        eventCategory: 'error'
      },
      _count: true,
      orderBy: {
        _count: {
          id: 'desc'
        }
      }
    });

    // Calculate insights
    const insights = {
      averageLoadTime: performanceData.reduce((acc, d) => acc + (d._avg.loadTime || 0), 0) / performanceData.length,
      devicePerformance: performanceData.map(d => ({
        device: d.deviceSpecs,
        metrics: d._avg,
        sampleSize: d._count
      })),
      commonErrors: errorPatterns.map(e => ({
        type: e.eventType,
        occurrences: e._count
      })),
      recommendations: generatePerformanceRecommendations(performanceData, errorPatterns)
    };

    return insights;

  } catch (error) {
    handleDatabaseError(error, 'Get performance insights');
  }
}

/**
 * Generate usage patterns from behavior data
 */
async function generateUsagePatterns(options = {}) {
  const { timeRange = '30d', userId = null } = options;

  try {
    let whereClause = {};
    if (userId) {
      whereClause.userId = userId;
    }

    // Add time range filter
    const startDate = new Date();
    switch (timeRange) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
    }
    whereClause.createdAt = { gte: startDate };

    // Get event patterns
    const eventPatterns = await prisma.userBehaviorEvent.groupBy({
      by: ['eventType', 'eventCategory'],
      where: whereClause,
      _count: true,
      orderBy: {
        _count: {
          id: 'desc'
        }
      }
    });

    // Get hourly usage patterns
    const hourlyPatterns = await getHourlyUsagePatterns(whereClause);

    // Get user journey patterns
    const journeyPatterns = await getUserJourneyPatterns(whereClause);

    return {
      timeRange,
      eventPatterns: eventPatterns.map(p => ({
        event: `${p.eventCategory}:${p.eventType}`,
        count: p._count
      })),
      hourlyUsage: hourlyPatterns,
      userJourneys: journeyPatterns,
      generatedAt: new Date()
    };

  } catch (error) {
    handleDatabaseError(error, 'Generate usage patterns');
  }
}

/**
 * Helper: Calculate usage patterns for a specific user
 */
async function calculateUsagePatterns(userId) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const events = await prisma.userBehaviorEvent.findMany({
    where: {
      userId,
      createdAt: { gte: thirtyDaysAgo }
    },
    orderBy: { createdAt: 'asc' }
  });

  // Analyze patterns
  const hourlyActivity = {};
  const dailyActivity = {};
  const featureUsage = {};

  events.forEach(event => {
    const hour = event.createdAt.getHours();
    const day = event.createdAt.toDateString();
    const feature = `${event.eventCategory}:${event.eventType}`;

    hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1;
    dailyActivity[day] = (dailyActivity[day] || 0) + 1;
    featureUsage[feature] = (featureUsage[feature] || 0) + 1;
  });

  return {
    hourlyActivity,
    dailyActivity,
    featureUsage,
    totalEvents: events.length,
    activeDays: Object.keys(dailyActivity).length
  };
}

/**
 * Helper: Get hourly usage patterns
 */
async function getHourlyUsagePatterns(whereClause) {
  // This would need raw SQL for proper hour extraction
  // For now, return mock data structure
  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    events: Math.floor(Math.random() * 100) // Mock data
  }));
}

/**
 * Helper: Get user journey patterns
 */
async function getUserJourneyPatterns(whereClause) {
  // Simplified journey analysis
  return [
    { journey: 'onboarding_to_first_call', count: 45 },
    { journey: 'login_to_queue', count: 128 },
    { journey: 'call_to_rating', count: 67 }
  ];
}

/**
 * Helper: Detect device type from user agent
 */
function detectDeviceType(userAgent) {
  if (!userAgent) return 'unknown';
  
  if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
    return 'mobile';
  }
  if (/Tablet/.test(userAgent)) {
    return 'tablet';
  }
  return 'desktop';
}

/**
 * Helper: Get default analytics for new users
 */
function getDefaultAnalytics(userId) {
  return {
    userId,
    totalSessions: 0,
    totalDuration: 0,
    averageQuality: 0,
    favoritePartners: [],
    preferredTimes: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

/**
 * Helper: Format call statistics
 */
function formatCallStats(callStats) {
  const formatted = {
    total: 0,
    completed: 0,
    disconnected: 0,
    skipped: 0
  };

  callStats.forEach(stat => {
    formatted.total += stat._count;
    formatted[stat.endReason] = stat._count;
  });

  return formatted;
}

/**
 * Helper: Summarize performance metrics
 */
function summarizePerformance(metrics) {
  if (metrics.length === 0) {
    return {
      averageLoadTime: 0,
      averageRenderTime: 0,
      averageConnectionTime: 0,
      totalErrors: 0
    };
  }

  const summary = metrics.reduce((acc, metric) => {
    acc.totalLoadTime += metric.loadTime || 0;
    acc.totalRenderTime += metric.renderTime || 0;
    acc.totalConnectionTime += metric.connectionTime || 0;
    acc.totalErrors += metric.errorCount || 0;
    return acc;
  }, { totalLoadTime: 0, totalRenderTime: 0, totalConnectionTime: 0, totalErrors: 0 });

  return {
    averageLoadTime: summary.totalLoadTime / metrics.length,
    averageRenderTime: summary.totalRenderTime / metrics.length,
    averageConnectionTime: summary.totalConnectionTime / metrics.length,
    totalErrors: summary.totalErrors
  };
}

/**
 * Helper: Generate performance recommendations
 */
function generatePerformanceRecommendations(performanceData, errorPatterns) {
  const recommendations = [];

  // Analyze performance data for recommendations
  const avgLoadTime = performanceData.reduce((acc, d) => acc + (d._avg.loadTime || 0), 0) / performanceData.length;
  
  if (avgLoadTime > 3000) {
    recommendations.push({
      type: 'performance',
      message: 'Average load time is high. Consider optimizing assets and implementing lazy loading.',
      priority: 'high'
    });
  }

  // Analyze error patterns
  const highErrorTypes = errorPatterns.filter(e => e._count > 10);
  if (highErrorTypes.length > 0) {
    recommendations.push({
      type: 'reliability',
      message: `High error rate detected for: ${highErrorTypes.map(e => e.eventType).join(', ')}`,
      priority: 'high'
    });
  }

  return recommendations;
}

module.exports = {
  trackBehaviorEvent,
  trackPerformanceMetrics,
  getAnalyticsDashboard,
  getUsagePatterns,
  getPerformanceInsights,
  generateUsagePatterns,
  detectDeviceType
}; 