/**
 * Socket Event Handler - Handles application-specific socket events
 * Extracted from SocketManager.js for better separation of concerns
 */
export class SocketEventHandler {
    constructor(connection) {
        this.connection = connection;
        this.listeners = new Map();
    }

    initialize() {
        console.log('🎯 SocketEventHandler initializing...');
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        const socket = this.connection.getSocket();
        if (!socket) {
            console.warn('⚠️ No socket available for event handlers');
            return;
        }

        // App-specific events
        socket.on('online-count', (data) => this.handleOnlineCount(data));
        socket.on('match-found', (data) => this.handleMatchFound(data));
        socket.on('user-state-changed', (data) => this.handleUserStateChanged(data));
        socket.on('partner-disconnected', () => this.handlePartnerDisconnected());
        socket.on('call-ended', () => this.handleCallEnded());
        socket.on('return-to-queue', () => this.handleReturnToQueue());
        
        console.log('🎯 App event handlers registered');
    }

    handleOnlineCount(data) {
        console.log(`👥 Online users: ${data.count}`);
        this.incrementMessageCount();
        this.emit('onlineCount', data);
    }

    handleMatchFound(data) {
        console.log('🎉 Match found:', data);
        this.incrementMessageCount();
        this.emit('match-found', data);
    }

    handleUserStateChanged(data) {
        console.log('👤 User state changed:', data);
        this.incrementMessageCount();
        this.emit('userStateChanged', data);
    }

    handlePartnerDisconnected() {
        console.log('👋 Partner disconnected');
        this.incrementMessageCount();
        this.emit('partnerDisconnected');
    }

    handleCallEnded() {
        console.log('📞 Call ended by partner');
        this.incrementMessageCount();
        this.emit('callEnded');
    }

    handleReturnToQueue() {
        console.log('🔄 Returning to queue');
        this.incrementMessageCount();
        this.emit('returnToQueue');
    }

    incrementMessageCount() {
        const stats = this.connection.getConnectionStats();
        stats.messagesReceived++;
    }

    // Queue operations
    async joinQueue() {
        if (!this.connection.isSocketConnected()) {
            throw new Error('Socket not connected');
        }

        console.log('🚶 Joining queue...');
        const socket = this.connection.getSocket();
        socket.emit('join-queue');
        this.emit('queueJoined');
    }

    async leaveQueue() {
        if (!this.connection.isSocketConnected()) {
            console.warn('⚠️ Cannot leave queue: socket not connected');
            return;
        }

        console.log('🚪 Leaving queue...');
        const socket = this.connection.getSocket();
        socket.emit('leave-queue');
        this.emit('queueLeft');
    }

    async leaveCall() {
        if (!this.connection.isSocketConnected()) {
            console.warn('⚠️ Cannot leave call: socket not connected');
            return;
        }

        console.log('📞 Leaving call...');
        const socket = this.connection.getSocket();
        socket.emit('end-call');
        this.emit('callLeft');
    }

    updateUserState(state) {
        if (!this.connection.isSocketConnected()) {
            console.warn('⚠️ Cannot update user state: socket not connected');
            return;
        }

        const socket = this.connection.getSocket();
        socket.emit('user-state-update', state);
    }

    saveCallHistory(historyData) {
        if (!this.connection.isSocketConnected()) {
            console.warn('⚠️ Cannot save call history: socket not connected');
            return;
        }

        const socket = this.connection.getSocket();
        socket.emit('save-call-history', historyData);
        this.emit('callHistorySaved', historyData);
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
                    console.error(`Error in Socket Event Handler ${event} handler:`, error);
                }
            });
        }
    }
} 