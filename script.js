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
        
        // User authentication
        this.currentUser = null;
        this.authToken = null;
        
        // Sound system integration
        this.soundManager = window.soundManager;
        
        // Analytics and preferences integration
        this.analyticsManager = window.analyticsManager;
        this.preferencesManager = window.preferencesManager;
        
        this.initializeElements();
        this.bindEvents();
        this.initializeWebRTC();
        this.initializeSocket();
        this.initializeAuth();
        this.initializeSoundSystem();
        this.initializeAnalytics();
        this.initializePreferences();
        
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
        this.skipBtn = document.getElementById('skip-btn');
        this.endCallBtn = document.getElementById('end-call-btn');
        
        this.statusText = document.querySelector('.status-indicator span');
        this.onlineCount = document.getElementById('online-count');
        
        // Auth elements
        this.userMenu = document.getElementById('user-menu');
        this.userName = document.getElementById('user-name');
        this.userDropdown = document.getElementById('user-dropdown');
        this.loginBtn = document.getElementById('login-btn');
    }

    bindEvents() {
        this.connectBtn.addEventListener('click', () => this.joinQueue());
        this.cancelBtn.addEventListener('click', () => this.leaveQueue());
        this.muteBtn.addEventListener('click', () => this.toggleMute());
        this.skipBtn.addEventListener('click', () => this.skipPartner());
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
        this.socket = io({
            transports: ["websocket", "polling"],
            upgrade: true,
            rememberUpgrade: true
        });
        
        // Handle match found
        this.socket.on('match-found', (data) => {
            console.log('Match found with:', data.partnerId, 'Initiator:', data.isInitiator);
            this.partnerId = data.partnerId;
            this.isInitiator = data.isInitiator;
            this.connectToPeer();
            
            // Set a timeout for connection establishment
            this.connectionTimeout = setTimeout(() => {
                if (this.isInCall && this.peerConnection?.connectionState !== 'connected') {
                    console.log('⏰ Connection timeout triggered');
                    console.log('Current connection state:', this.peerConnection?.connectionState);
                    console.log('Current ICE connection state:', this.peerConnection?.iceConnectionState);
                    console.log('Current signaling state:', this.peerConnection?.signalingState);
                    this.handleConnectionFailure();
                }
            }, 30000); // 30 second timeout (increased from 15)
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
        
        this.socket.on('partner-skipped', () => {
            console.log('Partner skipped');
            this.handlePartnerDisconnection();
        });
        
        this.socket.on('return-to-queue', () => {
            console.log('Returning to queue');
            this.isInCall = false;
            this.showInterface('waiting');
            this.partnerId = null;
        });
        
        this.socket.on('online-count', (data) => {
            console.log(`Online users: ${data.count}`);
            if (this.onlineCount) {
                this.onlineCount.textContent = data.count;
            }
        });
    }

    async initializeWebRTC() {
        try {
            // Test network connectivity first
            await this.testNetworkConnectivity();
            
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

    async testNetworkConnectivity() {
        console.log('🌐 Testing network connectivity...');
        
        try {
            // Test basic internet connectivity
            const response = await fetch('https://httpbin.org/get', { 
                method: 'GET',
                mode: 'no-cors'
            });
            console.log('✅ Basic internet connectivity: OK');
        } catch (error) {
            console.warn('⚠️ Basic internet connectivity test failed:', error);
        }
        
        try {
            // Test WebRTC support
            if (!window.RTCPeerConnection) {
                throw new Error('WebRTC not supported');
            }
            console.log('✅ WebRTC support: OK');
        } catch (error) {
            console.error('❌ WebRTC not supported:', error);
            this.showError('WebRTC is not supported in this browser.');
        }
        
        try {
            // Test getUserMedia support
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('getUserMedia not supported');
            }
            console.log('✅ getUserMedia support: OK');
        } catch (error) {
            console.error('❌ getUserMedia not supported:', error);
            this.showError('Microphone access is not supported in this browser.');
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
                // Reset status text when returning to main
                if (this.statusText) {
                    this.statusText.textContent = 'Find Quiet Presence';
                }
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
        this.updateStatusText('Setting up connection...');
        
        // Continue playing background sound if active
        if (this.soundManager && this.soundManager.currentSound) {
            console.log('🎵 Continuing background sound during call');
        }
        
        // Start analytics tracking
        if (this.analyticsManager && this.preferencesManager?.isAnalyticsAllowed()) {
            this.analyticsManager.startSession(this.partnerId);
            console.log('📊 Analytics session started');
        }
        
        try {
            if (this.isInitiator) {
                console.log('🎯 Creating offer as initiator...');
                this.updateStatusText('Creating connection...');
                await this.setupPeerConnection();
            } else {
                console.log('⏳ Waiting for offer as responder...');
                this.updateStatusText('Waiting for partner...');
                // Don't create peer connection yet - wait for offer
            }
        } catch (error) {
            console.error('❌ Error setting up connection:', error);
            this.handleConnectionFailure();
        }
    }

    updateStatusText(text) {
        if (this.statusText && this.isInCall) {
            console.log('📊 Updating status text to:', text);
            this.statusText.textContent = text;
            
            // Force a re-render by triggering a small DOM change
            this.statusText.style.display = 'none';
            setTimeout(() => {
                this.statusText.style.display = 'inline-block';
            }, 10);
        } else {
            console.log('⚠️ Cannot update status text:', {
                statusTextExists: !!this.statusText,
                isInCall: this.isInCall,
                requestedText: text
            });
        }
    }

    async setupPeerConnection() {
        console.log('🔧 Setting up peer connection...');
        
        // Don't create if already exists
        if (this.peerConnection) {
            console.log('⚠️ Peer connection already exists, skipping setup');
            return;
        }
        
        this.peerConnection = new RTCPeerConnection({
            iceServers: [
                // STUN servers for NAT traversal
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:stun4.l.google.com:19302' },
                // TURN servers for relay when direct connection fails
                { 
                    urls: 'turn:openrelay.metered.ca:80',
                    username: 'openrelayproject',
                    credential: 'openrelayproject'
                },
                { 
                    urls: 'turn:openrelay.metered.ca:443',
                    username: 'openrelayproject',
                    credential: 'openrelayproject'
                },
                { 
                    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
                    username: 'openrelayproject',
                    credential: 'openrelayproject'
                }
            ],
            iceCandidatePoolSize: 10,
            iceTransportPolicy: 'all',
            bundlePolicy: 'max-bundle',
            rtcpMuxPolicy: 'require',
            sdpSemantics: 'unified-plan'
        });

        console.log('✅ RTCPeerConnection created');

        // Add local stream
        if (this.localStream) {
            console.log('🎤 Adding local stream tracks...');
            this.localStream.getTracks().forEach(track => {
                console.log('Adding track:', track.kind, track.id);
                this.peerConnection.addTrack(track, this.localStream);
            });
        } else {
            console.error('❌ No local stream available!');
            this.handleConnectionFailure();
            return;
        }

        // Handle incoming tracks
        this.peerConnection.ontrack = (event) => {
            console.log('📡 Received remote stream:', event.streams.length, 'streams');
            this.remoteStream = event.streams[0];
            this.playRemoteAudio();
        };

        // Handle ICE candidates
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('🧊 ICE candidate generated:', event.candidate.type, event.candidate.protocol);
                this.socket.emit('ice-candidate', {
                    candidate: event.candidate,
                    target: this.partnerId
                });
            } else {
                console.log('✅ ICE candidate gathering complete');
            }
        };

        // Handle ICE connection state changes
        this.peerConnection.oniceconnectionstatechange = () => {
            console.log('🧊 ICE connection state:', this.peerConnection.iceConnectionState);
            
            // Only update status if we're still in call
            if (!this.isInCall) {
                return;
            }
            
            if (this.peerConnection.iceConnectionState === 'connected') {
                console.log('✅ ICE connection established!');
                this.updateStatusText('Connected');
            } else if (this.peerConnection.iceConnectionState === 'failed') {
                console.log('❌ ICE connection failed');
                this.updateStatusText('Connection failed');
                this.handleConnectionFailure();
            } else if (this.peerConnection.iceConnectionState === 'checking') {
                console.log('🔍 ICE connection checking...');
                this.updateStatusText('Connecting...');
            } else if (this.peerConnection.iceConnectionState === 'disconnected') {
                console.log('🔌 ICE connection disconnected');
                this.updateStatusText('Disconnected');
                this.handleConnectionFailure();
            }
        };

        // Handle connection state changes
        this.peerConnection.onconnectionstatechange = () => {
            console.log('🔗 Connection state changed:', this.peerConnection.connectionState);
            console.log('🧊 ICE connection state:', this.peerConnection.iceConnectionState);
            console.log('📡 Signaling state:', this.peerConnection.signalingState);
            
            // Only update status if we're still in call
            if (!this.isInCall) {
                return;
            }
            
            if (this.peerConnection.connectionState === 'connected') {
                console.log('✅ WebRTC connection established!');
                this.updateStatusText('Connected');
                this.playConnectionSound();
                
                // Clear connection timeout
                if (this.connectionTimeout) {
                    clearTimeout(this.connectionTimeout);
                    this.connectionTimeout = null;
                }
                
                // Set up periodic status check
                this.startStatusCheck();
            } else if (this.peerConnection.connectionState === 'failed') {
                console.log('❌ WebRTC connection failed');
                this.updateStatusText('Connection failed');
                this.handleConnectionFailure();
            } else if (this.peerConnection.connectionState === 'disconnected') {
                console.log('🔌 WebRTC connection disconnected');
                this.updateStatusText('Disconnected');
                this.handleConnectionFailure();
            } else if (this.peerConnection.connectionState === 'connecting') {
                console.log('🔄 WebRTC connecting...');
                this.updateStatusText('Connecting...');
            } else if (this.peerConnection.connectionState === 'new') {
                console.log('🆕 WebRTC connection new');
                this.updateStatusText('Setting up...');
            }
        };

        // Handle signaling state changes
        this.peerConnection.onsignalingstatechange = () => {
            console.log('📡 Signaling state changed:', this.peerConnection.signalingState);
            
            // Process any queued ICE candidates when remote description is set
            if (this.peerConnection.signalingState === 'stable' && this.pendingIceCandidates) {
                this.processQueuedIceCandidates();
            }
        };

        // Only create and send offer if we're the initiator
        if (this.isInitiator) {
            try {
                console.log('📤 Creating offer...');
                const offer = await this.peerConnection.createOffer({
                    offerToReceiveAudio: true,
                    offerToReceiveVideo: false
                });
                
                console.log('📤 Setting local description...');
                await this.peerConnection.setLocalDescription(offer);
                
                console.log('📤 Sending offer to partner:', this.partnerId);
                this.socket.emit('offer', {
                    offer: offer,
                    target: this.partnerId
                });
            } catch (error) {
                console.error('❌ Error creating offer:', error);
                this.handleConnectionFailure();
            }
        }
    }

    async processQueuedIceCandidates() {
        if (!this.pendingIceCandidates || this.pendingIceCandidates.length === 0) {
            return;
        }
        
        console.log(`📥 Processing ${this.pendingIceCandidates.length} queued ICE candidates...`);
        
        for (const candidate of this.pendingIceCandidates) {
            try {
                await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                console.log('✅ Queued ICE candidate added successfully');
            } catch (error) {
                console.error('❌ Error adding queued ICE candidate:', error);
            }
        }
        
        this.pendingIceCandidates = [];
    }

    async handleOffer(offer, from) {
        console.log('📥 Handling offer from:', from);
        
        // Only handle offer if we're the responder
        if (this.isInitiator) {
            console.log('⚠️ Ignoring offer - we are the initiator');
            return;
        }
        
        if (!this.peerConnection) {
            console.log('🔧 Setting up peer connection for offer...');
            await this.setupPeerConnection();
        }
        
        try {
            // Check if we're in the right state to set remote description
            if (this.peerConnection.signalingState === 'stable') {
                console.log('📥 Setting remote description (offer)...');
                await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
                
                console.log('📤 Creating answer...');
                const answer = await this.peerConnection.createAnswer({
                    offerToReceiveAudio: true,
                    offerToReceiveVideo: false
                });
                
                console.log('📤 Setting local description (answer)...');
                await this.peerConnection.setLocalDescription(answer);
                
                console.log('📤 Sending answer to partner:', from);
                this.socket.emit('answer', {
                    answer: answer,
                    target: from
                });
            } else {
                console.log('⚠️ Ignoring offer - wrong signaling state:', this.peerConnection.signalingState);
            }
        } catch (error) {
            console.error('❌ Error handling offer:', error);
            this.handleConnectionFailure();
        }
    }

    async handleAnswer(answer) {
        console.log('📥 Handling answer...');
        try {
            // Check if we're in the right state to set remote description
            if (this.peerConnection.signalingState === 'have-local-offer') {
                console.log('📥 Setting remote description (answer)...');
                await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
                console.log('✅ Answer processed successfully');
                
                // Process any queued ICE candidates
                if (this.pendingIceCandidates) {
                    this.processQueuedIceCandidates();
                }
            } else {
                console.log('⚠️ Ignoring answer - wrong signaling state:', this.peerConnection.signalingState);
            }
        } catch (error) {
            console.error('❌ Error handling answer:', error);
            // Don't call handleConnectionFailure for answer errors - they're often recoverable
        }
    }

    async handleIceCandidate(candidate) {
        console.log('📥 Handling ICE candidate...');
        try {
            if (this.peerConnection && this.peerConnection.remoteDescription) {
                console.log('📥 Adding ICE candidate...');
                await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                console.log('✅ ICE candidate added successfully');
            } else {
                console.log('⏳ Queuing ICE candidate (no remote description yet)');
                // Queue the candidate if remote description isn't set yet
                if (!this.pendingIceCandidates) {
                    this.pendingIceCandidates = [];
                }
                this.pendingIceCandidates.push(candidate);
            }
        } catch (error) {
            console.error('❌ Error handling ICE candidate:', error);
        }
    }

    handleConnectionFailure() {
        console.log('Handling connection failure...');
        this.updateStatusText('Connection failed');
        
        // Stop status check
        this.stopStatusCheck();
        
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
            this.showInterface('main');
            this.partnerId = null;
            this.userInitiatedConnection = false;
        }, 2000);
    }

    handlePartnerDisconnection() {
        this.isInCall = false;
        this.partnerId = null;
        this.isInitiator = null;
        
        // Stop status check
        this.stopStatusCheck();
        
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
        
        // Keep background sound playing if active
        if (this.soundManager && this.soundManager.currentSound) {
            console.log('🎵 Keeping background sound active after disconnection');
        }
        
        // End analytics session
        if (this.analyticsManager && this.preferencesManager?.isAnalyticsAllowed()) {
            this.analyticsManager.endSession();
            console.log('📊 Analytics session ended due to disconnection');
        }
        
        // Reinitialize microphone access
        this.initializeWebRTC();
    }

    playRemoteAudio() {
        const audio = document.createElement('audio');
        audio.srcObject = this.remoteStream;
        audio.autoplay = true;
        
        // Apply audio processing for softer sound
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
        const muteIcon = this.muteBtn.querySelector('i');
        if (!muteIcon) return;
        
        if (this.isMuted) {
            muteIcon.className = 'fas fa-microphone-slash';
        } else {
            muteIcon.className = 'fas fa-microphone';
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

    skipPartner() {
        console.log('Skipping current partner...');
        
        // Notify server about skip
        if (this.socket) {
            this.socket.emit('skip-partner');
        }
        
        // Clean up current connection
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
        
        // Reset mute state
        this.isMuted = false;
        this.updateMuteUI();
        
        // Show waiting interface for new match
        this.showInterface('waiting');
        
        // Reinitialize microphone access
        this.initializeWebRTC();
    }

    endCall() {
        this.isInCall = false;
        
        // Stop status check
        this.stopStatusCheck();
        
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
        
        // Keep background sound playing if active
        if (this.soundManager && this.soundManager.currentSound) {
            console.log('🎵 Keeping background sound active after call');
        }
        
        // End analytics session
        if (this.analyticsManager && this.preferencesManager?.isAnalyticsAllowed()) {
            this.analyticsManager.endSession();
            console.log('📊 Analytics session ended');
        }
        
        // Reinitialize microphone access
        this.initializeWebRTC();
    }

    startStatusCheck() {
        // Clear any existing status check
        if (this.statusCheckInterval) {
            clearInterval(this.statusCheckInterval);
        }
        
        // Check status every 2 seconds
        this.statusCheckInterval = setInterval(() => {
            if (!this.isInCall || !this.peerConnection) {
                this.stopStatusCheck();
                return;
            }
            
            const currentStatus = this.statusText?.textContent;
            const expectedStatus = this.getExpectedStatus();
            
            if (currentStatus !== expectedStatus) {
                console.log('🔄 Status mismatch detected:', {
                    current: currentStatus,
                    expected: expectedStatus
                });
                this.updateStatusText(expectedStatus);
            }
        }, 2000);
    }
    
    stopStatusCheck() {
        if (this.statusCheckInterval) {
            clearInterval(this.statusCheckInterval);
            this.statusCheckInterval = null;
        }
    }
    
    getExpectedStatus() {
        if (!this.peerConnection) {
            return 'Setting up...';
        }
        
        if (this.peerConnection.connectionState === 'connected') {
            return 'Connected';
        } else if (this.peerConnection.connectionState === 'connecting') {
            return 'Connecting...';
        } else if (this.peerConnection.connectionState === 'failed') {
            return 'Connection failed';
        } else if (this.peerConnection.connectionState === 'disconnected') {
            return 'Disconnected';
        } else if (this.peerConnection.connectionState === 'new') {
            return 'Setting up...';
        }
        
        return 'Setting up...';
    }

    // Handle page unload
    handlePageUnload() {
        // Stop mute sync
        this.stopMuteSync();
        
        // Clean up sound system
        if (this.soundManager) {
            this.soundManager.destroy();
        }
        
        if (this.isInCall) {
            this.endCall();
        }
        if (this.isInQueue) {
            this.leaveQueue();
        }
    }

    // Authentication methods
    initializeAuth() {
        // Check for existing auth
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');
        
        if (token && user) {
            this.authToken = token;
            this.currentUser = JSON.parse(user);
            this.updateAuthUI();
        }
    }

    // Sound system methods
    initializeSoundSystem() {
        // Initialize global sound manager instance
        if (!window.soundManager) {
            window.soundManager = new SoundManager();
        }
        
        if (window.soundManager) {
            window.soundManager.init();
            console.log('🎵 Multi-sound system initialized');
        }
    }

    // Analytics system methods
    initializeAnalytics() {
        if (this.analyticsManager) {
            this.analyticsManager.init();
            console.log('📊 Analytics system initialized');
        }
    }

    // Preferences system methods
    initializePreferences() {
        if (this.preferencesManager) {
            this.preferencesManager.init();
            console.log('⚙️ Preferences system initialized');
        }
    }

    updateAuthUI() {
        if (this.currentUser) {
            // Show user menu, hide login button
            this.userMenu.style.display = 'flex';
            this.loginBtn.style.display = 'none';
            this.userName.textContent = this.currentUser.name || this.currentUser.username || 'User';
        } else {
            // Show login button, hide user menu
            this.userMenu.style.display = 'none';
            this.loginBtn.style.display = 'flex';
        }
    }

    async fetchWithAuth(url, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.authToken) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
        }

        return fetch(url, {
            ...options,
            headers
        });
    }

    async getUserProfile() {
        try {
            const response = await this.fetchWithAuth('/api/auth/profile');
            if (response.ok) {
                const data = await response.json();
                this.currentUser = data.user;
                this.updateAuthUI();
                return data.user;
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        }
        return null;
    }

    async getUserAnalytics() {
        try {
            const response = await this.fetchWithAuth('/api/auth/analytics');
            if (response.ok) {
                const data = await response.json();
                return data.analytics;
            }
        } catch (error) {
            console.error('Error fetching analytics:', error);
        }
        return null;
    }

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.authToken = null;
        this.currentUser = null;
        this.updateAuthUI();
        window.location.reload();
    }
}

