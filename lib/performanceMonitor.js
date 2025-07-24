/**
 * Performance Monitor - Real-time performance tracking and alerting
 * Phase 3.3: Comprehensive performance monitoring for production
 */
const { EventEmitter } = require('events');

/**
 * Performance monitoring class
 */
class PerformanceMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.thresholds = {
      memoryUsage: options.memoryThreshold || 80, // 80% memory usage
      cpuUsage: options.cpuThreshold || 80, // 80% CPU usage
      responseTime: options.responseTimeThreshold || 5000, // 5 seconds
      errorRate: options.errorRateThreshold || 5, // 5% error rate
      ...options.thresholds
    };
    
    this.metrics = {
      requests: {
        total: 0,
        errors: 0,
        responseTimes: [],
        statusCodes: {}
      },
      system: {
        memory: { current: 0, peak: 0 },
        cpu: { current: 0, peak: 0 },
        uptime: 0
      },
      database: {
        connections: 0,
        queries: { total: 0, slow: 0, errors: 0 }
      },
      webrtc: {
        activeConnections: 0,
        totalConnections: 0,
        connectionErrors: 0
      }
    };
    
    this.alerts = new Map();
    this.monitoringInterval = null;
    this.isMonitoring = false;
    
    // Start monitoring if enabled
    if (options.autoStart !== false) {
      this.startMonitoring();
    }
  }

  /**
   * Start performance monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    // Monitor system metrics every 30 seconds
    this.monitoringInterval = setInterval(() => {
      this.collectSystemMetrics();
      this.checkThresholds();
    }, 30000);
    
    this.emit('monitoring:started');
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    this.emit('monitoring:stopped');
  }

  /**
   * Collect system performance metrics
   */
  collectSystemMetrics() {
    // Memory metrics
    const memUsage = process.memoryUsage();
    const memUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100;
    const memTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100;
    const memPercentage = Math.round((memUsedMB / memTotalMB) * 100);
    
    this.metrics.system.memory.current = memPercentage;
    this.metrics.system.memory.peak = Math.max(this.metrics.system.memory.peak, memPercentage);
    
    // CPU metrics (approximation using process.cpuUsage)
    const cpuUsage = process.cpuUsage();
    const cpuPercent = Math.min(100, Math.round((cpuUsage.user + cpuUsage.system) / 10000));
    
    this.metrics.system.cpu.current = cpuPercent;
    this.metrics.system.cpu.peak = Math.max(this.metrics.system.cpu.peak, cpuPercent);
    
    // Uptime
    this.metrics.system.uptime = Math.floor(process.uptime());
    
    this.emit('metrics:collected', this.metrics);
  }

  /**
   * Record HTTP request metrics
   */
  recordRequest(req, res, responseTime) {
    this.metrics.requests.total++;
    this.metrics.requests.responseTimes.push(responseTime);
    
    // Keep only last 1000 response times for calculation
    if (this.metrics.requests.responseTimes.length > 1000) {
      this.metrics.requests.responseTimes = this.metrics.requests.responseTimes.slice(-1000);
    }
    
    // Track status codes
    const statusCode = res.statusCode;
    this.metrics.requests.statusCodes[statusCode] = 
      (this.metrics.requests.statusCodes[statusCode] || 0) + 1;
    
    // Track errors (4xx and 5xx)
    if (statusCode >= 400) {
      this.metrics.requests.errors++;
    }
    
    this.emit('request:recorded', { req, res, responseTime });
  }

  /**
   * Record database query metrics
   */
  recordDatabaseQuery(duration, isError = false) {
    this.metrics.database.queries.total++;
    
    if (isError) {
      this.metrics.database.queries.errors++;
    }
    
    // Consider queries > 1 second as slow
    if (duration > 1000) {
      this.metrics.database.queries.slow++;
    }
    
    this.emit('database:query', { duration, isError });
  }

  /**
   * Record WebRTC connection metrics
   */
  recordWebRTCConnection(action, connectionId) {
    switch (action) {
      case 'connect':
        this.metrics.webrtc.activeConnections++;
        this.metrics.webrtc.totalConnections++;
        break;
      case 'disconnect':
        this.metrics.webrtc.activeConnections = Math.max(0, this.metrics.webrtc.activeConnections - 1);
        break;
      case 'error':
        this.metrics.webrtc.connectionErrors++;
        break;
    }
    
    this.emit('webrtc:connection', { action, connectionId });
  }

  /**
   * Check performance thresholds and trigger alerts
   */
  checkThresholds() {
    const checks = [
      {
        name: 'memory_usage',
        value: this.metrics.system.memory.current,
        threshold: this.thresholds.memoryUsage,
        message: `Memory usage is ${this.metrics.system.memory.current}%`
      },
      {
        name: 'cpu_usage',
        value: this.metrics.system.cpu.current,
        threshold: this.thresholds.cpuUsage,
        message: `CPU usage is ${this.metrics.system.cpu.current}%`
      },
      {
        name: 'error_rate',
        value: this.getErrorRate(),
        threshold: this.thresholds.errorRate,
        message: `Error rate is ${this.getErrorRate().toFixed(2)}%`
      },
      {
        name: 'avg_response_time',
        value: this.getAverageResponseTime(),
        threshold: this.thresholds.responseTime,
        message: `Average response time is ${this.getAverageResponseTime()}ms`
      }
    ];

    checks.forEach(check => {
      if (check.value > check.threshold) {
        this.triggerAlert(check.name, check.message, check.value);
      } else {
        this.clearAlert(check.name);
      }
    });
  }

  /**
   * Trigger performance alert
   */
  triggerAlert(alertName, message, value) {
    const now = Date.now();
    const existingAlert = this.alerts.get(alertName);
    
    // Don't spam alerts - wait at least 5 minutes between same alerts
    if (existingAlert && (now - existingAlert.timestamp) < 300000) {
      return;
    }
    
    const alert = {
      name: alertName,
      message,
      value,
      timestamp: now,
      severity: this.getAlertSeverity(alertName, value)
    };
    
    this.alerts.set(alertName, alert);
    this.emit('alert:triggered', alert);
  }

  /**
   * Clear performance alert
   */
  clearAlert(alertName) {
    if (this.alerts.has(alertName)) {
      const alert = this.alerts.get(alertName);
      this.alerts.delete(alertName);
      this.emit('alert:cleared', alert);
    }
  }

  /**
   * Get alert severity based on how much threshold is exceeded
   */
  getAlertSeverity(alertName, value) {
    const threshold = this.thresholds[alertName.replace('_usage', 'Usage').replace('_', '')];
    const exceedPercentage = ((value - threshold) / threshold) * 100;
    
    if (exceedPercentage > 50) return 'critical';
    if (exceedPercentage > 20) return 'high';
    return 'medium';
  }

  /**
   * Calculate current error rate
   */
  getErrorRate() {
    if (this.metrics.requests.total === 0) return 0;
    return (this.metrics.requests.errors / this.metrics.requests.total) * 100;
  }

  /**
   * Calculate average response time
   */
  getAverageResponseTime() {
    const times = this.metrics.requests.responseTimes;
    if (times.length === 0) return 0;
    
    const sum = times.reduce((acc, time) => acc + time, 0);
    return Math.round(sum / times.length);
  }

  /**
   * Get 95th percentile response time
   */
  get95thPercentileResponseTime() {
    const times = [...this.metrics.requests.responseTimes].sort((a, b) => a - b);
    if (times.length === 0) return 0;
    
    const index = Math.floor(times.length * 0.95);
    return times[index] || 0;
  }

  /**
   * Get current performance summary
   */
  getPerformanceSummary() {
    return {
      system: {
        memory: {
          current: this.metrics.system.memory.current,
          peak: this.metrics.system.memory.peak,
          status: this.metrics.system.memory.current > this.thresholds.memoryUsage ? 'warning' : 'ok'
        },
        cpu: {
          current: this.metrics.system.cpu.current,
          peak: this.metrics.system.cpu.peak,
          status: this.metrics.system.cpu.current > this.thresholds.cpuUsage ? 'warning' : 'ok'
        },
        uptime: this.metrics.system.uptime
      },
      requests: {
        total: this.metrics.requests.total,
        errors: this.metrics.requests.errors,
        errorRate: this.getErrorRate(),
        averageResponseTime: this.getAverageResponseTime(),
        p95ResponseTime: this.get95thPercentileResponseTime(),
        statusCodes: this.metrics.requests.statusCodes
      },
      database: this.metrics.database,
      webrtc: this.metrics.webrtc,
      alerts: Array.from(this.alerts.values()),
      status: this.getOverallStatus()
    };
  }

  /**
   * Get overall system status
   */
  getOverallStatus() {
    if (this.alerts.size === 0) return 'healthy';
    
    const severities = Array.from(this.alerts.values()).map(alert => alert.severity);
    
    if (severities.includes('critical')) return 'critical';
    if (severities.includes('high')) return 'degraded';
    return 'warning';
  }

  /**
   * Reset metrics (useful for testing or periodic resets)
   */
  resetMetrics() {
    this.metrics.requests = {
      total: 0,
      errors: 0,
      responseTimes: [],
      statusCodes: {}
    };
    
    this.metrics.database.queries = { total: 0, slow: 0, errors: 0 };
    this.metrics.webrtc = {
      activeConnections: 0,
      totalConnections: 0,
      connectionErrors: 0
    };
    
    this.alerts.clear();
    this.emit('metrics:reset');
  }
}

