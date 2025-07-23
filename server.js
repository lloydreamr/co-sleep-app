const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const prisma = require('./lib/prisma');
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

// Trust proxy for rate limiting behind load balancers
app.set('trust proxy', 1);

// Performance optimizations
const rateLimit = require('express-rate-limit');

// Rate limiting configuration
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many API requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting for health checks
    skip: (req) => req.path === '/health'
});

// Apply rate limiting to API routes
app.use('/api/', apiLimiter);

// Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            connectSrc: ["'self'", "wss:", "ws:"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            scriptSrcAttr: ["'unsafe-inline'"], // FIXED: Allow inline event handlers
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
            imgSrc: ["'self'", "data:", "https:"],
            fontSrc: ["'self'", "https:", "data:", "https://fonts.gstatic.com"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'", "https://www.soundjay.com", "https:"],
            frameSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            frameAncestors: ["'self'"],
            upgradeInsecureRequests: []
        }
    }
}));
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Limit JSON payload size
app.use(express.static(path.join(__dirname), {
    maxAge: '1h', // Cache static files for 1 hour
    etag: true,
    lastModified: true
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/history', historyRoutes); // Hence Enhancement
// Phase 3: New route registrations
app.use('/api/favorites', favoritesRoutes);
app.use('/api/scheduling', schedulingRoutes);
app.use('/api/analytics', analyticsRoutes);
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

// Enhanced health check endpoint with performance metrics
app.get('/health', (req, res) => {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    // Hence Enhancement: Include new metrics
    const performanceMetrics = socketService.getPerformanceMetrics();
    
    res.json({
        status: 'healthy',
        onlineUsers: socketService.getOnlineUserCount(),
        queueLength: socketService.getQueueLength(),
        activeConnections: socketService.getActiveConnections(),
        // Hence Enhancement: New state metrics
        activeUserStates: socketService.getActiveUserStates().length,
        userStatesTotal: performanceMetrics.userStates || 0,
        performance: {
            uptime: Math.floor(uptime),
            memory: {
                rss: memUsage.rss,
                heapUsed: memUsage.heapUsed,
                heapTotal: memUsage.heapTotal,
                external: memUsage.external
            },
            cpu: process.cpuUsage()
        },
        timestamp: new Date().toISOString()
    });
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

// Enhanced error handling with performance logging
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    
    // Log performance impact
    const memUsage = process.memoryUsage();
    console.error('Memory usage at error:', {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100 + 'MB',
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100 + 'MB'
    });
    
    res.status(500).json({ 
        error: 'Internal server error',
        timestamp: new Date().toISOString()
    });
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
