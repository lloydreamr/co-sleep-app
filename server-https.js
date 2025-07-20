const express = require('express');
const https = require('https');
const fs = require('fs');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();

// Create self-signed certificate for development
const options = {
    key: fs.readFileSync(path.join(__dirname, 'certs', 'key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'certs', 'cert.pem'))
};

const server = https.createServer(options, app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname)));

// Queue management
let waitingQueue = [];
let activeConnections = new Map();
let connectionStats = {
    totalConnections: 0,
    successfulConnections: 0,
    failedConnections: 0,
    averageConnectionTime: 0
};

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Join the waiting queue
    socket.on('join-queue', () => {
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
        socket.to(data.target).emit('offer', {
            offer: data.offer,
            from: socket.id
        });
    });

    socket.on('answer', (data) => {
        console.log(`Answer from ${socket.id} to ${data.target}`);
        socket.to(data.target).emit('answer', {
            answer: data.answer,
            from: socket.id
        });
    });

    socket.on('ice-candidate', (data) => {
        console.log(`ICE candidate from ${socket.id} to ${data.target}`);
        socket.to(data.target).emit('ice-candidate', {
            candidate: data.candidate,
            from: socket.id
        });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        
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
            
            // Don't automatically return partner to queue
            // Let them manually choose to reconnect if they want
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
            
            // Notify partner
            socket.to(partnerId).emit('call-ended');
            
            // Don't automatically return users to queue
            // Let them manually choose to reconnect if they want
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
            console.log(`Matching ${user1} (initiator) with ${user2} (responder)`);
            
            // Update connection stats
            connectionStats.totalConnections++;
            
            // Create connection record with role assignment
            activeConnections.set(user1, { 
                partnerId: user2, 
                isInitiator: true, 
                matchTime: Date.now() 
            });
            activeConnections.set(user2, { 
                partnerId: user1, 
                isInitiator: false, 
                matchTime: Date.now() 
            });
            
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
        queueLength: waitingQueue.length,
        activeConnections: activeConnections.size / 2,
        connectionStats: connectionStats,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
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
    console.log(`Hence server running on HTTPS port ${PORT}`);
    console.log(`Local: https://localhost:${PORT}`);
    console.log(`Network: https://${HOST === '0.0.0.0' ? '10.0.0.31' : HOST}:${PORT}`);
    console.log(`Mobile: Open the Network URL on your phone (make sure you're on the same WiFi)`);
    console.log(`🔒 HTTPS is required for mobile microphone access`);
}); 