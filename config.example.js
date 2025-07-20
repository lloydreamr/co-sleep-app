// Hence - Sleep Presence System Configuration

module.exports = {
    // Server Configuration
    port: process.env.PORT || 3000,
    environment: process.env.NODE_ENV || 'development',
    
    // WebRTC Configuration
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
        // Add your TURN servers here for production:
        // {
        //     urls: 'turn:your-turn-server.com:3478',
        //     username: 'your-username',
        //     credential: 'your-password'
        // }
    ],
    
    // Queue Configuration
    maxQueueSize: 100,
    matchTimeout: 30000, // 30 seconds
    
    // Security Configuration
    corsOrigin: process.env.CORS_ORIGIN || '*',
    
    // Logging Configuration
    logLevel: process.env.LOG_LEVEL || 'info'
}; 