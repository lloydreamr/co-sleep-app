const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const prisma = require('./lib/prisma');

// Phase 3: Production hardening imports
const { 
  createRateLimiters, 
  getSecurityHeaders, 
  sanitizeInput, 
  securityHeaders, 
  suspiciousActivityDetector, 
  requestValidator 
} = require('./lib/securityMiddleware');
const { 
  createLogger, 
  requestLogger, 
  errorLogger, 
  authAuditLogger, 
  securityLogger 
} = require('./lib/auditLogger');
const { 
  PerformanceMonitor, 
  createPerformanceMiddleware, 
  createHealthCheck 
  } = require('./lib/performanceMonitor');

// Import routes
const authRoutes = require('./routes/auth');
const onboardingRoutes = require('./routes/onboarding');
const historyRoutes = require('./routes/history'); // Hence Enhancement
// Phase 3: New route imports
const favoritesRoutes = require('./routes/favorites');
const schedulingRoutes = require('./routes/scheduling');
const analyticsRoutes = require('./routes/analytics');
// Premium routes disabled for freemium version
// const premiumRoutes = require('./routes/premium');
const { initSocketService } = require('./services/socket');

const app = express();
const server = http.createServer(app);

// Phase 3: Initialize production hardening systems
const logger = createLogger();
const performanceMonitor = new PerformanceMonitor();
const authAudit = authAuditLogger(logger);
const securityAudit = securityLogger(logger);
const healthCheck = createHealthCheck(performanceMonitor);

// Trust proxy for accurate client IPs
app.set('trust proxy', 1);

// Phase 3: Enhanced security middleware
const rateLimiters = createRateLimiters();
const securityHeadersConfig = getSecurityHeaders();

// Phase 3: Production middleware stack (order matters!)
logger.info('Starting Co-Sleep server with production hardening');

// Security: Request validation and size limits
app.use(requestValidator);

// Security: Enhanced helmet configuration  
app.use(securityHeadersConfig);

// Security: Additional headers and server info removal
app.use(securityHeaders);

// Security: Input sanitization
app.use(sanitizeInput);

// Security: Suspicious activity detection
app.use(suspiciousActivityDetector);

// Monitoring: Performance tracking
app.use(createPerformanceMiddleware(performanceMonitor));

// Logging: Request/response audit trail
app.use(requestLogger(logger));

// CORS configuration
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://yourdomain.com'] // Replace with actual domain
        : true,
    credentials: true
}));

// Enhanced JSON parsing with size limits
app.use(express.json({ 
    limit: '1mb',
    verify: (req, res, buf, encoding) => {
        // Log large payloads
        if (buf.length > 100000) { // 100KB
            logger.warn('Large JSON payload received', {
                size: buf.length,
                url: req.originalUrl,
                ip: req.ip
            });
        }
    }
}));
// Static files with generous rate limiting
app.use(rateLimiters.staticLimiter, express.static(path.join(__dirname), {
    maxAge: process.env.NODE_ENV === 'production' ? '24h' : '1h',
    etag: true,
    lastModified: true,
    immutable: false
}));

// Phase 3: Enhanced route registration with security
// Authentication routes with strict rate limiting
app.use('/api/auth', rateLimiters.authLimiter, authRoutes);

// API routes with moderate rate limiting and speed limiting
app.use('/api/onboarding', rateLimiters.apiLimiter, rateLimiters.speedLimiter, onboardingRoutes);
app.use('/api/history', rateLimiters.apiLimiter, rateLimiters.speedLimiter, historyRoutes);
app.use('/api/favorites', rateLimiters.apiLimiter, rateLimiters.speedLimiter, favoritesRoutes);
app.use('/api/scheduling', rateLimiters.apiLimiter, rateLimiters.speedLimiter, schedulingRoutes);
app.use('/api/analytics', rateLimiters.apiLimiter, rateLimiters.speedLimiter, analyticsRoutes);

// Premium routes disabled for freemium version
// app.use('/api/premium', premiumRoutes);

// Serve onboarding page
app.get('/onboarding', (req, res) => {
    res.sendFile(path.join(__dirname, 'onboarding.html'));
});

// Premium pages disabled for freemium version
// app.get('/premium', (req, res) => {
//     res.sendFile(path.join(__dirname, 'premium.html'));
// });

// app.get('/premium/success', (req, res) => {
//     res.sendFile(path.join(__dirname, 'premium.html'));
// });

// app.get('/premium/cancel', (req, res) => {
//     res.sendFile(path.join(__dirname, 'premium.html'));
// });

// Initialize Socket.IO and matchmaking
const socketService = initSocketService(server);

