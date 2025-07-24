/**
 * WebRTC Connection Manager - Handles peer connection setup and lifecycle
 * Extracted from WebRTCManager.js for better separation of concerns
 */
export class WebRTCConnection {
    constructor(iceConfig) {
        this.peerConnection = null;
        this.localStream = null;
        this.remoteStream = null;
        this.partnerId = null;
        this.isInitiator = false;
        this.iceConfig = iceConfig;
        this.listeners = new Map();
    }

    async initialize() {
        console.log('🔗 WebRTC Connection initializing...');
        
        // Test WebRTC support
        if (!window.RTCPeerConnection) {
            throw new Error('WebRTC not supported in this browser');
        }
        
        console.log('✅ WebRTC support confirmed');
    }

    async requestPermissions() {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('getUserMedia not supported');
            }
            
            this.localStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 48000,
                    channelCount: 1, // Mono for better performance
                    latency: 0.01, // Low latency
                    volume: 1.0
                },
                video: false
            });
            
            console.log('🎤 Microphone access granted');
            return true;
            
        } catch (error) {
            console.error('❌ Failed to get media permissions:', error);
            throw new Error('Microphone access required for voice calls');
        }
    }

    async createPeerConnection() {
        this.peerConnection = new RTCPeerConnection(this.iceConfig);
        
        // Add local stream
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });
        }
        
        // Set up event handlers
        this.setupPeerConnectionHandlers();
        
        console.log('🔗 Peer connection created');
    }

    setupPeerConnectionHandlers() {
        // Handle incoming streams
        this.peerConnection.ontrack = (event) => {
            console.log('📺 Received remote stream');
            this.remoteStream = event.streams[0];
            this.emit('remoteStream', this.remoteStream);
        };
        
        // Handle ICE candidates
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate && this.partnerId) {
                this.emit('iceCandidate', {
                    candidate: event.candidate,
                    target: this.partnerId
                });
            }
        };
        
        // Handle connection state changes
        this.peerConnection.onconnectionstatechange = () => {
            const state = this.peerConnection.connectionState;
            console.log(`🔗 Connection state: ${state}`);
            this.emit('connectionStateChange', state);
        };
        
        // Handle ICE connection state changes
        this.peerConnection.oniceconnectionstatechange = () => {
            const state = this.peerConnection.iceConnectionState;
            console.log(`❄️ ICE connection state: ${state}`);
            this.emit('iceConnectionStateChange', state);
        };
    }

    async initiateConnection(matchData) {
        const { partnerId, isInitiator } = matchData;
        this.partnerId = partnerId;
        this.isInitiator = isInitiator;
        
        console.log(`🤝 Initiating connection with ${partnerId} (initiator: ${isInitiator})`);
        
        try {
            await this.createPeerConnection();
            this.emit('connectionInitiated', { partnerId, isInitiator });
            
        } catch (error) {
            console.error('❌ Connection initiation failed:', error);
            this.emit('connectionFailed', error);
        }
    }

    cleanup() {
        console.log('🧹 Cleaning up WebRTC connection...');
        
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        
        this.remoteStream = null;
        this.partnerId = null;
        this.isInitiator = false;
        
        console.log('✅ WebRTC connection cleanup completed');
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
                    console.error(`Error in WebRTC Connection ${event} handler:`, error);
                }
            });
        }
    }

    // Getters
    isConnected() {
        return this.peerConnection && this.peerConnection.connectionState === 'connected';
    }

    getLocalStream() {
        return this.localStream;
    }

    getRemoteStream() {
        return this.remoteStream;
    }

    getPeerConnection() {
        return this.peerConnection;
    }
} 