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
        
        // Performance optimizations
        this.debounceTimers = new Map();
        this.connectionPool = new Map();
        this.audioContextPool = [];
        this.maxAudioContexts = 3;
        
        this.initializeElements();
        this.bindEvents();
        this.initializeWebRTC();
        this.initializeSocket();
        this.initializeAuth();
        this.initializeSoundSystem();
        this.initializeAnalytics();
        this.initializePreferences();
        this.initializePreferencesUI(); // Initialize preferences UI
        
        // Initialize UI performance optimizations
        this.initializeUIPerformance();
        this.setupEventDelegation();
        this.startUIPerformanceMonitoring();
        
        // Start periodic mute state sync
        this.startMuteSync();
    }

    initializeElements() {
        // Main interface elements
        this.mainPlayBtn = document.getElementById('mainPlayBtn');
        this.callInterface = document.getElementById('callInterface');
        this.loadingInterface = document.getElementById('loadingInterface');
        this.errorInterface = document.getElementById('errorInterface');
        
        // Call interface elements
        this.muteBtn = document.getElementById('muteBtn');
        this.endCallBtn = document.getElementById('endCallBtn');
        this.statusText = document.getElementById('statusText');
        
        // Loading and error elements
        this.loadingText = document.getElementById('loadingText');
        this.errorText = document.getElementById('errorText');
        this.retryBtn = document.getElementById('retryBtn');

        // Preferences elements
        this.preferencesBtn = document.getElementById('preferencesBtn');
        this.preferencesOverlay = document.getElementById('preferencesOverlay');
        this.closePreferencesBtn = document.getElementById('closePreferencesBtn');
        this.soundCountBtn = document.getElementById('soundCountBtn');
        this.soundPanel = document.getElementById('soundPanel');
        this.closeSoundBtn = document.getElementById('closeSoundBtn');

        // Header elements
        this.onlineCount = document.getElementById('onlineCount');
        this.loginBtn = document.getElementById('loginBtn');
    }

    bindEvents() {
        // Bind main play button (Find Quiet Presence)
        if (this.mainPlayBtn) {
            this.mainPlayBtn.addEventListener('click', () => this.joinQueue());
        }
        
        // Bind call interface buttons
        if (this.muteBtn) {
            this.muteBtn.addEventListener('click', () => this.toggleMute());
        }
        
        if (this.endCallBtn) {
            this.endCallBtn.addEventListener('click', () => this.endCall());
        }
        
        // Bind retry button
        if (this.retryBtn) {
            this.retryBtn.addEventListener('click', () => {
                if (this.errorInterface) {
                    this.errorInterface.style.display = 'none';
                }
                this.joinQueue();
            });
        }
        
        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isInCall) {
                this.endCall();
            }
        });

        // Bind login button
        if (this.loginBtn) {
            this.loginBtn.addEventListener('click', () => {
                // For now, just show a placeholder message
                alert('Login functionality coming soon!');
            });
        }
    }

    initializeSocket() {
        // Check if Socket.IO is available
        if (typeof io === 'undefined') {
            console.error('❌ Socket.IO not available. Server may not be running.');
            this.showError('Connection failed. Please make sure the server is running.');
            return;
        }

        try {
            // Connect to the server
            this.socket = io({
                transports: ["websocket", "polling"],
                upgrade: true,
                rememberUpgrade: true,
                timeout: 20000
            });
            
            // Handle connection events
            this.socket.on('connect', () => {
                console.log('✅ Connected to server');
            });
            
            this.socket.on('connect_error', (error) => {
                console.error('❌ Connection error:', error);
                this.showError('Unable to connect to server. Please check your internet connection.');
            });
            
            this.socket.on('disconnect', (reason) => {
                console.log('🔌 Disconnected from server:', reason);
                if (this.isInCall) {
                    this.handlePartnerDisconnection();
                }
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
            
        } catch (error) {
            console.error('❌ Error initializing socket:', error);
            this.showError('Failed to connect to server. Please refresh the page.');
        }
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
        
        const tests = [
            {
                name: 'Basic Internet',
                test: async () => {
                    const response = await fetch('https://httpbin.org/get', { 
                        method: 'GET',
                        mode: 'no-cors',
                        signal: AbortSignal.timeout(5000)
                    });
                    return true;
                }
            },
            {
                name: 'WebRTC Support',
                test: async () => {
                    if (!window.RTCPeerConnection) {
                        throw new Error('WebRTC not supported');
                    }
                    return true;
                }
            },
            {
                name: 'Microphone Access',
                test: async () => {
                    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                        throw new Error('getUserMedia not supported');
                    }
                    return true;
                }
            },
            {
                name: 'Socket.IO Connection',
                test: async () => {
                    if (typeof io === 'undefined') {
                        throw new Error('Socket.IO not available');
                    }
                    return true;
                }
            }
        ];
        
        const results = [];
        
        for (const test of tests) {
            try {
                await test.test();
                console.log(`✅ ${test.name}: OK`);
                results.push({ name: test.name, status: 'success' });
            } catch (error) {
                console.error(`❌ ${test.name}: ${error.message}`);
                results.push({ name: test.name, status: 'failed', error: error.message });
            }
        }
        
        // Log overall connectivity status
        const failedTests = results.filter(r => r.status === 'failed');
        if (failedTests.length > 0) {
            console.warn('⚠️ Some connectivity tests failed:', failedTests);
        } else {
            console.log('✅ All connectivity tests passed');
        }
        
        return results;
    }

    // Enhanced connection monitoring
    startConnectionMonitoring() {
        if (this.connectionMonitorInterval) {
            clearInterval(this.connectionMonitorInterval);
        }
        
        this.connectionMonitorInterval = setInterval(() => {
            if (!this.isInCall || !this.peerConnection) {
                return;
            }
            
            const stats = {
                connectionState: this.peerConnection.connectionState,
                iceConnectionState: this.peerConnection.iceConnectionState,
                signalingState: this.peerConnection.signalingState,
                timestamp: Date.now()
            };
            
            // Log significant state changes
            if (this.lastConnectionStats) {
                const last = this.lastConnectionStats;
                if (last.connectionState !== stats.connectionState) {
                    console.log(`🔗 Connection state changed: ${last.connectionState} → ${stats.connectionState}`);
                }
                if (last.iceConnectionState !== stats.iceConnectionState) {
                    console.log(`🧊 ICE state changed: ${last.iceConnectionState} → ${stats.iceConnectionState}`);
                }
            }
            
            this.lastConnectionStats = stats;
            
            // Alert on connection issues
            if (stats.connectionState === 'failed' || stats.iceConnectionState === 'failed') {
                console.warn('⚠️ Connection issues detected:', stats);
            }
        }, 5000); // Check every 5 seconds
    }
    
    stopConnectionMonitoring() {
        if (this.connectionMonitorInterval) {
            clearInterval(this.connectionMonitorInterval);
            this.connectionMonitorInterval = null;
        }
        this.lastConnectionStats = null;
    }

    // Enhanced error handling with performance monitoring
    showError(message, isRecoverable = true) {
        console.error('❌ Error:', message);
        
        // Log performance metrics at error time
        if (window.performance && window.performance.memory) {
            console.error('Memory usage at error:', {
                usedJSHeapSize: Math.round(window.performance.memory.usedJSHeapSize / 1024 / 1024 * 100) / 100 + 'MB',
                totalJSHeapSize: Math.round(window.performance.memory.totalJSHeapSize / 1024 / 1024 * 100) / 100 + 'MB'
            });
        }
        
        if (this.errorInterface && this.errorText) {
            this.errorText.textContent = message;
            this.errorInterface.style.display = 'flex';
            
            // Add retry button if error is recoverable
            if (isRecoverable && this.retryBtn) {
                this.retryBtn.style.display = 'block';
            } else if (this.retryBtn) {
                this.retryBtn.style.display = 'none';
            }
        } else {
            // Fallback to toast notification
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
                max-width: 90vw;
                word-wrap: break-word;
            `;
            errorDiv.textContent = message;
            document.body.appendChild(errorDiv);
            
            setTimeout(() => {
                errorDiv.remove();
            }, 5000);
        }
    }

    showInterface(interfaceName) {
        // Hide all interfaces first
        if (this.callInterface) this.callInterface.style.display = 'none';
        if (this.loadingInterface) this.loadingInterface.style.display = 'none';
        if (this.errorInterface) this.errorInterface.style.display = 'none';
        
        switch (interfaceName) {
            case 'main':
                // Main interface is always visible by default
                break;
            case 'waiting':
                if (this.loadingInterface) {
                    this.loadingInterface.style.display = 'flex';
                    if (this.loadingText) {
                        this.loadingText.textContent = 'Finding partner...';
                    }
                }
                break;
            case 'call':
                if (this.callInterface) {
                    this.callInterface.style.display = 'flex';
                }
                break;
        }
    }

    async joinQueue() {
        if (!this.localStream) {
            this.showError('Microphone access required. Please refresh and allow access.');
            return;
        }

        if (!this.socket) {
            this.showError('Not connected to server. Please refresh the page.');
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
        if (this.socket) {
            this.socket.emit('leave-queue');
        }
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
        
        // Start connection monitoring
        this.startConnectionMonitoring();
        
        // Continue playing background sound if active
        if (window.soundManager && window.soundManager.isAnySoundPlaying()) {
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
        
        // Stop connection monitoring
        this.stopConnectionMonitoring();
        
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
        if (window.soundManager && window.soundManager.isAnySoundPlaying()) {
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
        
        // Stop connection monitoring
        this.stopConnectionMonitoring();
        
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
        if (window.soundManager && window.soundManager.isAnySoundPlaying()) {
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
        
        // Stop connection monitoring
        this.stopConnectionMonitoring();
        
        // Clean up sound system
        if (window.soundManager) {
            window.soundManager.destroy();
        }
        
        // Use enhanced cleanup
        this.cleanup();
        
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
        // Initialize the global sound manager
        window.soundManager = new SoundManager();
        window.soundManager.init();
        console.log('🎵 Sound system initialized');
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
        this.preferencesManager = new PreferencesManager();
        this.preferencesManager.init();
        console.log('⚙️ Preferences initialized');
    }

    // Initialize preferences button and overlay
    initializePreferencesUI() {
        const preferencesBtn = document.getElementById('preferencesBtn');
        const preferencesOverlay = document.getElementById('preferencesOverlay');
        const closePreferencesBtn = document.getElementById('closePreferencesBtn');
        const soundCountBtn = document.getElementById('soundCountBtn');
        const soundPanel = document.getElementById('soundPanel');
        const closeSoundBtn = document.getElementById('closeSoundBtn');

        // Open preferences overlay
        preferencesBtn.addEventListener('click', () => {
            preferencesOverlay.classList.add('active');
        });

        // Close preferences overlay
        closePreferencesBtn.addEventListener('click', () => {
            preferencesOverlay.classList.remove('active');
        });

        // Close preferences on overlay click
        preferencesOverlay.addEventListener('click', (e) => {
            if (e.target === preferencesOverlay) {
                preferencesOverlay.classList.remove('active');
            }
        });

        // Open sound panel from preferences
        soundCountBtn.addEventListener('click', () => {
            soundPanel.classList.add('active');
            preferencesOverlay.classList.remove('active');
        });

        // Close sound panel
        closeSoundBtn.addEventListener('click', () => {
            soundPanel.classList.remove('active');
        });

        // Close sound panel on overlay click
        soundPanel.addEventListener('click', (e) => {
            if (e.target === soundPanel) {
                soundPanel.classList.remove('active');
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                preferencesOverlay.classList.remove('active');
                soundPanel.classList.remove('active');
            }
        });

        console.log('⚙️ Preferences UI initialized');
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

    // Performance optimization: Debounced event handler
    debounce(func, wait) {
        return (...args) => {
            clearTimeout(this.debounceTimers.get(func));
            this.debounceTimers.set(func, setTimeout(() => func.apply(this, args), wait));
        };
    }

    // Performance optimization: Connection pooling
    getConnectionFromPool() {
        if (this.connectionPool.size > 0) {
            const [key, connection] = this.connectionPool.entries().next().value;
            this.connectionPool.delete(key);
            return connection;
        }
        return null;
    }

    addConnectionToPool(connection) {
        if (this.connectionPool.size < 5) { // Limit pool size
            this.connectionPool.set(Date.now(), connection);
        }
    }

    // Performance optimization: Audio context pooling
    getAudioContext() {
        if (this.audioContextPool.length > 0) {
            return this.audioContextPool.pop();
        }
        return new (window.AudioContext || window.webkitAudioContext)();
    }

    returnAudioContext(context) {
        if (this.audioContextPool.length < this.maxAudioContexts) {
            try {
                context.close();
            } catch (e) {
                // Context already closed
            }
            this.audioContextPool.push(context);
        }
    }

    // Enhanced cleanup with performance optimizations
    cleanup() {
        // Clear all debounce timers
        this.debounceTimers.forEach(timer => clearTimeout(timer));
        this.debounceTimers.clear();
        
        // Clear connection pool
        this.connectionPool.forEach(connection => {
            if (connection && typeof connection.close === 'function') {
                connection.close();
            }
        });
        this.connectionPool.clear();
        
        // Clear audio context pool
        this.audioContextPool.forEach(context => {
            try {
                context.close();
            } catch (e) {
                // Context already closed
            }
        });
        this.audioContextPool = [];
        
        // Stop all intervals
        this.stopMuteSync();
        this.stopStatusCheck();
        
        // Clear timeouts
        if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
        }
        
        // Clean up WebRTC resources
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
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
    }

    // UI Performance optimizations
    initializeUIPerformance() {
        // Debounced UI updates
        this.uiUpdateQueue = new Set();
        this.uiUpdateTimeout = null;
        
        // Intersection Observer for lazy loading
        this.setupIntersectionObserver();
        
        // Optimized DOM queries
        this.cachedElements = new Map();
        
        // Virtual scrolling setup
        this.virtualScrollConfig = {
            itemHeight: 60,
            visibleItems: 10,
            bufferSize: 5
        };
    }

    // Debounced UI update system
    queueUIUpdate(elementId, updateFunction) {
        this.uiUpdateQueue.add({ elementId, updateFunction });
        
        if (this.uiUpdateTimeout) {
            clearTimeout(this.uiUpdateTimeout);
        }
        
        this.uiUpdateTimeout = setTimeout(() => {
            this.processUIUpdates();
        }, 16); // ~60fps
    }

    processUIUpdates() {
        const updates = Array.from(this.uiUpdateQueue);
        this.uiUpdateQueue.clear();
        
        // Batch DOM updates
        const fragment = document.createDocumentFragment();
        
        updates.forEach(({ elementId, updateFunction }) => {
            const element = this.getCachedElement(elementId);
            if (element) {
                updateFunction(element);
            }
        });
        
        // Single reflow/repaint
        if (fragment.children.length > 0) {
            document.body.appendChild(fragment);
        }
    }

    // Cached element queries
    getCachedElement(id) {
        if (!this.cachedElements.has(id)) {
            const element = document.getElementById(id);
            if (element) {
                this.cachedElements.set(id, element);
            }
        }
        return this.cachedElements.get(id);
    }

    // Optimized showInterface with performance
    showInterface(interfaceName) {
        // Use requestAnimationFrame for smooth transitions
        requestAnimationFrame(() => {
            // Hide all interfaces first
            const interfaces = ['callInterface', 'loadingInterface', 'errorInterface'];
            interfaces.forEach(id => {
                const element = this.getCachedElement(id);
                if (element) {
                    element.style.display = 'none';
                    element.setAttribute('aria-hidden', 'true');
                }
            });
            
            switch (interfaceName) {
                case 'main':
                    // Main interface is always visible by default
                    break;
                case 'waiting':
                    const loadingElement = this.getCachedElement('loadingInterface');
                    if (loadingElement) {
                        loadingElement.style.display = 'flex';
                        loadingElement.setAttribute('aria-hidden', 'false');
                        const loadingText = this.getCachedElement('loadingText');
                        if (loadingText) {
                            loadingText.textContent = 'Finding partner...';
                        }
                    }
                    break;
                case 'call':
                    const callElement = this.getCachedElement('callInterface');
                    if (callElement) {
                        callElement.style.display = 'flex';
                        callElement.setAttribute('aria-hidden', 'false');
                    }
                    break;
            }
        });
    }

    // Optimized status text updates
    updateStatusText(text) {
        this.queueUIUpdate('statusText', (element) => {
            if (element && this.isInCall) {
                console.log('📊 Updating status text to:', text);
                element.textContent = text;
                
                // Update ARIA live region
                element.setAttribute('aria-live', 'polite');
            }
        });
    }

    // Optimized mute UI updates
    updateMuteUI() {
        this.queueUIUpdate('muteBtn', (element) => {
            if (!element) return;
            
            // Update button class
            element.classList.toggle('muted', this.isMuted);
            
            // Update button icon with performance optimization
            const muteIcon = element.querySelector('i');
            if (!muteIcon) return;
            
            if (this.isMuted) {
                muteIcon.className = 'fas fa-microphone-slash';
                element.setAttribute('aria-label', 'Unmute microphone');
            } else {
                muteIcon.className = 'fas fa-microphone';
                element.setAttribute('aria-label', 'Mute microphone');
            }
        });
    }

    // Optimized online count updates
    updateOnlineCount(count) {
        this.queueUIUpdate('onlineCount', (element) => {
            if (element) {
                const countText = element.querySelector('.count-text');
                if (countText) {
                    countText.textContent = `${count} online`;
                }
            }
        });
    }

    // Intersection Observer for lazy loading
    setupIntersectionObserver() {
        if ('IntersectionObserver' in window) {
            this.intersectionObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        // Load content when visible
                        const element = entry.target;
                        if (element.dataset.lazyLoad) {
                            this.loadLazyContent(element);
                        }
                    }
                });
            }, {
                rootMargin: '50px',
                threshold: 0.1
            });
        }
    }

    // Lazy content loading
    loadLazyContent(element) {
        const contentType = element.dataset.lazyLoad;
        
        switch (contentType) {
            case 'sound':
                this.loadSoundContent(element);
                break;
            case 'preference':
                this.loadPreferenceContent(element);
                break;
        }
        
        // Remove observer after loading
        this.intersectionObserver.unobserve(element);
        element.removeAttribute('data-lazy-load');
    }

    // Virtual scrolling for large lists
    setupVirtualScroll(container, items, itemHeight = 60) {
        const containerHeight = container.clientHeight;
        const visibleItems = Math.ceil(containerHeight / itemHeight);
        const bufferSize = Math.ceil(visibleItems / 2);
        
        let startIndex = 0;
        let endIndex = Math.min(visibleItems + bufferSize, items.length);
        
        const renderItems = () => {
            const fragment = document.createDocumentFragment();
            
            for (let i = startIndex; i < endIndex; i++) {
                const item = items[i];
                const itemElement = this.createListItem(item, i);
                fragment.appendChild(itemElement);
            }
            
            container.innerHTML = '';
            container.appendChild(fragment);
        };
        
        container.addEventListener('scroll', () => {
            const scrollTop = container.scrollTop;
            const newStartIndex = Math.floor(scrollTop / itemHeight);
            
            if (newStartIndex !== startIndex) {
                startIndex = newStartIndex;
                endIndex = Math.min(startIndex + visibleItems + bufferSize, items.length);
                renderItems();
            }
        });
        
        // Initial render
        renderItems();
    }

    // Create list item with performance optimization
    createListItem(item, index) {
        const li = document.createElement('li');
        li.style.height = '60px';
        li.style.position = 'absolute';
        li.style.top = `${index * 60}px`;
        li.style.width = '100%';
        
        // Use DocumentFragment for better performance
        const fragment = document.createDocumentFragment();
        fragment.appendChild(li);
        
        return li;
    }

    // Optimized event delegation
    setupEventDelegation() {
        document.addEventListener('click', (e) => {
            // Handle all button clicks through delegation
            if (e.target.matches('[data-action]')) {
                e.preventDefault();
                const action = e.target.dataset.action;
                this.handleDelegatedAction(action, e.target);
            }
        });
        
        // Handle form submissions
        document.addEventListener('submit', (e) => {
            if (e.target.matches('form')) {
                e.preventDefault();
                this.handleFormSubmission(e.target);
            }
        });
    }

    // Handle delegated actions
    handleDelegatedAction(action, element) {
        switch (action) {
            case 'toggle-mute':
                this.toggleMute();
                break;
            case 'end-call':
                this.endCall();
                break;
            case 'retry':
                this.retryConnection();
                break;
            case 'open-preferences':
                this.openPreferences();
                break;
            case 'close-preferences':
                this.closePreferences();
                break;
            case 'toggle-sound':
                const soundName = element.dataset.sound;
                if (soundName) {
                    this.toggleSound(soundName);
                }
                break;
        }
    }

    // Optimized form handling
    handleFormSubmission(form) {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        // Validate and submit
        if (this.validateFormData(data)) {
            this.submitFormData(data);
        }
    }

    // Form validation
    validateFormData(data) {
        // Add validation logic here
        return true;
    }

    // Form submission
    submitFormData(data) {
        // Add submission logic here
        console.log('Form data:', data);
    }

    // Performance monitoring for UI
    startUIPerformanceMonitoring() {
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.entryType === 'measure') {
                        console.log(`UI Performance: ${entry.name} took ${entry.duration}ms`);
                    }
                }
            });
            
            observer.observe({ entryTypes: ['measure'] });
        }
    }

    // Measure UI performance
    measureUIPerformance(name, callback) {
        const startName = `${name}-start`;
        const endName = `${name}-end`;
        
        performance.mark(startName);
        callback();
        performance.mark(endName);
        performance.measure(name, startName, endName);
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