// Phase 3: Enhanced health check with comprehensive monitoring
app.get('/health', (req, res) => {
    try {
        const health = healthCheck();
        const socketMetrics = socketService.getPerformanceMetrics();
        
        const response = {
            ...health,
            socket: {
                onlineUsers: socketService.getOnlineUserCount(),
                queueLength: socketService.getQueueLength(),
                activeConnections: socketService.getActiveConnections(),
                activeUserStates: socketService.getActiveUserStates().length,
                userStatesTotal: socketMetrics.userStates || 0
            },
            version: process.env.npm_package_version || '1.0.0',
            environment: process.env.NODE_ENV || 'development'
        };
        
        // Log health check requests for monitoring
        if (health.status !== 'healthy') {
            logger.warn('Health check shows degraded status', { 
                status: health.status, 
                alerts: health.activeAlerts 
            });
        }
        
        res.json(response);
    } catch (error) {
        logger.error('Health check failed', { error: error.message });
        res.status(503).json({
            status: 'error',
            message: 'Health check failed',
            timestamp: new Date().toISOString()
        });
    }
});

// Simple health check that doesn't require database
app.get('/ping', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Performance monitoring endpoint
app.get('/api/performance', (req, res) => {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    res.json({
        memory: {
            used: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100,
            total: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100,
            external: Math.round(memUsage.external / 1024 / 1024 * 100) / 100
        },
        cpu: {
            user: cpuUsage.user,
            system: cpuUsage.system
        },
        uptime: process.uptime(),
        connections: socketService.getActiveConnections()
    });
});

// Hence Enhancement: User state monitoring endpoint (for debugging)
app.get('/api/debug/user-states', (req, res) => {
    try {
        const userStates = socketService.getUserStates();
        const activeStates = socketService.getActiveUserStates();
        
        res.json({
            totalStates: userStates.length,
            activeStates: activeStates.length,
            states: activeStates, // Only return active states for privacy
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('User states debug error:', error);
        res.status(500).json({ error: 'Failed to fetch user states' });
    }
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Phase 3: Production error handling with comprehensive logging
app.use(errorLogger(logger));

app.use((err, req, res, next) => {
    // Security: Don't expose internal errors in production
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    const errorResponse = {
        error: 'Internal server error',
        timestamp: new Date().toISOString()
    };
    
    // Add error details only in development
    if (isDevelopment) {
        errorResponse.details = {
            message: err.message,
            stack: err.stack
        };
    }
    
    // Track error in performance monitor
    performanceMonitor.recordRequest(req, { statusCode: 500 }, 0);
    
    res.status(500).json(errorResponse);
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Not found',
        path: req.path,
        timestamp: new Date().toISOString()
    });
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Check for required environment variables
if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required but not set');
    console.error('Please set DATABASE_URL in your environment variables');
    console.error('Example: DATABASE_URL="postgresql://username:password@localhost:5432/cosleep_db"');
    process.exit(1);
}

// Test database connection before starting server
async function testDatabaseConnection() {
    try {
        await prisma.$connect();
        console.log('✅ Database connection successful');
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        console.error('Please check your DATABASE_URL and ensure the database is accessible');
        process.exit(1);
    }
}

// Start server after database connection test
testDatabaseConnection().then(() => {
    server.listen(PORT, HOST, () => {
        console.log(`Co-Sleep server running on port ${PORT}`);
        console.log(`Local: http://localhost:${PORT}`);
        console.log(`Network: http://${HOST === '0.0.0.0' ? '10.0.0.31' : HOST}:${PORT}`);
        console.log(`Mobile: Open the Network URL on your phone (make sure you're on the same WiFi)`);
        
        // Log initial performance metrics
        const memUsage = process.memoryUsage();
        console.log('Initial memory usage:', {
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100 + 'MB',
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100 + 'MB'
        });

        // Hence Enhancement: Log new features status
        console.log('🎯 Hence features enabled:');
        console.log('  - Enhanced user state tracking');
        console.log('  - Call history API (verified users)');
        console.log('  - Role-based feature access');
        console.log('  - Real-time activity monitoring');
    });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('Received SIGTERM signal. Starting graceful shutdown...');
    
    try {
        // Close server
        server.close(() => {
            console.log('HTTP server closed');
        });
        
        // Disconnect from database
        await prisma.$disconnect();
        console.log('Database connection closed');
        
        process.exit(0);
    } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
    }
});

// Memory leak detection
setInterval(() => {
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100;
    
    // Warn if memory usage is high
    if (heapUsedMB > 100) {
        console.warn(`High memory usage: ${heapUsedMB}MB`);
    }
}, 60000); // Check every minute
