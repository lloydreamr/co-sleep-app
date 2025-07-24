/**
 * WebRTC Manager - Main coordinator for WebRTC functionality
 * Refactored to use focused modules for better separation of concerns
 */
import { WebRTCConnection } from './WebRTCConnection.js';
import { WebRTCSignaling } from './WebRTCSignaling.js';
import { WebRTCAudio } from './WebRTCAudio.js';
import { WebRTCMonitor } from './WebRTCMonitor.js';

export class WebRTCManager {
    constructor() {
        // Optimized ICE configuration
        this.iceConfig = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:stun4.l.google.com:19302' }
            ],
            iceCandidatePoolSize: 10,
            iceTransportPolicy: 'all',
            bundlePolicy: 'max-bundle',
            rtcpMuxPolicy: 'require'
        };

        // Initialize modules
        this.connection = new WebRTCConnection(this.iceConfig);
        this.signaling = new WebRTCSignaling(this.connection);
        this.audio = new WebRTCAudio(this.connection);
        this.monitor = new WebRTCMonitor(this.connection);

        // Event listeners for coordination
        this.listeners = new Map();

        this.setupModuleEventHandlers();
    }

    async initialize() {
        console.log('🔗 WebRTCManager initializing...');
        
        try {
            await this.connection.initialize();
            this.audio.initialize();
            
            console.log('✅ WebRTCManager initialized successfully');
            
        } catch (error) {
            console.error('❌ WebRTCManager initialization failed:', error);
            throw error;
        }
    }

    setupModuleEventHandlers() {
        // Connection events
        this.connection.on('remoteStream', (remoteStream) => {
            this.audio.playRemoteAudio(remoteStream);
            this.emit('remoteStreamReady', remoteStream);
        });

        this.connection.on('connectionStateChange', (state) => {
            switch (state) {
                case 'connected':
                    this.monitor.handleConnectionEstablished();
                    break;
                case 'failed':
                    this.monitor.handleConnectionFailure();
                    break;
                case 'disconnected':
                    this.monitor.handleConnectionDisruption();
                    break;
            }
            this.emit('connectionStateChange', state);
        });

        this.connection.on('iceConnectionStateChange', (state) => {
            this.monitor.updateConnectionQuality(state);
            this.emit('iceConnectionStateChange', state);
        });

        this.connection.on('iceCandidate', (data) => {
            this.emit('iceCandidate', data);
        });

        // Signaling events
        this.signaling.on('offer', (data) => {
            this.emit('offer', data);
        });

        this.signaling.on('answer', (data) => {
            this.emit('answer', data);
        });

        this.signaling.on('signalingError', (error) => {
            this.monitor.handleConnectionFailure();
            this.emit('signalingError', error);
        });

        // Monitor events
        this.monitor.on('connectionEstablished', () => {
            this.emit('connectionEstablished');
        });

        this.monitor.on('connectionFailed', (data) => {
            this.emit('connectionFailed', data);
        });

        this.monitor.on('retrySignaling', async (data) => {
            if (data.type === 'offer') {
                await this.signaling.createOffer();
            }
        });

        // Audio events
        this.audio.on('muteToggled', (data) => {
            this.emit('muteToggled', data);
        });
    }

    async requestPermissions() {
        return await this.connection.requestPermissions();
    }

    async initiateConnection(matchData) {
        await this.connection.initiateConnection(matchData);
        
        if (this.connection.isInitiator) {
            await this.signaling.createOffer();
        }
        
        this.monitor.startConnectionMonitoring();
        this.monitor.setConnectionTimeout();
    }

    async handleOffer(offer, fromId) {
        await this.signaling.handleOffer(offer, fromId);
    }

    async handleAnswer(answer) {
        await this.signaling.handleAnswer(answer);
    }

    async handleIceCandidate(candidate) {
        await this.signaling.handleIceCandidate(candidate);
    }

    toggleMute() {
        return this.audio.toggleMute();
    }

    endCall() {
        console.log('📞 Ending WebRTC call...');
        
        this.monitor.endConnection();
        this.cleanup();
        
        this.emit('callEnded');
    }

    cleanup() {
        console.log('🧹 Cleaning up WebRTCManager...');
        
        this.monitor.cleanup();
        this.audio.cleanup();
        this.connection.cleanup();
        
        console.log('✅ WebRTCManager cleanup completed');
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
                    console.error(`Error in WebRTCManager ${event} handler:`, error);
                }
            });
        }
    }

    // Getters
    isConnected() {
        return this.connection.isConnected();
    }

    getConnectionStats() {
        return this.monitor.getConnectionStats();
    }

    getConnectionQuality() {
        return this.monitor.getConnectionQuality();
    }

    getMuteStatus() {
        return this.audio.getMuteStatus();
    }
} 