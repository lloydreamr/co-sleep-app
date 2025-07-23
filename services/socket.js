/**
 * Socket.IO and matchmaking service for Co-Sleep app
 * Handles real-time queue, matching, and signaling logic
 * @module services/socket
 */

const { Server } = require('socket.io');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
  
  // Hence Enhancement: Enhanced user tracking
  let userStates = new Map(); // userId -> { connectionState, voiceState, lastActivity, socketId }
  let onlineCount = 0;
  
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
      onlineCount = count;
      io.emit('online-count', { count });
      console.log(`📊 Online users: ${count}`);
    }, 1000); // Debounce to 1 second
  }

  // Hence Enhancement: Enhanced user state management
  function updateUserState(userId, socketId, updates) {
    const currentState = userStates.get(userId) || {
      connectionState: 'idle',
      voiceState: 'unmuted',
      lastActivity: Date.now(),
      socketId: socketId
    };

    const newState = { ...currentState, ...updates, lastActivity: Date.now() };
    userStates.set(userId, newState);

    // Broadcast state change to other users if needed
    if (updates.connectionState || updates.voiceState) {
      io.emit('user-state-changed', {
        userId,
        connectionState: newState.connectionState,
        voiceState: newState.voiceState,
        timestamp: Date.now()
      });
    }

    return newState;
  }

  // Hence Enhancement: Activity tracking
  async function updateUserActivity(userId) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { lastActivity: new Date() }
      });

      // Update in-memory state
      const userState = userStates.get(userId);
      if (userState) {
        userState.lastActivity = Date.now();
      }
    } catch (error) {
      console.error(`❌ Failed to update activity for user ${userId}:`, error);
    }
  }

  // Enhanced matchmaking logic with performance tracking
  function checkForMatches() {
    const startTime = Date.now();
    let matchesFound = 0;
    
    while (waitingQueue.length >= 2) {
      const user1 = waitingQueue.shift();
      const user2 = waitingQueue.shift();
      
      if (io.sockets.sockets.has(user1) && io.sockets.sockets.has(user2)) {
        console.log(`🤝 Matching ${user1} with ${user2}`);
        
        const matchTime = Date.now();
        activeConnections.set(user1, { 
          partnerId: user2, 
          isInitiator: true,
          startTime: matchTime
        });
        activeConnections.set(user2, { 
          partnerId: user1, 
          isInitiator: false,
          startTime: matchTime
        });
        
        // Hence Enhancement: Update user states
        updateUserState(user1, user1, { connectionState: 'matched' });
        updateUserState(user2, user2, { connectionState: 'matched' });
        
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
    
    // Hence Enhancement: Clean up inactive user states
    for (const [userId, state] of userStates.entries()) {
      if (state.lastActivity < cutoff) {
        userStates.delete(userId);
        console.log(`🧹 Cleaned up inactive user state: ${userId}`);
      }
    }
    
    // Log memory usage
    const memUsage = process.memoryUsage();
    console.log('Socket service memory usage:', {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100 + 'MB',
      onlineUsers: onlineUsers.size,
      activeConnections: activeConnections.size,
      waitingQueue: waitingQueue.length,
      userStates: userStates.size
    });
    
    lastCleanup = now;
  }

  // Set up periodic cleanup
  setInterval(performCleanup, CLEANUP_INTERVAL);

  io.on('connection', (socket) => {
    console.log(`👋 User connected: ${socket.id}`);
    onlineUsers.add(socket.id);
    broadcastOnlineCount();

    // Track connection time
    const connectionStart = Date.now();

    // Hence Enhancement: Handle user identification
    socket.on('identify-user', (data) => {
      const { userId } = data;
      if (userId) {
        updateUserState(userId, socket.id, { connectionState: 'idle' });
        console.log(`👤 User identified: ${userId} (${socket.id})`);
      }
    });

    // Hence Enhancement: Handle activity updates
    socket.on('update-activity', async (data) => {
      const { userId } = data;
      if (userId) {
        await updateUserActivity(userId);
      }
    });

    // Hence Enhancement: Handle user state updates
    socket.on('user-state-update', (data) => {
      const { userId, connectionState, voiceState } = data;
      if (userId) {
        updateUserState(userId, socket.id, { connectionState, voiceState });
      }
    });

    socket.on('join-queue', () => {
      if (!waitingQueue.includes(socket.id)) {
        waitingQueue.push(socket.id);
        console.log(`🚶 User ${socket.id} joined queue. Queue length: ${waitingQueue.length}`);
        
        // Hence Enhancement: Update state
        // Note: We need userId for proper state management
        // This will be enhanced when the frontend sends userId with events
      }
      checkForMatches();
    });

    socket.on('leave-queue', () => {
      waitingQueue = waitingQueue.filter(id => id !== socket.id);
      console.log(`🚪 User ${socket.id} left queue. Queue length: ${waitingQueue.length}`);
      
      // Hence Enhancement: Update state to idle
      for (const [userId, state] of userStates.entries()) {
        if (state.socketId === socket.id) {
          updateUserState(userId, socket.id, { connectionState: 'idle' });
          break;
        }
      }
    });

    // Enhanced signaling with error handling
    socket.on('offer', (data) => {
      if (io.sockets.sockets.has(data.target)) {
        socket.to(data.target).emit('offer', { offer: data.offer, from: socket.id });
      } else {
        console.warn(`❌ Target ${data.target} not found for offer from ${socket.id}`);
      }
    });
    
    socket.on('answer', (data) => {
      if (io.sockets.sockets.has(data.target)) {
        socket.to(data.target).emit('answer', { answer: data.answer, from: socket.id });
      } else {
        console.warn(`❌ Target ${data.target} not found for answer from ${socket.id}`);
      }
    });
    
    socket.on('ice-candidate', (data) => {
      if (io.sockets.sockets.has(data.target)) {
        socket.to(data.target).emit('ice-candidate', { candidate: data.candidate, from: socket.id });
      } else {
        console.warn(`❌ Target ${data.target} not found for ICE candidate from ${socket.id}`);
      }
    });

    // Hence Enhancement: Handle call history saving
    socket.on('save-call-history', async (data) => {
      try {
        const { userId, partnerId, startTime, endTime, duration, connectionQuality, endReason } = data;
        
        await prisma.callHistory.create({
          data: {
            userId,
            partnerId,
            partnerType: 'unknown', // This can be enhanced to track partner type
            startTime: new Date(startTime),
            endTime: endTime ? new Date(endTime) : null,
            duration,
            connectionQuality,
            endReason
          }
        });
        
        console.log(`📝 Call history saved for user ${userId}`);
      } catch (error) {
        console.error('❌ Failed to save call history:', error);
      }
    });

    socket.on('skip-partner', () => {
      const connection = activeConnections.get(socket.id);
      if (connection) {
        const partnerId = connection.partnerId;
        const connectionDuration = Date.now() - connection.startTime;
        
        console.log(`⏭️ User ${socket.id} skipped partner ${partnerId} after ${connectionDuration}ms`);
        
        activeConnections.delete(socket.id);
        activeConnections.delete(partnerId);
        
        // Hence Enhancement: Update states
        for (const [userId, state] of userStates.entries()) {
          if (state.socketId === socket.id || state.socketId === partnerId) {
            updateUserState(userId, state.socketId, { connectionState: 'idle' });
          }
        }
        
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
      console.log(`👋 User disconnected: ${socket.id} (${reason}) after ${connectionDuration}ms`);
      
      onlineUsers.delete(socket.id);
      broadcastOnlineCount();
      waitingQueue = waitingQueue.filter(id => id !== socket.id);
      
      // Hence Enhancement: Clean up user state
      for (const [userId, state] of userStates.entries()) {
        if (state.socketId === socket.id) {
          userStates.delete(userId);
          break;
        }
      }
      
      const connection = activeConnections.get(socket.id);
      if (connection) {
        const partnerId = connection.partnerId;
        const sessionDuration = Date.now() - connection.startTime;
        
        console.log(`📞 Session ended: ${socket.id} with ${partnerId} after ${sessionDuration}ms`);
        
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
        
        console.log(`📞 Call ended by ${socket.id} with ${partnerId} after ${sessionDuration}ms`);
        
        activeConnections.delete(socket.id);
        activeConnections.delete(partnerId);
        
        // Hence Enhancement: Update states to idle
        for (const [userId, state] of userStates.entries()) {
          if (state.socketId === socket.id || state.socketId === partnerId) {
            updateUserState(userId, state.socketId, { connectionState: 'idle' });
          }
        }
        
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
    // Hence Enhancement: New state management methods
    getUserStates: () => Array.from(userStates.entries()),
    getActiveUserStates: () => {
      const now = Date.now();
      const activeStates = [];
      for (const [userId, state] of userStates.entries()) {
        if (now - state.lastActivity < 5 * 60 * 1000) { // Active within 5 minutes
          activeStates.push({ userId, ...state });
        }
      }
      return activeStates;
    },
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
        stats: connectionStats,
        userStates: userStates.size
      };
    }
  };
}

module.exports = { initSocketService }; 