/**
 * Create Express middleware for performance monitoring
 */
function createPerformanceMiddleware(monitor) {
  return (req, res, next) => {
    const startTime = Date.now();
    
    // Override res.end to capture response time
    const originalEnd = res.end;
    res.end = function(chunk, encoding) {
      const responseTime = Date.now() - startTime;
      monitor.recordRequest(req, res, responseTime);
      originalEnd.call(this, chunk, encoding);
    };
    
    next();
  };
}

/**
 * Create health check function
 */
function createHealthCheck(monitor) {
  return () => {
    const summary = monitor.getPerformanceSummary();
    
    return {
      status: summary.status,
      timestamp: new Date().toISOString(),
      uptime: summary.system.uptime,
      memory: summary.system.memory,
      cpu: summary.system.cpu,
      requests: {
        total: summary.requests.total,
        errorRate: summary.requests.errorRate,
        averageResponseTime: summary.requests.averageResponseTime
      },
      database: summary.database,
      webrtc: summary.webrtc,
      alerts: summary.alerts.length,
      activeAlerts: summary.alerts.filter(alert => alert.severity === 'critical' || alert.severity === 'high')
    };
  };
}

module.exports = {
  PerformanceMonitor,
  createPerformanceMiddleware,
  createHealthCheck
}; 