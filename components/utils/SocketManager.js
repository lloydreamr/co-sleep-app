/**
 * Socket Manager - Handles all Socket.IO communication
 * Centralized socket event handling and queue management
 */
export class SocketManager {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        
        // Event listeners
        this.listeners = new Map();
        
        // Connection monitoring
        this.connectionMonitor = null;
        this.heartbeatInterval = null;
        
        // Performance tracking
        this.stats = {
            messagesReceived: 0,
            messagesSent: 0,
            reconnects: 0,
            connectionTime: null
        };
    }
    
    async initialize(userId) {
        console.log('🔌 SocketManager initializing...');
        
        if (typeof io === 'undefined') {
            throw new Error('Socket.IO not available');
        }
        
        this.socket = io({
            // Optimized transport configuration
            transports: ['websocket', 'polling'],
            timeout: 20000,
            forceNew: true,
            autoConnect: true,
            // Performance optimizations
            pingTimeout: 60000,
            pingInterval: 25000
        });
        
        this.setupEventHandlers();
        this.startConnectionMonitoring();
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Socket connection timeout'));
            }, 10000);
            
            this.socket.on('connect', () => {
                clearTimeout(timeout);
                this.handleConnection();
                resolve();
            });
            
            this.socket.on('connect_error', (error) => {
                clearTimeout(timeout);
                reject(error);
            });
        });
    }
    
    setupEventHandlers() {
        // Connection events
        this.socket.on('connect', () => this.handleConnection());
        this.socket.on('disconnect', (reason) => this.handleDisconnection(reason));
        this.socket.on('connect_error', (error) => this.handleConnectionError(error));
        this.socket.on('reconnect', (attemptNumber) => this.handleReconnection(attemptNumber));
        
        // App-specific events
        this.socket.on('online-count', (data) => this.handleOnlineCount(data));
        this.socket.on('match-found', (data) => this.handleMatchFound(data));
        this.socket.on('user-state-changed', (data) => this.handleUserStateChanged(data));
        this.socket.on('partner-disconnected', () => this.handlePartnerDisconnected());
        this.socket.on('call-ended', () => this.handleCallEnded());
        this.socket.on('return-to-queue', () => this.handleReturnToQueue());
        
        // WebRTC signaling events
        this.socket.on('offer', (data) => this.handleOffer(data));
        this.socket.on('answer', (data) => this.handleAnswer(data));
        this.socket.on('ice-candidate', (data) => this.handleIceCandidate(data));
        
        console.log('🎯 Socket event handlers registered');
    }
    
    handleConnection() {
        console.log('🔌 Socket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.stats.connectionTime = Date.now();
        
        this.emit('connected');
    }
    
    handleDisconnection(reason) {
        console.log(`🔌 Socket disconnected: ${reason}`);
        this.isConnected = false;
        
        this.emit('disconnected', { reason });
        
        // Handle different disconnect reasons
        if (reason === 'io server disconnect') {
            // Server initiated disconnect - reconnect manually
            this.attemptReconnection();
        }
    }
    
    handleConnectionError(error) {
        console.error('❌ Socket connection error:', error);
        this.emit('connectionError', { error });
    }
    
    handleReconnection(attemptNumber) {
        console.log(`🔄 Socket reconnected after ${attemptNumber} attempts`);
        this.stats.reconnects++;
        this.emit('reconnected', { attemptNumber });
    }
    
    handleOnlineCount(data) {
        console.log(`👥 Online users: ${data.count}`);
        this.stats.messagesReceived++;
        this.emit('onlineCount', data);
    }
    
    handleMatchFound(data) {
        console.log('🎉 Match found:', data);
        this.stats.messagesReceived++;
        this.emit('match-found', data);
    }
    
    handleUserStateChanged(data) {
        console.log('👤 User state changed:', data);
        this.stats.messagesReceived++;
        this.emit('userStateChanged', data);
    }
    
    handlePartnerDisconnected() {
        console.log('👋 Partner disconnected');
        this.stats.messagesReceived++;
        this.emit('partnerDisconnected');
    }
    
    handleCallEnded() {
        console.log('📞 Call ended by partner');
        this.stats.messagesReceived++;
        this.emit('callEnded');
    }
    
    handleReturnToQueue() {
        console.log('🔄 Returning to queue');
        this.stats.messagesReceived++;
        this.emit('returnToQueue');
    }
    
    handleOffer(data) {
        console.log('📥 Received WebRTC offer');
        this.stats.messagesReceived++;
        this.emit('offer', data);
    }
    
    handleAnswer(data) {
        console.log('📥 Received WebRTC answer');
        this.stats.messagesReceived++;
        this.emit('answer', data);
    }
    
    handleIceCandidate(data) {
        console.log('🧊 Received ICE candidate');
        this.stats.messagesReceived++;
        this.emit('iceCandidate', data);
    }
    
    // Queue management methods
    async joinQueue() {
        if (!this.isConnected) {
            throw new Error('Socket not connected');
        }
        
        console.log('🎯 Joining matchmaking queue...');
        this.socket.emit('join-queue');
        this.stats.messagesSent++;
        
        this.emit('queueJoined');
    }
    
    async leaveQueue() {
        if (!this.isConnected) {
            console.warn('⚠️ Cannot leave queue - socket not connected');
            return;
        }
        
        console.log('🚪 Leaving queue...');
        this.socket.emit('leave-queue');
        this.stats.messagesSent++;
        
        this.emit('queueLeft');
    }
    
    async leaveCall() {
        if (!this.isConnected) {
            console.warn('⚠️ Cannot leave call - socket not connected');
            return;
        }
        
        console.log('📞 Leaving call...');
        this.socket.emit('end-call');
        this.stats.messagesSent++;
        
        this.emit('callLeft');
    }
    
    // WebRTC signaling methods
    sendOffer(offer, targetId) {
        if (!this.isConnected) {
            console.error('❌ Cannot send offer - socket not connected');
            return;
        }
        
        console.log('📤 Sending WebRTC offer');
        this.socket.emit('offer', {
            offer: offer,
            target: targetId
        });
        this.stats.messagesSent++;
    }
    
    sendAnswer(answer, targetId) {
        if (!this.isConnected) {
            console.error('❌ Cannot send answer - socket not connected');
            return;
        }
        
        console.log('📤 Sending WebRTC answer');
        this.socket.emit('answer', {
            answer: answer,
            target: targetId
        });
        this.stats.messagesSent++;
    }
    
    sendIceCandidate(candidate, targetId) {
        if (!this.isConnected) {
            console.error('❌ Cannot send ICE candidate - socket not connected');
            return;
        }
        
        this.socket.emit('ice-candidate', {
            candidate: candidate,
            target: targetId
        });
        this.stats.messagesSent++;
    }
    
    // User state management
    updateUserState(state) {
        if (!this.isConnected) {
            console.warn('⚠️ Cannot update user state - socket not connected');
            return;
        }
        
        this.socket.emit('update-user-state', state);
        this.stats.messagesSent++;
    }
    
    saveCallHistory(historyData) {
        if (!this.isConnected) {
            console.warn('⚠️ Cannot save call history - socket not connected');
            return;
        }
        
        this.socket.emit('save-call-history', historyData);
        this.stats.messagesSent++;
    }
    
    // Connection monitoring
    startConnectionMonitoring() {
        this.connectionMonitor = setInterval(() => {
            this.checkConnectionHealth();
        }, 30000); // Check every 30 seconds
        
        // Heartbeat to keep connection alive
        this.heartbeatInterval = setInterval(() => {
            if (this.isConnected) {
                this.socket.emit('ping');
            }
        }, 25000); // Ping every 25 seconds
    }
    
    checkConnectionHealth() {
        if (!this.socket.connected && this.socket.disconnected) {
            console.warn('⚠️ Socket connection appears unhealthy');
            this.attemptReconnection();
        }
    }
    
    attemptReconnection() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('💥 Max reconnection attempts reached');
            this.emit('reconnectionFailed');
            return;
        }
        
        this.reconnectAttempts++;
        console.log(`🔄 Attempting reconnection (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        
        setTimeout(() => {
            if (!this.isConnected) {
                this.socket.connect();
            }
        }, Math.pow(2, this.reconnectAttempts) * 1000); // Exponential backoff
    }
    
    // Event system
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }
    
    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }
    
    emit(event, data = {}) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in socket ${event} handler:`, error);
                }
            });
        }
    }
    
    // Utility methods
    isSocketConnected() {
        return this.socket && this.socket.connected;
    }
    
    getConnectionStats() {
        return {
            ...this.stats,
            isConnected: this.isConnected,
            reconnectAttempts: this.reconnectAttempts,
            connectionUptime: this.stats.connectionTime 
                ? Date.now() - this.stats.connectionTime 
                : 0
        };
    }
    
    // Cleanup
    cleanup() {
        console.log('🧹 SocketManager cleanup...');
        
        // Clear monitoring intervals
        if (this.connectionMonitor) {
            clearInterval(this.connectionMonitor);
            this.connectionMonitor = null;
        }
        
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        
        // Disconnect socket
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        
        // Clear listeners
        this.listeners.clear();
        
        // Reset state
        this.isConnected = false;
        this.reconnectAttempts = 0;
        
        const finalStats = this.getConnectionStats();
        console.log('📊 Final socket stats:', finalStats);
        console.log('✅ SocketManager cleanup completed');
    }
} 