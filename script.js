class CoSleepApp {
    constructor() {
        this.isInQueue = false;
        this.isInCall = false;
        this.isMuted = false;
        this.localStream = null;
        this.peerConnection = null;
        this.remoteStream = null;
        this.socket = null;
        this.partnerId = null;
        this.muteSyncInterval = null;
        
        this.initializeElements();
        this.bindEvents();
        this.initializeWebRTC();
        this.initializeSocket();
        
        // Start periodic mute state sync
        this.startMuteSync();
    }

    initializeElements() {
        this.mainInterface = document.getElementById('main-interface');
        this.waitingInterface = document.getElementById('waiting-interface');
        this.callInterface = document.getElementById('call-interface');
        
        this.connectBtn = document.getElementById('connect-btn');
        this.cancelBtn = document.getElementById('cancel-btn');
        this.muteBtn = document.getElementById('mute-btn');
        this.endCallBtn = document.getElementById('end-call-btn');
        
        this.statusText = document.querySelector('.status-indicator span');
        this.onlineCount = document.getElementById('online-count');
    }

    bindEvents() {
        this.connectBtn.addEventListener('click', () => this.joinQueue());
        this.cancelBtn.addEventListener('click', () => this.leaveQueue());
        this.muteBtn.addEventListener('click', () => this.toggleMute());
        this.endCallBtn.addEventListener('click', () => this.endCall());
        
        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isInCall) {
                this.endCall();
            }
        });
    }

    initializeSocket() {
        // Connect to the server
        this.socket = io();
        
        // Handle match found
        this.socket.on('match-found', (data) => {
            console.log('Match found with:', data.partnerId, 'Initiator:', data.isInitiator);
            this.partnerId = data.partnerId;
            this.isInitiator = data.isInitiator;
            this.connectToPeer();
            
            // Set a timeout for connection establishment
            this.connectionTimeout = setTimeout(() => {
                if (this.isInCall && this.peerConnection?.connectionState !== 'connected') {
                    console.log('Connection timeout, retrying...');
                    this.handleConnectionFailure();
                }
            }, 15000); // 15 second timeout
        });
        
        // Handle WebRTC signaling
        this.socket.on('offer', async (data) => {
            console.log('Received offer from:', data.from);
            await this.handleOffer(data.offer, data.from);
        });
        
        this.socket.on('answer', async (data) => {
            console.log('Received answer from:', data.from);
            await this.handleAnswer(data.answer);
        });
        
        this.socket.on('ice-candidate', async (data) => {
            console.log('Received ICE candidate from:', data.from);
            await this.handleIceCandidate(data.candidate);
        });
        
        // Handle partner disconnection
        this.socket.on('partner-disconnected', () => {
            console.log('Partner disconnected');
            this.handlePartnerDisconnection();
        });
        
        this.socket.on('call-ended', () => {
            console.log('Call ended by partner');
            this.handlePartnerDisconnection();
        });
        
        this.socket.on('online-count', (data) => {
            console.log(`Online users: ${data.count}`);
            if (this.onlineCount) {
                this.onlineCount.textContent = data.count;
            }
        });
        
        this.socket.on('return-to-queue', () => {
            console.log('Returning to queue');
            this.isInCall = false;
            this.showInterface('main');
            this.partnerId = null;
        });
    }

    async initializeWebRTC() {
        try {
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
            
            // Apply current mute state to new stream
            if (this.isMuted) {
                this.localStream.getAudioTracks().forEach(track => {
                    track.enabled = false;
                });
            }
            
            // Sync UI with actual state
            this.syncMuteState();
            
        } catch (error) {
            console.error('Error accessing microphone:', error);
            this.showError('Please allow microphone access to use Co-Sleep.');
        }
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #fed7d7;
            color: #e53e3e;
            padding: 1rem 2rem;
            border-radius: 8px;
            font-size: 0.9rem;
            z-index: 1000;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        `;
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }

    showInterface(interfaceName) {
        this.mainInterface.classList.add('hidden');
        this.waitingInterface.classList.add('hidden');
        this.callInterface.classList.add('hidden');
        
        switch (interfaceName) {
            case 'main':
                this.mainInterface.classList.remove('hidden');
                break;
            case 'waiting':
                this.waitingInterface.classList.remove('hidden');
                break;
            case 'call':
                this.callInterface.classList.remove('hidden');
                break;
        }
    }

    async joinQueue() {
        if (!this.localStream) {
            this.showError('Microphone access required. Please refresh and allow access.');
            return;
        }

        this.isInQueue = true;
        this.userInitiatedConnection = true; // Set flag for user-initiated connection
        this.showInterface('waiting');
        
        // Join the real queue
        this.socket.emit('join-queue');
    }

    leaveQueue() {
        this.isInQueue = false;
        this.userInitiatedConnection = false; // Reset flag
        this.socket.emit('leave-queue');
        this.showInterface('main');
    }

    async connectToPeer() {
        this.isInQueue = false;
        this.isInCall = true;
        this.showInterface('call');
        
        // Sync mute state when entering call interface
        this.syncMuteState();
        
        // Update status to show connecting
        this.statusText.textContent = 'Connecting...';
        
        try {
            if (this.isInitiator) {
                console.log('🎯 Creating offer as initiator...');
                this.statusText.textContent = 'Creating connection...';
                await this.setupPeerConnection();
            } else {
                console.log('⏳ Waiting for offer as responder...');
                this.statusText.textContent = 'Waiting...';
            }
        } catch (error) {
            console.error('❌ Error setting up connection:', error);
            this.handleConnectionFailure();
        }
    }

    async setupPeerConnection() {
        this.peerConnection = new RTCPeerConnection({
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
            rtcpMuxPolicy: 'require',
            iceConnectionState: 'checking'
        });

        // Add local stream
        this.localStream.getTracks().forEach(track => {
            this.peerConnection.addTrack(track, this.localStream);
        });

        // Handle incoming streams
        this.peerConnection.ontrack = (event) => {
            console.log('Received remote stream');
            this.remoteStream = event.streams[0];
            this.playRemoteAudio();
        };

        // Handle ICE candidates
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate && this.partnerId) {
                this.socket.emit('ice-candidate', {
                    candidate: event.candidate,
                    target: this.partnerId
                });
            }
        };

        // Handle connection state changes
        this.peerConnection.onconnectionstatechange = () => {
            console.log('Connection state:', this.peerConnection.connectionState);
            if (this.peerConnection.connectionState === 'connected') {
                this.statusText.textContent = 'Connected';
                this.playConnectionSound();
                console.log('✅ WebRTC connection established successfully!');
                
                // Clear connection timeout
                if (this.connectionTimeout) {
                    clearTimeout(this.connectionTimeout);
                    this.connectionTimeout = null;
                }
            } else if (this.peerConnection.connectionState === 'failed') {
                console.log('❌ Connection failed, trying to reconnect...');
                this.handleConnectionFailure();
            } else if (this.peerConnection.connectionState === 'connecting') {
                this.statusText.textContent = 'Connecting...';
            }
        };

        // Handle ICE connection state changes
        this.peerConnection.oniceconnectionstatechange = () => {
            console.log('ICE connection state:', this.peerConnection.iceConnectionState);
        };

        // Create and send offer
        try {
            const offer = await this.peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: false
            });
            await this.peerConnection.setLocalDescription(offer);
            
            this.socket.emit('offer', {
                offer: offer,
                target: this.partnerId
            });
        } catch (error) {
            console.error('Error creating offer:', error);
            this.handleConnectionFailure();
        }
    }

    async handleOffer(offer, from) {
        this.peerConnection = new RTCPeerConnection({
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
            rtcpMuxPolicy: 'require',
            iceConnectionState: 'checking'
        });

        // Add local stream
        this.localStream.getTracks().forEach(track => {
            this.peerConnection.addTrack(track, this.localStream);
        });

        // Handle incoming streams
        this.peerConnection.ontrack = (event) => {
            console.log('Received remote stream');
            this.remoteStream = event.streams[0];
            this.playRemoteAudio();
        };

        // Handle ICE candidates
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.socket.emit('ice-candidate', {
                    candidate: event.candidate,
                    target: from
                });
            }
        };

        // Handle connection state changes
        this.peerConnection.onconnectionstatechange = () => {
            console.log('Connection state:', this.peerConnection.connectionState);
            if (this.peerConnection.connectionState === 'connected') {
                this.statusText.textContent = 'Connected';
                this.playConnectionSound();
                console.log('✅ WebRTC connection established successfully!');
                
                // Clear connection timeout
                if (this.connectionTimeout) {
                    clearTimeout(this.connectionTimeout);
                    this.connectionTimeout = null;
                }
            } else if (this.peerConnection.connectionState === 'failed') {
                console.log('❌ Connection failed, trying to reconnect...');
                this.handleConnectionFailure();
            } else if (this.peerConnection.connectionState === 'connecting') {
                this.statusText.textContent = 'Connecting...';
            }
        };

        // Handle ICE connection state changes
        this.peerConnection.oniceconnectionstatechange = () => {
            console.log('ICE connection state:', this.peerConnection.iceConnectionState);
        };

        // Set remote description and create answer
        try {
            await this.peerConnection.setRemoteDescription(offer);
            const answer = await this.peerConnection.createAnswer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: false
            });
            await this.peerConnection.setLocalDescription(answer);
            
            this.socket.emit('answer', {
                answer: answer,
                target: from
            });
        } catch (error) {
            console.error('Error handling offer:', error);
            this.handleConnectionFailure();
        }
    }

    async handleAnswer(answer) {
        await this.peerConnection.setRemoteDescription(answer);
    }

    async handleIceCandidate(candidate) {
        if (this.peerConnection) {
            try {
                await this.peerConnection.addIceCandidate(candidate);
            } catch (error) {
                console.error('Error adding ICE candidate:', error);
            }
        }
    }

    handleConnectionFailure() {
        console.log('Handling connection failure...');
        this.statusText.textContent = 'Connection failed';
        
        // Clear connection timeout
        if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
        }
        
        // Clean up the failed connection
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        
        // Remove any audio elements
        const audioElements = document.querySelectorAll('audio[data-remote="true"]');
        audioElements.forEach(audio => audio.remove());
        
        // Return to main interface after a short delay
        setTimeout(() => {
            this.isInCall = false;
            this.partnerId = null;
            this.isInitiator = null;
            this.userInitiatedConnection = false; // Reset flag
            this.retryCount = 0; // Reset retry count
            this.showInterface('main');
            this.initializeWebRTC();
        }, 2000);
    }

    handlePartnerDisconnection() {
        this.isInCall = false;
        this.partnerId = null;
        this.isInitiator = null;
        
        // Clear connection timeout
        if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
        }
        
        // Stop all tracks
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
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
        
        // Remove audio elements
        const audioElements = document.querySelectorAll('audio');
        audioElements.forEach(audio => audio.remove());
        
        // Return to main interface
        this.showInterface('main');
        
        // Reset user connection flag
        this.userInitiatedConnection = false;
        
        // Reset mute state and sync UI
        this.isMuted = false;
        this.updateMuteUI();
        
        // Reinitialize microphone access
        this.initializeWebRTC();
    }

    playRemoteAudio() {
        // Create audio element for remote stream
        const audio = document.createElement('audio');
        audio.srcObject = this.remoteStream;
        audio.autoplay = true;
        audio.style.display = 'none';
        
        // Optimize audio settings for sleep presence
        audio.volume = 0.8; // Slightly lower volume for comfort
        audio.preload = 'auto';
        
        // Add audio processing for better quality
        if (window.AudioContext || window.webkitAudioContext) {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContext.createMediaStreamSource(this.remoteStream);
            const gainNode = audioContext.createGain();
            const lowpassFilter = audioContext.createBiquadFilter();
            
            // Gentle low-pass filter for softer sound
            lowpassFilter.type = 'lowpass';
            lowpassFilter.frequency.setValueAtTime(8000, audioContext.currentTime);
            lowpassFilter.Q.setValueAtTime(0.5, audioContext.currentTime);
            
            // Connect the audio processing chain
            source.connect(lowpassFilter);
            lowpassFilter.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Store for cleanup
            this.audioContext = audioContext;
            this.audioNodes = { source, gainNode, lowpassFilter };
        }
        
        // Remove any existing audio elements
        const existingAudio = document.querySelector('audio[data-remote="true"]');
        if (existingAudio) {
            existingAudio.remove();
        }
        
        audio.setAttribute('data-remote', 'true');
        document.body.appendChild(audio);
    }

    playConnectionSound() {
        // Play a gentle connection sound
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.5);
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    }

    toggleMute() {
        if (!this.localStream) return;
        
        this.isMuted = !this.isMuted;
        
        // Apply mute state to all audio tracks
        this.localStream.getAudioTracks().forEach(track => {
            track.enabled = !this.isMuted;
        });
        
        // Update UI to reflect current state
        this.updateMuteUI();
        
        // Log for debugging
        console.log(`🎤 Mute ${this.isMuted ? 'enabled' : 'disabled'}`);
    }
    
    updateMuteUI() {
        if (!this.muteBtn) return;
        
        // Update button class
        this.muteBtn.classList.toggle('muted', this.isMuted);
        
        // Update button icon
        const controlText = this.muteBtn.querySelector('.control-text');
        if (!controlText) return;
        
        if (this.isMuted) {
            micIcon.innerHTML = `
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
            `;
        } else {
            micIcon.innerHTML = `
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            `;
        }
    }
    
    syncMuteState() {
        if (!this.localStream) return;
        
        // Check if UI state matches actual track state
        const audioTracks = this.localStream.getAudioTracks();
        if (audioTracks.length === 0) return;
        
        const actualMuted = !audioTracks[0].enabled;
        
        // If there's a mismatch, fix it
        if (actualMuted !== this.isMuted) {
            console.log(`🔄 Syncing mute state: UI=${this.isMuted}, Actual=${actualMuted}`);
            this.isMuted = actualMuted;
            this.updateMuteUI();
        }
    }
    
    startMuteSync() {
        // Clear any existing interval
        this.stopMuteSync();
        
        // Start periodic sync every 2 seconds
        this.muteSyncInterval = setInterval(() => {
            if (this.isInCall) {
                this.syncMuteState();
            }
        }, 2000);
    }
    
    stopMuteSync() {
        if (this.muteSyncInterval) {
            clearInterval(this.muteSyncInterval);
            this.muteSyncInterval = null;
        }
    }

    endCall() {
        this.isInCall = false;
        
        // Notify server about call end
        if (this.socket) {
            this.socket.emit('end-call');
        }
        
        // Stop all tracks
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
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
        
        // Remove audio elements
        const audioElements = document.querySelectorAll('audio');
        audioElements.forEach(audio => audio.remove());
        
        // Return to main interface
        this.showInterface('main');
        
        // Reset user connection flag
        this.userInitiatedConnection = false;
        
        // Reset mute state and sync UI
        this.isMuted = false;
        this.updateMuteUI();
        
        // Reinitialize microphone access
        this.initializeWebRTC();
    }

    // Handle page unload
    handlePageUnload() {
        // Stop mute sync
        this.stopMuteSync();
        
        if (this.isInCall) {
            this.endCall();
        }
        if (this.isInQueue) {
            this.leaveQueue();
        }
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const app = new CoSleepApp();
    
    // Handle page unload
    window.addEventListener('beforeunload', () => {
        app.handlePageUnload();
    });
});

// Handle connection state changes
window.addEventListener('online', () => {
    console.log('Connection restored');
});

window.addEventListener('offline', () => {
    console.log('Connection lost');
}); 