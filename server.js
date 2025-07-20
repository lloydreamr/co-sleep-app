const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const prisma = require('./lib/prisma');
const { authenticateUser } = require('./lib/auth');

// Import routes
const authRoutes = require('./routes/auth');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Routes
app.use('/api/auth', authRoutes);

// Queue management and online users tracking
let waitingQueue = [];
let activeConnections = new Map();
let onlineUsers = new Set();

// Function to broadcast online user count
function broadcastOnlineCount() {
    const count = onlineUsers.size;
    io.emit('online-count', { count });
    console.log(`Online users: ${count}`);
}

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
    
    // Add user to online users
    onlineUsers.add(socket.id);
    broadcastOnlineCount();

    // Join the waiting queue
    socket.on('join-queue', async (data) => {
        console.log(`User ${socket.id} joined queue`);
        
        // Add to waiting queue
        if (!waitingQueue.includes(socket.id)) {
            waitingQueue.push(socket.id);
        }
        
        // Check if we can make a match
        checkForMatches();
    });

    // Leave the waiting queue
    socket.on('leave-queue', () => {
        console.log(`User ${socket.id} left queue`);
        waitingQueue = waitingQueue.filter(id => id !== socket.id);
    });

    // WebRTC signaling
    socket.on('offer', (data) => {
        console.log(`Offer from ${socket.id} to ${data.target}`);
        if (io.sockets.sockets.has(data.target)) {
            socket.to(data.target).emit('offer', {
                offer: data.offer,
                from: socket.id
            });
        } else {
            console.log(`Target ${data.target} not found for offer`);
        }
    });

    socket.on('answer', (data) => {
        console.log(`Answer from ${socket.id} to ${data.target}`);
        if (io.sockets.sockets.has(data.target)) {
            socket.to(data.target).emit('answer', {
                answer: data.answer,
                from: socket.id
            });
        } else {
            console.log(`Target ${data.target} not found for answer`);
        }
    });

    socket.on('ice-candidate', (data) => {
        console.log(`ICE candidate from ${socket.id} to ${data.target}`);
        if (io.sockets.sockets.has(data.target)) {
            socket.to(data.target).emit('ice-candidate', {
                candidate: data.candidate,
                from: socket.id
            });
        } else {
            console.log(`Target ${data.target} not found for ICE candidate`);
        }
    });

    // Handle skip partner
    socket.on('skip-partner', () => {
        console.log(`User ${socket.id} skipped partner`);
        
        const connection = activeConnections.get(socket.id);
        if (connection) {
            const partnerId = connection.partnerId;
            activeConnections.delete(socket.id);
            activeConnections.delete(partnerId);
            
            // Notify partner about skip
            socket.to(partnerId).emit('partner-skipped');
            
            // Return both users to queue
            if (io.sockets.sockets.has(partnerId)) {
                waitingQueue.push(partnerId);
                io.to(partnerId).emit('return-to-queue');
            }
            
            if (io.sockets.sockets.has(socket.id)) {
                waitingQueue.push(socket.id);
                socket.emit('return-to-queue');
            }
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        
        // Remove from online users
        onlineUsers.delete(socket.id);
        broadcastOnlineCount();
        
        // Remove from waiting queue
        waitingQueue = waitingQueue.filter(id => id !== socket.id);
        
        // Handle active connection cleanup
        const connection = activeConnections.get(socket.id);
        if (connection) {
            const partnerId = connection.partnerId;
            activeConnections.delete(socket.id);
            activeConnections.delete(partnerId);
            
            // Notify partner about disconnection
            socket.to(partnerId).emit('partner-disconnected');
            
            // Return partner to queue if they're still connected
            if (io.sockets.sockets.has(partnerId)) {
                waitingQueue.push(partnerId);
                io.to(partnerId).emit('return-to-queue');
            }
        }
    });

    // Handle call end
    socket.on('end-call', () => {
        console.log(`Call ended by ${socket.id}`);
        
        const connection = activeConnections.get(socket.id);
        if (connection) {
            const partnerId = connection.partnerId;
            activeConnections.delete(socket.id);
            activeConnections.delete(partnerId);
            
            // Notify partner about call end
            socket.to(partnerId).emit('call-ended');
            
            // Don't requeue users - just end the call
            // Users will return to main page
        }
    });
});

// Function to check for potential matches
function checkForMatches() {
    while (waitingQueue.length >= 2) {
        const user1 = waitingQueue.shift();
        const user2 = waitingQueue.shift();
        
        // Check if both users are still connected
        if (io.sockets.sockets.has(user1) && io.sockets.sockets.has(user2)) {
            console.log(`Matching ${user1} with ${user2}`);
            
            // Create connection record
            activeConnections.set(user1, { partnerId: user2, isInitiator: true });
            activeConnections.set(user2, { partnerId: user1, isInitiator: false });
            
            // Notify both users with role information
            io.to(user1).emit('match-found', { partnerId: user2, isInitiator: true });
            io.to(user2).emit('match-found', { partnerId: user1, isInitiator: false });
        } else {
            // If one user disconnected, put the other back in queue
            if (io.sockets.sockets.has(user1)) {
                waitingQueue.unshift(user1);
            }
            if (io.sockets.sockets.has(user2)) {
                waitingQueue.unshift(user2);
            }
        }
    }
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        onlineUsers: onlineUsers.size,
        queueLength: waitingQueue.length,
        activeConnections: activeConnections.size / 2,
        timestamp: new Date().toISOString()
    });
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
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
