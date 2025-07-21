/**
 * Socket.IO and matchmaking service for Co-Sleep app
 * Handles real-time queue, matching, and signaling logic
 * @module services/socket
 */

const { Server } = require('socket.io');

/**
 * Initializes Socket.IO and matchmaking logic
 * @param {http.Server} server - The HTTP server instance
 */
function initSocketService(server) {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    },
    // Performance optimizations
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    maxHttpBufferSize: 1e6 // 1MB
  });

  // In-memory state with performance optimizations
  let waitingQueue = [];
  let activeConnections = new Map();
  let onlineUsers = new Set();
  let connectionStats = {
    totalConnections: 0,
    successfulConnections: 0,
    failedConnections: 0,
    averageConnectionTime: 0,
    connectionTimes: []
  };

  // Performance monitoring
  let lastCleanup = Date.now();
  const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

  // Broadcast online user count with debouncing
  let broadcastTimeout = null;
  function broadcastOnlineCount() {
    if (broadcastTimeout) {
      clearTimeout(broadcastTimeout);
    }
    
    broadcastTimeout = setTimeout(() => {
      const count = onlineUsers.size;
      io.emit('online-count', { count });
      console.log(`Online users: ${count}`);
    }, 1000); // Debounce to 1 second
  }

  // Enhanced matchmaking logic with performance tracking
  function checkForMatches() {
    const startTime = Date.now();
    let matchesFound = 0;
    
    while (waitingQueue.length >= 2) {
      const user1 = waitingQueue.shift();
      const user2 = waitingQueue.shift();
      
      if (io.sockets.sockets.has(user1) && io.sockets.sockets.has(user2)) {
        console.log(`Matching ${user1} with ${user2}`);
        activeConnections.set(user1, { 
          partnerId: user2, 
          isInitiator: true,
          startTime: Date.now()
        });
        activeConnections.set(user2, { 
          partnerId: user1, 
          isInitiator: false,
          startTime: Date.now()
        });
        
        io.to(user1).emit('match-found', { partnerId: user2, isInitiator: true });
        io.to(user2).emit('match-found', { partnerId: user1, isInitiator: false });
        
        matchesFound++;
        connectionStats.totalConnections++;
      } else {
        if (io.sockets.sockets.has(user1)) waitingQueue.unshift(user1);
        if (io.sockets.sockets.has(user2)) waitingQueue.unshift(user2);
      }
    }
    
    if (matchesFound > 0) {
      const matchTime = Date.now() - startTime;
      connectionStats.connectionTimes.push(matchTime);
      
      // Keep only last 100 connection times for average calculation
      if (connectionStats.connectionTimes.length > 100) {
        connectionStats.connectionTimes.shift();
      }
      
      connectionStats.averageConnectionTime = 
        connectionStats.connectionTimes.reduce((a, b) => a + b, 0) / connectionStats.connectionTimes.length;
    }
  }

  // Periodic cleanup to prevent memory leaks
  function performCleanup() {
    const now = Date.now();
    const cutoff = now - (10 * 60 * 1000); // 10 minutes
    
    // Clean up old connection stats
    connectionStats.connectionTimes = connectionStats.connectionTimes.filter(time => time > cutoff);
    
    // Log memory usage
    const memUsage = process.memoryUsage();
    console.log('Socket service memory usage:', {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100 + 'MB',
      onlineUsers: onlineUsers.size,
      activeConnections: activeConnections.size,
      waitingQueue: waitingQueue.length
    });
    
    lastCleanup = now;
  }

  // Set up periodic cleanup
  setInterval(performCleanup, CLEANUP_INTERVAL);

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
    onlineUsers.add(socket.id);
    broadcastOnlineCount();

    // Track connection time
    const connectionStart = Date.now();

    socket.on('join-queue', () => {
      if (!waitingQueue.includes(socket.id)) {
        waitingQueue.push(socket.id);
        console.log(`User ${socket.id} joined queue. Queue length: ${waitingQueue.length}`);
      }
      checkForMatches();
    });

    socket.on('leave-queue', () => {
      waitingQueue = waitingQueue.filter(id => id !== socket.id);
      console.log(`User ${socket.id} left queue. Queue length: ${waitingQueue.length}`);
    });

    // Enhanced signaling with error handling
    socket.on('offer', (data) => {
      if (io.sockets.sockets.has(data.target)) {
        socket.to(data.target).emit('offer', { offer: data.offer, from: socket.id });
      } else {
        console.warn(`Target ${data.target} not found for offer from ${socket.id}`);
      }
    });
    
    socket.on('answer', (data) => {
      if (io.sockets.sockets.has(data.target)) {
        socket.to(data.target).emit('answer', { answer: data.answer, from: socket.id });
      } else {
        console.warn(`Target ${data.target} not found for answer from ${socket.id}`);
      }
    });
    
    socket.on('ice-candidate', (data) => {
      if (io.sockets.sockets.has(data.target)) {
        socket.to(data.target).emit('ice-candidate', { candidate: data.candidate, from: socket.id });
      } else {
        console.warn(`Target ${data.target} not found for ICE candidate from ${socket.id}`);
      }
    });

    socket.on('skip-partner', () => {
      const connection = activeConnections.get(socket.id);
      if (connection) {
        const partnerId = connection.partnerId;
        const connectionDuration = Date.now() - connection.startTime;
        
        console.log(`User ${socket.id} skipped partner ${partnerId} after ${connectionDuration}ms`);
        
        activeConnections.delete(socket.id);
        activeConnections.delete(partnerId);
        
        socket.to(partnerId).emit('partner-skipped');
        
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

    socket.on('disconnect', (reason) => {
      const connectionDuration = Date.now() - connectionStart;
      console.log(`User disconnected: ${socket.id} (${reason}) after ${connectionDuration}ms`);
      
      onlineUsers.delete(socket.id);
      broadcastOnlineCount();
      waitingQueue = waitingQueue.filter(id => id !== socket.id);
      
      const connection = activeConnections.get(socket.id);
      if (connection) {
        const partnerId = connection.partnerId;
        const sessionDuration = Date.now() - connection.startTime;
        
        console.log(`Session ended: ${socket.id} with ${partnerId} after ${sessionDuration}ms`);
        
        activeConnections.delete(socket.id);
        activeConnections.delete(partnerId);
        
        socket.to(partnerId).emit('partner-disconnected');
        
        if (io.sockets.sockets.has(partnerId)) {
          waitingQueue.push(partnerId);
          io.to(partnerId).emit('return-to-queue');
        }
        
        // Update connection stats
        if (sessionDuration > 5000) { // Only count sessions longer than 5 seconds
          connectionStats.successfulConnections++;
        } else {
          connectionStats.failedConnections++;
        }
      }
    });

    socket.on('end-call', () => {
      const connection = activeConnections.get(socket.id);
      if (connection) {
        const partnerId = connection.partnerId;
        const sessionDuration = Date.now() - connection.startTime;
        
        console.log(`Call ended by ${socket.id} with ${partnerId} after ${sessionDuration}ms`);
        
        activeConnections.delete(socket.id);
        activeConnections.delete(partnerId);
        
        socket.to(partnerId).emit('call-ended');
        
        // Update connection stats
        if (sessionDuration > 5000) {
          connectionStats.successfulConnections++;
        }
      }
    });
  });

  // Enhanced service interface with performance metrics
  return {
    getOnlineUserCount: () => onlineUsers.size,
    getQueueLength: () => waitingQueue.length,
    getActiveConnections: () => activeConnections.size / 2,
    getConnectionStats: () => ({
      ...connectionStats,
      currentOnline: onlineUsers.size,
      currentQueue: waitingQueue.length,
      currentActive: activeConnections.size / 2
    }),
    getPerformanceMetrics: () => {
      const memUsage = process.memoryUsage();
      return {
        memory: {
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100,
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100
        },
        connections: {
          online: onlineUsers.size,
          queue: waitingQueue.length,
          active: activeConnections.size / 2
        },
        stats: connectionStats
      };
    }
  };
}

module.exports = { initSocketService }; 