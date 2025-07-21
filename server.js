const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const prisma = require('./lib/prisma');
// Import routes
const authRoutes = require('./routes/auth');
const { initSocketService } = require('./services/socket');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Routes
app.use('/api/auth', authRoutes);

// Initialize Socket.IO and matchmaking
const socketService = initSocketService(server);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        onlineUsers: socketService.getOnlineUserCount(),
        queueLength: socketService.getQueueLength(),
        activeConnections: socketService.getActiveConnections(),
        timestamp: new Date().toISOString()
    });
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Centralized error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
    console.log(`Co-Sleep server running on port ${PORT}`);
    console.log(`Local: http://localhost:${PORT}`);
    console.log(`Network: http://${HOST === '0.0.0.0' ? '10.0.0.31' : HOST}:${PORT}`);
    console.log(`Mobile: Open the Network URL on your phone (make sure you're on the same WiFi)`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    await prisma.$disconnect();
    process.exit(0);
});
