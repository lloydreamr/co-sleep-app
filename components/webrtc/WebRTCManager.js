/**
 * WebRTC Manager - Handles all WebRTC peer connection functionality
 * Optimized with memory management and connection monitoring
 */
export class WebRTCManager {
    constructor() {
        this.localStream = null;
        this.remoteStream = null;
        this.peerConnection = null;
        this.partnerId = null;
        this.isInitiator = false;
        this.isMuted = false;
        this.connectionTimeout = null;
        this.retryCount = 0;
        this.maxRetries = 3;
        
        // Audio optimization
        this.audioContext = null;
        this.audioNodes = null;
        
        // Connection monitoring
        this.connectionMonitor = null;
        this.connectionStats = {
            startTime: null,
            endTime: null,
            quality: 'unknown'
        };
        
        // Event listeners
        this.listeners = new Map();
        
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
    }
    
    async initialize() {
        console.log('🔗 WebRTCManager initializing...');
        
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
    
    async initiateConnection(matchData) {
        const { partnerId, isInitiator } = matchData;
        this.partnerId = partnerId;
        this.isInitiator = isInitiator;
        
        console.log(`🤝 Initiating connection with ${partnerId} (initiator: ${isInitiator})`);
        
        try {
            await this.createPeerConnection();
            
            if (this.isInitiator) {
                await this.createOffer();
            }
            
            this.startConnectionMonitoring();
            this.connectionStats.startTime = Date.now();
            
        } catch (error) {
            console.error('❌ Connection initiation failed:', error);
            this.handleConnectionFailure();
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
            this.playRemoteAudio();
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
            
            switch (state) {
                case 'connected':
                    this.handleConnectionEstablished();
                    break;
                case 'failed':
                    this.handleConnectionFailure();
                    break;
                case 'disconnected':
                    this.handleConnectionDisruption();
                    break;
            }
            
            this.emit('connectionStateChange', state);
        };
        
        // Handle ICE connection state changes
        this.peerConnection.oniceconnectionstatechange = () => {
            const state = this.peerConnection.iceConnectionState;
            console.log(`❄️ ICE connection state: ${state}`);
            this.updateConnectionQuality(state);
        };
    }
    
    async createOffer() {
        try {
            const offer = await this.peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: false
            });
            
            await this.peerConnection.setLocalDescription(offer);
            
            this.emit('offer', {
                offer: offer,
                target: this.partnerId
            });
            
            console.log('📤 Offer created and sent');
            
        } catch (error) {
            console.error('❌ Failed to create offer:', error);
            throw error;
        }
    }
    
    async handleOffer(offer, fromId) {
        try {
            if (!this.peerConnection) {
                await this.createPeerConnection();
            }
            
            await this.peerConnection.setRemoteDescription(offer);
            
            const answer = await this.peerConnection.createAnswer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: false
            });
            
            await this.peerConnection.setLocalDescription(answer);
            
            this.emit('answer', {
                answer: answer,
                target: fromId
            });
            
            console.log('📥 Offer handled, answer sent');
            
        } catch (error) {
            console.error('❌ Failed to handle offer:', error);
            this.handleConnectionFailure();
        }
    }
    
    async handleAnswer(answer) {
        try {
            await this.peerConnection.setRemoteDescription(answer);
            console.log('✅ Answer processed successfully');
            
        } catch (error) {
            console.error('❌ Failed to handle answer:', error);
            this.handleConnectionFailure();
        }
    }
    
    async handleIceCandidate(candidate) {
        try {
            await this.peerConnection.addIceCandidate(candidate);
            
        } catch (error) {
            console.error('❌ Failed to add ICE candidate:', error);
        }
    }
    
    playRemoteAudio() {
        // Create audio element for remote stream
        const audio = document.createElement('audio');
        audio.srcObject = this.remoteStream;
        audio.autoplay = true;
        audio.style.display = 'none';
        audio.volume = 0.8; // Slightly lower volume for comfort
        audio.preload = 'auto';
        
        // Add audio processing for better quality
        this.setupAudioProcessing(audio);
        
        // Remove any existing remote audio
        const existingAudio = document.querySelector('audio[data-remote="true"]');
        if (existingAudio) {
            existingAudio.remove();
        }
        
        audio.setAttribute('data-remote', 'true');
        document.body.appendChild(audio);
        
        console.log('🔊 Remote audio playback started');
    }
    
    setupAudioProcessing(audioElement) {
        if (!this.remoteStream || !window.AudioContext) return;
        
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = this.audioContext.createMediaStreamSource(this.remoteStream);
            const gainNode = this.audioContext.createGain();
            const lowpassFilter = this.audioContext.createBiquadFilter();
            
            // Gentle low-pass filter for softer sound
            lowpassFilter.type = 'lowpass';
            lowpassFilter.frequency.setValueAtTime(8000, this.audioContext.currentTime);
            lowpassFilter.Q.setValueAtTime(0.5, this.audioContext.currentTime);
            
            // Connect the audio processing chain
            source.connect(lowpassFilter);
            lowpassFilter.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // Store for cleanup
            this.audioNodes = { source, gainNode, lowpassFilter };
            
            console.log('🎛️ Audio processing setup complete');
            
        } catch (error) {
            console.error('❌ Audio processing setup failed:', error);
        }
    }
    
    toggleMute() {
        this.isMuted = !this.isMuted;
        
        if (this.localStream) {
            this.localStream.getAudioTracks().forEach(track => {
                track.enabled = !this.isMuted;
            });
        }
        
        console.log(`🎤 Mute ${this.isMuted ? 'enabled' : 'disabled'}`);
        this.emit('muteToggled', this.isMuted);
        
        return this.isMuted;
    }
    
    handleConnectionEstablished() {
        console.log('✅ WebRTC connection established');
        
        if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
        }
        
        this.connectionStats.quality = 'excellent';
        this.retryCount = 0;
        
        this.emit('connectionEstablished');
    }
    
    handleConnectionFailure() {
        console.log('❌ Connection failed');
        
        if (this.retryCount < this.maxRetries) {
            this.retryCount++;
            console.log(`🔄 Retrying connection (${this.retryCount}/${this.maxRetries})`);
            
            setTimeout(() => {
                this.retryConnection();
            }, 3000);
        } else {
            console.log('💥 Max retries exceeded');
            this.emit('connectionFailed');
        }
    }
    
    async retryConnection() {
        try {
            this.cleanup(false); // Cleanup without emitting events
            await this.createPeerConnection();
            
            if (this.isInitiator) {
                await this.createOffer();
            }
        } catch (error) {
            console.error('❌ Retry failed:', error);
            this.handleConnectionFailure();
        }
    }
    
    handleConnectionDisruption() {
        console.log('⚠️ Connection disrupted');
        this.emit('connectionDisrupted');
    }
    
    startConnectionMonitoring() {
        this.connectionMonitor = setInterval(() => {
            if (this.peerConnection) {
                const state = this.peerConnection.connectionState;
                const iceState = this.peerConnection.iceConnectionState;
                
                this.updateConnectionQuality(iceState);
                
                if (state === 'failed' || iceState === 'failed') {
                    this.handleConnectionFailure();
                }
            }
        }, 5000);
    }
    
    updateConnectionQuality(iceState) {
        let quality;
        switch (iceState) {
            case 'connected':
                quality = 'excellent';
                break;
            case 'checking':
                quality = 'good';
                break;
            case 'disconnected':
                quality = 'poor';
                break;
            default:
                quality = 'unknown';
        }
        
        this.connectionStats.quality = quality;
    }
    
    endCall() {
        console.log('📞 Ending call...');
        
        this.connectionStats.endTime = Date.now();
        this.emit('callEnded', this.connectionStats);
        
        this.cleanup();
    }
    
    cleanup(emitEvents = true) {
        console.log('🧹 WebRTC cleanup...');
        
        // Clear monitoring
        if (this.connectionMonitor) {
            clearInterval(this.connectionMonitor);
            this.connectionMonitor = null;
        }
        
        // Clear timeout
        if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
        }
        
        // Stop local stream
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        
        // Close peer connection
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        
        // Clean up audio processing
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
            this.audioNodes = null;
        }
        
        // Remove remote audio elements
        const audioElements = document.querySelectorAll('audio[data-remote="true"]');
        audioElements.forEach(audio => audio.remove());
        
        // Reset state
        this.partnerId = null;
        this.isInitiator = false;
        this.isMuted = false;
        this.retryCount = 0;
        this.remoteStream = null;
        
        if (emitEvents) {
            this.emit('cleanup');
        }
        
        console.log('✅ WebRTC cleanup completed');
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
                    console.error(`Error in WebRTC ${event} handler:`, error);
                }
            });
        }
    }
    
    // Getters
    getConnectionStats() {
        return { ...this.connectionStats };
    }
    
    isConnected() {
        return this.peerConnection && this.peerConnection.connectionState === 'connected';
    }
    
    getConnectionQuality() {
        return this.connectionStats.quality;
    }
} 