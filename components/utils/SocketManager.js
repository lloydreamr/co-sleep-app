/**
 * Socket Manager - Main coordinator for Socket.IO functionality
 * Refactored to use focused modules for better separation of concerns
 */
import { SocketConnection } from './SocketConnection.js';
import { SocketEventHandler } from './SocketEventHandler.js';
import { SocketSignaling } from './SocketSignaling.js';

export class SocketManager {
    constructor() {
        // Initialize modules
        this.connection = new SocketConnection();
        this.eventHandler = new SocketEventHandler(this.connection);
        this.signaling = new SocketSignaling(this.connection);

        // Event listeners for coordination
        this.listeners = new Map();

        this.setupModuleEventHandlers();
    }

    async initialize(userId) {
        console.log('🔌 SocketManager initializing...');
        
        try {
            await this.connection.initialize(userId);
            this.eventHandler.initialize();
            this.signaling.initialize();
            
            console.log('✅ SocketManager initialized successfully');
            
        } catch (error) {
            console.error('❌ SocketManager initialization failed:', error);
            throw error;
        }
    }

    setupModuleEventHandlers() {
        // Connection events
        this.connection.on('connected', () => {
            this.emit('connected');
        });

        this.connection.on('disconnected', (data) => {
            this.emit('disconnected', data);
        });

        this.connection.on('connectionError', (data) => {
            this.emit('connectionError', data);
        });

        this.connection.on('reconnected', (data) => {
            this.emit('reconnected', data);
        });

        // Event handler events
        this.eventHandler.on('onlineCount', (data) => {
            this.emit('onlineCount', data);
        });

        this.eventHandler.on('match-found', (data) => {
            this.emit('match-found', data);
        });

        this.eventHandler.on('userStateChanged', (data) => {
            this.emit('userStateChanged', data);
        });

        this.eventHandler.on('partnerDisconnected', () => {
            this.emit('partnerDisconnected');
        });

        this.eventHandler.on('callEnded', () => {
            this.emit('callEnded');
        });

        this.eventHandler.on('returnToQueue', () => {
            this.emit('returnToQueue');
        });

        // Signaling events
        this.signaling.on('offer', (data) => {
            this.emit('offer', data);
        });

        this.signaling.on('answer', (data) => {
            this.emit('answer', data);
        });

        this.signaling.on('iceCandidate', (data) => {
            this.emit('iceCandidate', data);
        });
    }

    // Queue operations
    async joinQueue() {
        return await this.eventHandler.joinQueue();
    }

    async leaveQueue() {
        return await this.eventHandler.leaveQueue();
    }

    async leaveCall() {
        return await this.eventHandler.leaveCall();
    }

    // WebRTC signaling methods
    sendOffer(offer, targetId) {
        return this.signaling.sendOffer(offer, targetId);
    }

    sendAnswer(answer, targetId) {
        return this.signaling.sendAnswer(answer, targetId);
    }

    sendIceCandidate(candidate, targetId) {
        return this.signaling.sendIceCandidate(candidate, targetId);
    }

    // User state management
    updateUserState(state) {
        this.eventHandler.updateUserState(state);
    }

    saveCallHistory(historyData) {
        this.eventHandler.saveCallHistory(historyData);
    }

    cleanup() {
        console.log('🧹 Cleaning up SocketManager...');
        
        this.connection.cleanup();
        
        console.log('✅ SocketManager cleanup completed');
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
                    console.error(`Error in SocketManager ${event} handler:`, error);
                }
            });
        }
    }

    // Getters
    isSocketConnected() {
        return this.connection.isSocketConnected();
    }

    getConnectionStats() {
        return this.connection.getConnectionStats();
    }
} 