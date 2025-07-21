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
    }
  });

  // In-memory state
  let waitingQueue = [];
  let activeConnections = new Map();
  let onlineUsers = new Set();

  // Broadcast online user count
  function broadcastOnlineCount() {
    const count = onlineUsers.size;
    io.emit('online-count', { count });
    console.log(`Online users: ${count}`);
  }

  // Matchmaking logic
  function checkForMatches() {
    while (waitingQueue.length >= 2) {
      const user1 = waitingQueue.shift();
      const user2 = waitingQueue.shift();
      if (io.sockets.sockets.has(user1) && io.sockets.sockets.has(user2)) {
        console.log(`Matching ${user1} with ${user2}`);
        activeConnections.set(user1, { partnerId: user2, isInitiator: true });
        activeConnections.set(user2, { partnerId: user1, isInitiator: false });
        io.to(user1).emit('match-found', { partnerId: user2, isInitiator: true });
        io.to(user2).emit('match-found', { partnerId: user1, isInitiator: false });
      } else {
        if (io.sockets.sockets.has(user1)) waitingQueue.unshift(user1);
        if (io.sockets.sockets.has(user2)) waitingQueue.unshift(user2);
      }
    }
  }

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
    onlineUsers.add(socket.id);
    broadcastOnlineCount();

    socket.on('join-queue', () => {
      if (!waitingQueue.includes(socket.id)) waitingQueue.push(socket.id);
      checkForMatches();
    });

    socket.on('leave-queue', () => {
      waitingQueue = waitingQueue.filter(id => id !== socket.id);
    });

    socket.on('offer', (data) => {
      if (io.sockets.sockets.has(data.target)) {
        socket.to(data.target).emit('offer', { offer: data.offer, from: socket.id });
      }
    });
    socket.on('answer', (data) => {
      if (io.sockets.sockets.has(data.target)) {
        socket.to(data.target).emit('answer', { answer: data.answer, from: socket.id });
      }
    });
    socket.on('ice-candidate', (data) => {
      if (io.sockets.sockets.has(data.target)) {
        socket.to(data.target).emit('ice-candidate', { candidate: data.candidate, from: socket.id });
      }
    });

    socket.on('skip-partner', () => {
      const connection = activeConnections.get(socket.id);
      if (connection) {
        const partnerId = connection.partnerId;
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

    socket.on('disconnect', () => {
      onlineUsers.delete(socket.id);
      broadcastOnlineCount();
      waitingQueue = waitingQueue.filter(id => id !== socket.id);
      const connection = activeConnections.get(socket.id);
      if (connection) {
        const partnerId = connection.partnerId;
        activeConnections.delete(socket.id);
        activeConnections.delete(partnerId);
        socket.to(partnerId).emit('partner-disconnected');
        if (io.sockets.sockets.has(partnerId)) {
          waitingQueue.push(partnerId);
          io.to(partnerId).emit('return-to-queue');
        }
      }
    });

    socket.on('end-call', () => {
      const connection = activeConnections.get(socket.id);
      if (connection) {
        const partnerId = connection.partnerId;
        activeConnections.delete(socket.id);
        activeConnections.delete(partnerId);
        socket.to(partnerId).emit('call-ended');
      }
    });
  });

  // Expose online user count for health check
  return {
    getOnlineUserCount: () => onlineUsers.size,
    getQueueLength: () => waitingQueue.length,
    getActiveConnections: () => activeConnections.size / 2
  };
}

module.exports = { initSocketService }; 