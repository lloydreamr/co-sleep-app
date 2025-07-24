/**
 * Socket Connection Manager - Handles socket connection lifecycle, monitoring, and reconnection
 * Extracted from SocketManager.js for better separation of concerns
 */
export class SocketConnection {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.connectionMonitor = null;
        this.heartbeatInterval = null;
        this.listeners = new Map();
        
        // Performance tracking
        this.stats = {
            messagesReceived: 0,
            messagesSent: 0,
            reconnects: 0,
            connectionTime: null
        };
    }

    async initialize(userId) {
        console.log('🔌 SocketConnection initializing...');
        
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
        
        this.setupConnectionHandlers();
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

    setupConnectionHandlers() {
        // Connection lifecycle events
        this.socket.on('connect', () => this.handleConnection());
        this.socket.on('disconnect', (reason) => this.handleDisconnection(reason));
        this.socket.on('connect_error', (error) => this.handleConnectionError(error));
        this.socket.on('reconnect', (attemptNumber) => this.handleReconnection(attemptNumber));
        
        console.log('🔌 Connection event handlers registered');
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

    startConnectionMonitoring() {
        // Health check every 30 seconds
        this.connectionMonitor = setInterval(() => {
            this.checkConnectionHealth();
        }, 30000);
        
        // Heartbeat to keep connection alive
        this.heartbeatInterval = setInterval(() => {
            if (this.isConnected) {
                this.socket.emit('heartbeat', { timestamp: Date.now() });
            }
        }, 25000);
        
        console.log('📊 Connection monitoring started');
    }

    checkConnectionHealth() {
        if (!this.socket.connected && this.socket.disconnected) {
            console.warn('⚠️ Socket connection unhealthy, attempting reconnection');
            this.attemptReconnection();
        }
    }

    attemptReconnection() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('❌ Max reconnection attempts reached');
            this.emit('maxReconnectAttemptsReached');
            return;
        }

        this.reconnectAttempts++;
        console.log(`🔄 Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
        
        if (!this.isConnected) {
            this.socket.connect();
        }
    }

    cleanup() {
        console.log('🧹 Cleaning up socket connection...');
        
        if (this.connectionMonitor) {
            clearInterval(this.connectionMonitor);
            this.connectionMonitor = null;
        }
        
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        
        this.isConnected = false;
        this.reconnectAttempts = 0;
        
        console.log('✅ Socket connection cleanup completed');
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
                    console.error(`Error in Socket Connection ${event} handler:`, error);
                }
            });
        }
    }

    // Getters
    getSocket() {
        return this.socket;
    }

    getConnectionStats() {
        return {
            ...this.stats,
            isConnected: this.isConnected,
            reconnectAttempts: this.reconnectAttempts,
            uptime: this.stats.connectionTime ? Date.now() - this.stats.connectionTime : 0
        };
    }

    isSocketConnected() {
        return this.isConnected && this.socket && this.socket.connected;
    }
} 