// Global functions for HTML onclick handlers
function toggleUserMenu() {
    const dropdown = document.getElementById('user-dropdown');
    dropdown.classList.toggle('show');
}

function goToLogin() {
    window.location.href = 'auth.html';
}

function showProfile() {
    if (window.coSleepApp && window.coSleepApp.currentUser) {
        alert(`Profile: ${window.coSleepApp.currentUser.name || 'No name'}\nEmail: ${window.coSleepApp.currentUser.email}\nPremium: ${window.coSleepApp.currentUser.isPremium ? 'Yes' : 'No'}`);
    }
}

function showAnalytics() {
    window.location.href = 'analytics.html';
}

function upgradePremium() {
    alert('Premium upgrade coming soon! This will include:\n• Advanced background sounds\n• Sleep analytics\n• Custom sleep schedules\n• Priority matching\n• Unlimited sessions');
}

function logout() {
    if (window.coSleepApp) {
        window.coSleepApp.logout();
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    const userMenu = document.getElementById('user-menu');
    const dropdown = document.getElementById('user-dropdown');
    
    if (userMenu && !userMenu.contains(e.target)) {
        dropdown.classList.remove('show');
    }
});

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.coSleepApp = new CoSleepApp();
    
    // Handle page unload
    window.addEventListener('beforeunload', () => {
        window.coSleepApp.handlePageUnload();
    });
});

// Handle connection state changes
window.addEventListener('online', () => {
    console.log('Connection restored');
});

window.addEventListener('offline', () => {
    console.log('Connection lost');
});

// Background Sound Button Functionality
function initBackgroundSoundButton() {
    const soundToggle = document.getElementById('background-sound-toggle');
    const soundSection = document.querySelector('.sound-section');
    
    if (soundToggle && soundSection) {
        soundToggle.addEventListener('click', () => {
            soundSection.classList.toggle('hidden');
            soundToggle.classList.toggle('active');
            
            // Update button icon
            const svg = soundToggle.querySelector('svg');
            if (soundSection.classList.contains('hidden')) {
                svg.innerHTML = '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>';
            } else {
                svg.innerHTML = '<path d="M12 2v20M2 10h20"/>';
            }
        });
        
        // Initially hide the sound section
        soundSection.classList.add('hidden');
    }
}

// Initialize background sound button when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initBackgroundSoundButton();
});
