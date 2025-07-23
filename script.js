// Onboarding check - redirect if not completed
(function checkOnboarding() {
    const onboardingComplete = localStorage.getItem('hence_onboarding_complete');
    const userId = localStorage.getItem('hence_user_id');
    const userType = localStorage.getItem('hence_user_type');
    
    console.log('🔍 Onboarding check:', {
        onboardingComplete,
        userId,
        userType,
        url: window.location.href
    });
    
    if (!onboardingComplete || !userId || !userType) {
        console.log('❌ Onboarding not complete, redirecting to /onboarding');
        // Redirect to onboarding
        window.location.href = '/onboarding';
        return;
    }
    
    console.log('✅ Onboarding complete, showing main app');
    
    // Ensure main interface is visible after onboarding
    document.addEventListener('DOMContentLoaded', () => {
        // Initialize the main app
        console.log('📱 Initializing main app...');
        if (window.CoSleepApp) {
            window.coSleepApp = new CoSleepApp();
        }
    });
})();

class CoSleepApp {
    constructor() {
        console.log('🚀 CoSleepApp initializing...');
        
        // Core properties
        this.socket = null;
        this.localStream = null;
        this.remoteStream = null;
        this.peerConnection = null;
        this.partnerId = null;
        this.isInitiator = null;
        this.isInQueue = false;
        this.isInCall = false;
        this.isMuted = false;
        this.retryCount = 0;
        this.connectionTimeout = null;
        this.connectionMonitorInterval = null;
        this.lastConnectionStats = null;
        this.userInitiatedConnection = false;
        
        // Authentication
        this.authToken = null;
        this.userId = localStorage.getItem('hence_user_id');
        this.userType = localStorage.getItem('hence_user_type');
        this.displayName = localStorage.getItem('hence_display_name');
        
        // Hence Enhancement: Enhanced State Tracking
        this.connectionState = 'idle'; // idle, searching, matched, connected
        this.voiceState = 'unmuted'; // muted, unmuted, speaking
        this.isVerified = this.userType === 'profile' && this.displayName; // Profile users with display name
        this.sessionMetadata = {
            startTime: null,
            partnerId: null,
            connectionQuality: null,
            callId: null
        };
        
        // State change callbacks for UI updates
        this.stateChangeCallbacks = new Map();
        
        // Simplified for freemium version - no sound system
        // Focus on core WebRTC functionality
        
        // Analytics and preferences integration
        this.analyticsManager = window.analyticsManager;
        this.preferencesManager = window.preferencesManager;
        
        // Performance optimizations
        this.debounceTimers = new Map();
        this.connectionPool = new Map();
        this.audioContextPool = [];
        this.maxAudioContexts = 3;
        
        // WebRTC initialization flag
        this.webrtcInitialized = false;
        
        this.initializeElements();
        this.bindEvents();
        
        // Ensure error interface is hidden during initialization
        this.showInterface('main');
        
        this.initializeSocket();
        this.initializeAuth();
        // Sound system removed for freemium version
        this.initializeAnalytics();
        this.initializePreferences();
        this.initializePreferencesUI(); // Initialize preferences UI
        
        // Initialize UI performance optimizations
        this.initializeUIPerformance();
        this.setupEventDelegation();
        this.startUIPerformanceMonitoring();
        
        // Start periodic mute state sync
        this.startMuteSync();
        
        // Hence Enhancement: Initialize state management
        this.initializeStateManagement();
        
        // Update user info display
        this.updateUserInfo();
        
        // Down arrow smooth scroll
        const downArrow = document.getElementById('downArrowBtn');
        if (downArrow) {
            downArrow.addEventListener('click', () => {
                const bgSection = document.getElementById('backgroundSoundsSection');
                if (bgSection) {
                    bgSection.scrollIntoView({ behavior: 'smooth' });
                }
            });
        }
        
        // Attach a single event listener for cancel-queue-btn (event delegation)
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.cancel-queue-btn');
            if (btn) {
                this.leaveQueue();
                this.showInterface('main');
            }
        });
        
        // Sound panel controls
        // Sound controls removed for freemium version
        
        // Global volume control removed for freemium version

        // Reset onboarding button
        const resetBtn = document.getElementById('reset-onboarding');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                console.log('🔄 Resetting onboarding...');
                // Clear all stored data
                localStorage.removeItem('hence_user_id');
                localStorage.removeItem('hence_user_type');
                localStorage.removeItem('hence_display_name');
                localStorage.removeItem('hence_onboarding_complete');
                window.location.href = '/onboarding';
            });
        }
    }

    // Hence Enhancement: State Management System
    initializeStateManagement() {
        console.log('🔧 Initializing state management...');
        
        // Load user verification status
        this.loadUserVerificationStatus();
        
        // Set up state change broadcasting
        this.setupStateChangeHandling();
        
        // Initialize activity tracking
        this.startActivityTracking();
    }

    async loadUserVerificationStatus() {
        try {
            // For now, profile users are considered verified
            // This can be enhanced later with actual verification system
            this.isVerified = this.userType === 'profile';
            console.log('👤 User verification status:', this.isVerified);
        } catch (error) {
            console.error('❌ Failed to load verification status:', error);
            this.isVerified = false;
        }
    }

    setupStateChangeHandling() {
        // Register state change callbacks
        this.onStateChange('connectionState', (newState, oldState) => {
            console.log(`🔄 Connection state: ${oldState} → ${newState}`);
            this.broadcastState();
            this.updateUIForConnectionState(newState);
        });

        this.onStateChange('voiceState', (newState, oldState) => {
            console.log(`🎤 Voice state: ${oldState} → ${newState}`);
            this.broadcastState();
            this.updateUIForVoiceState(newState);
        });
    }

    startActivityTracking() {
        // Update last activity every 30 seconds while active
        this.activityInterval = setInterval(() => {
            this.updateLastActivity();
        }, 30000);

        // Track user interactions
        ['click', 'keypress', 'touchstart'].forEach(event => {
            document.addEventListener(event, () => {
                this.updateLastActivity();
            }, { passive: true });
        });
    }

    async updateLastActivity() {
        try {
            if (this.socket && this.socket.connected) {
                this.socket.emit('update-activity', {
                    userId: this.userId,
                    timestamp: Date.now()
                });
            }
        } catch (error) {
            console.error('Failed to update activity:', error);
        }
    }

    // State change system
    onStateChange(property, callback) {
        if (!this.stateChangeCallbacks.has(property)) {
            this.stateChangeCallbacks.set(property, []);
        }
        this.stateChangeCallbacks.get(property).push(callback);
    }

    setState(property, newValue) {
        const oldValue = this[property];
        if (oldValue !== newValue) {
            this[property] = newValue;
            
            // Trigger callbacks
            const callbacks = this.stateChangeCallbacks.get(property) || [];
            callbacks.forEach(callback => {
                try {
                    callback(newValue, oldValue);
                } catch (error) {
                    console.error(`State change callback error for ${property}:`, error);
                }
            });
        }
    }

    broadcastState() {
        if (this.socket && this.socket.connected) {
            this.socket.emit('user-state-update', {
                userId: this.userId,
                connectionState: this.connectionState,
                voiceState: this.voiceState,
                isInCall: this.isInCall,
                timestamp: Date.now()
            });
        }
    }

    updateUIForConnectionState(state) {
        const connectBtn = document.getElementById('findPartnerBtn');
        if (!connectBtn) return;

        // Remove existing state classes
        connectBtn.classList.remove('idle', 'searching', 'matched', 'connected');
        connectBtn.classList.add(state);

        // Update button text/appearance based on state
        switch (state) {
            case 'idle':
                connectBtn.textContent = 'Find Quiet Presence';
                break;
            case 'searching':
                connectBtn.textContent = 'Searching...';
                break;
            case 'matched':
                connectBtn.textContent = 'Connecting...';
                break;
            case 'connected':
                connectBtn.textContent = 'Connected';
                break;
        }
    }

    updateUIForVoiceState(state) {
        const muteBtn = document.getElementById('muteBtn');
        if (!muteBtn) return;

        // Update mute button appearance
        muteBtn.classList.remove('muted', 'unmuted', 'speaking');
        muteBtn.classList.add(state);
    }

    // Enhanced call tracking for history
    startCallTracking(partnerId) {
        this.sessionMetadata = {
            startTime: Date.now(),
            partnerId: partnerId,
            connectionQuality: null,
            callId: this.generateCallId()
        };
        
        console.log('📞 Call tracking started:', this.sessionMetadata);
    }

    endCallTracking(endReason = 'completed') {
        if (!this.sessionMetadata.startTime) return;

        const duration = Math.floor((Date.now() - this.sessionMetadata.startTime) / 1000);
        const callData = {
            ...this.sessionMetadata,
            endTime: Date.now(),
            duration: duration,
            endReason: endReason,
            connectionQuality: this.getConnectionQuality()
        };

        console.log('📞 Call tracking ended:', callData);

        // Store call history if user is verified
        if (this.isVerified) {
            this.saveCallHistory(callData);
        }

        // Reset session metadata
        this.sessionMetadata = {
            startTime: null,
            partnerId: null,
            connectionQuality: null,
            callId: null
        };
    }

    async saveCallHistory(callData) {
        try {
            if (this.socket && this.socket.connected) {
                this.socket.emit('save-call-history', {
                    userId: this.userId,
                    partnerId: callData.partnerId,
                    startTime: new Date(callData.startTime),
                    endTime: new Date(callData.endTime),
                    duration: callData.duration,
                    connectionQuality: callData.connectionQuality,
                    endReason: callData.endReason
                });
            }
        } catch (error) {
            console.error('❌ Failed to save call history:', error);
        }
    }

    generateCallId() {
        return `call_${this.userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getConnectionQuality() {
        if (!this.peerConnection) return 'unknown';
        
        const state = this.peerConnection.connectionState;
        const iceState = this.peerConnection.iceConnectionState;
        
        if (state === 'connected' && iceState === 'connected') {
            return 'excellent';
        } else if (state === 'connected') {
            return 'good';
        } else if (state === 'connecting') {
            return 'fair';
        } else {
            return 'poor';
        }
    }

    // Hence Enhancement: Update partner state in UI
    updatePartnerState(stateData) {
        const { connectionState, voiceState } = stateData;
        
        // Update partner voice indicator if we're in a call
        if (this.isInCall && connectionState === 'connected') {
            const partnerVoiceIndicator = document.getElementById('partnerVoice');
            if (partnerVoiceIndicator) {
                partnerVoiceIndicator.classList.remove('muted', 'unmuted', 'speaking');
                partnerVoiceIndicator.classList.add(voiceState);
            }
        }
    }

    initializeElements() {
        // Main interface elements
        this.findPartnerBtn = document.getElementById('findPartnerBtn');
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

        // Hence Enhancement: New UI elements
        this.onlineCount = document.getElementById('onlineCount');
        this.userInfo = document.getElementById('user-info');
        
        // Footer navigation elements
        this.footerNav = document.querySelector('.footer-nav');
        this.navItems = document.querySelectorAll('.nav-item');
        
        // Preferences drawer elements
        this.preferencesDrawer = document.getElementById('preferencesDrawer');
        this.closeDrawer = document.getElementById('closeDrawer');
        this.resetOnboardingBtn = document.getElementById('resetOnboardingBtn');
        
        // History section elements
        this.historySection = document.getElementById('historySection');
        this.historyBtn = document.getElementById('historyBtn');
        this.closeHistory = document.getElementById('closeHistory');
        this.historyBody = document.getElementById('historyBody');
        
        // Info section elements
        this.infoSection = document.getElementById('infoSection');
        this.closeInfo = document.getElementById('closeInfo');
        
        // Connection state elements
        this.connectionState = document.getElementById('connectionState');
        this.userAvatar = document.getElementById('userAvatar');
        this.partnerAvatar = document.getElementById('partnerAvatar');
        this.userVoice = document.getElementById('userVoice');
        this.partnerVoice = document.getElementById('partnerVoice');

        console.log('🎯 Elements initialized:', {
            findPartnerBtn: !!this.findPartnerBtn,
            footerNav: !!this.footerNav,
            preferencesDrawer: !!this.preferencesDrawer,
            historySection: !!this.historySection,
            onlineCount: !!this.onlineCount
        });
    }

    bindEvents() {
        // Core button events
        if (this.findPartnerBtn) {
            this.findPartnerBtn.addEventListener('click', () => this.joinQueue());
        }

        if (this.muteBtn) {
            this.muteBtn.addEventListener('click', () => this.toggleMute());
        }

        if (this.endCallBtn) {
            this.endCallBtn.addEventListener('click', () => this.endCall());
        }

        if (this.retryBtn) {
            this.retryBtn.addEventListener('click', () => {
                this.showInterface('main');
                this.initializeWebRTC();
            });
        }

        // Hence Enhancement: Footer navigation events
        if (this.navItems) {
            this.navItems.forEach(item => {
                item.addEventListener('click', (e) => {
                    const section = e.currentTarget.dataset.section;
                    this.handleNavigation(section);
                });
            });
        }

        // Preferences drawer events
        if (this.closeDrawer) {
            this.closeDrawer.addEventListener('click', () => {
                this.closePreferencesDrawer();
            });
        }

        if (this.resetOnboardingBtn) {
            this.resetOnboardingBtn.addEventListener('click', () => {
                console.log('🔄 Resetting onboarding...');
                // Clear all stored data
                localStorage.removeItem('hence_user_id');
                localStorage.removeItem('hence_user_type');
                localStorage.removeItem('hence_display_name');
                localStorage.removeItem('hence_onboarding_complete');
                window.location.href = '/onboarding';
            });
        }

        // History section events
        if (this.closeHistory) {
            this.closeHistory.addEventListener('click', () => {
                this.closeHistorySection();
            });
        }

        // Info section events
        if (this.closeInfo) {
            this.closeInfo.addEventListener('click', () => {
                this.closeInfoSection();
            });
        }

        // Cancel queue button (event delegation)
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.cancel-queue-btn');
            if (btn) {
                this.leaveQueue();
                this.showInterface('main');
            }
        });

        // Handle drawer outside clicks
        if (this.preferencesDrawer) {
            this.preferencesDrawer.addEventListener('click', (e) => {
                if (e.target === this.preferencesDrawer) {
                    this.closePreferencesDrawer();
                }
            });
        }

        console.log('🎯 Events bound successfully');
    }

    // Hence Enhancement: Navigation handler
    handleNavigation(section) {
        console.log('🧭 Navigation:', section);
        
        // Update active state
        this.navItems.forEach(item => {
            item.classList.remove('active');
            if (item.dataset.section === section) {
                item.classList.add('active');
            }
        });

        switch (section) {
            case 'connect':
                this.showInterface('main');
                this.closeAllDrawers();
                break;
            case 'preferences':
                this.openPreferencesDrawer();
                break;
            case 'history':
                if (this.isVerified) {
                    this.openHistorySection();
                } else {
                    this.showError('History is only available for profile users. Please create a profile to access this feature.', false);
                }
                break;
            case 'info':
                this.openInfoSection();
                break;
            default:
                console.warn('Unknown navigation section:', section);
        }
    }

    // Hence Enhancement: Preferences drawer methods
    openPreferencesDrawer() {
        if (this.preferencesDrawer) {
            this.preferencesDrawer.classList.add('open');
            this.preferencesDrawer.setAttribute('aria-hidden', 'false');
            
            // Load user preferences if verified
            if (this.isVerified) {
                this.loadUserPreferences();
            }
        }
    }

    closePreferencesDrawer() {
        if (this.preferencesDrawer) {
            this.preferencesDrawer.classList.remove('open');
            this.preferencesDrawer.setAttribute('aria-hidden', 'true');
        }
    }

    // Hence Enhancement: History section methods
    openHistorySection() {
        if (this.historySection) {
            this.historySection.classList.add('open');
            this.historySection.style.display = 'block';
            this.historySection.setAttribute('aria-hidden', 'false');
            
            // Load call history
            this.loadCallHistory();
        }
    }

    closeHistorySection() {
        if (this.historySection) {
            this.historySection.classList.remove('open');
            this.historySection.style.display = 'none';
            this.historySection.setAttribute('aria-hidden', 'true');
        }
    }

    // Hence Enhancement: Info section methods
    openInfoSection() {
        if (this.infoSection) {
            this.infoSection.classList.add('open');
            this.infoSection.style.display = 'block';
            this.infoSection.setAttribute('aria-hidden', 'false');
        }
    }

    closeInfoSection() {
        if (this.infoSection) {
            this.infoSection.classList.remove('open');
            this.infoSection.style.display = 'none';
            this.infoSection.setAttribute('aria-hidden', 'true');
        }
    }

    closeAllDrawers() {
        this.closePreferencesDrawer();
        this.closeHistorySection();
        this.closeInfoSection();
    }

    // Hence Enhancement: Load user preferences
    loadUserPreferences() {
        const verifiedSection = document.getElementById('verifiedSection');
        if (verifiedSection && this.isVerified) {
            verifiedSection.style.display = 'block';
            
            // Populate with current user data
            const displayNameInput = document.getElementById('displayNameInput');
            if (displayNameInput && this.displayName) {
                displayNameInput.value = this.displayName;
            }
        }
    }

    // Hence Enhancement: Load call history
    async loadCallHistory() {
        if (!this.isVerified || !this.historyBody) return;

        try {
            this.historyBody.innerHTML = '<p class="loading-text">Loading history...</p>';

            // For now, show placeholder - this will be enhanced when backend is integrated
            this.historyBody.innerHTML = `
                <div class="history-placeholder">
                    <p>Call history will appear here once you complete voice calls.</p>
                    <p style="font-size: 0.875rem; color: rgba(255, 255, 255, 0.5); margin-top: 1rem;">
                        This feature tracks your call duration, connection quality, and partners (when applicable).
                    </p>
                </div>
            `;

        } catch (error) {
            console.error('❌ Failed to load call history:', error);
            this.historyBody.innerHTML = '<p class="error-text">Failed to load history. Please try again later.</p>';
        }
    }

    // Enhanced UI update methods
    updateUserInfo() {
        if (!this.userInfo) return;

        if (this.userType === 'profile' && this.displayName) {
            this.userInfo.textContent = `Welcome, ${this.displayName}`;
        } else if (this.userType === 'anonymous') {
            this.userInfo.textContent = 'Welcome, Anonymous';
        } else {
            this.userInfo.textContent = 'Welcome';
        }
    }

    updateUIForConnectionState(state) {
        const connectBtn = this.findPartnerBtn;
        if (!connectBtn) return;

        // Remove existing state classes
        connectBtn.classList.remove('idle', 'searching', 'matched', 'connected');
        connectBtn.classList.add(state);

        // Update button appearance based on state (no text on Hence circular button)
        switch (state) {
            case 'idle':
                // Button returns to idle pulsing state
                break;
            case 'searching':
                // Button shows searching animation
                break;
            case 'matched':
                // Button shows matched state with glow
                break;
            case 'connected':
                // Button shows connected state
                // Show connection state display
                if (this.connectionState) {
                    this.connectionState.classList.remove('hidden');
                }
                break;
        }
    }

    updateUIForVoiceState(state) {
        const muteBtn = this.muteBtn;
        if (!muteBtn) return;

        // Update mute button appearance
        muteBtn.classList.remove('muted', 'unmuted', 'speaking');
        muteBtn.classList.add(state);

        // Update user voice indicator
        if (this.userVoice) {
            this.userVoice.classList.remove('muted', 'unmuted', 'speaking');
            this.userVoice.classList.add(state);
        }
    }

    // Enhanced interface showing
    showInterface(interfaceName) {
        // Hide all interfaces first
        if (this.callInterface) {
            this.callInterface.style.display = 'none';
            this.callInterface.setAttribute('aria-hidden', 'true');
        }
        if (this.loadingInterface) {
            this.loadingInterface.style.display = 'none';
            this.loadingInterface.setAttribute('aria-hidden', 'true');
        }
        if (this.errorInterface) {
            this.errorInterface.style.display = 'none';
            this.errorInterface.setAttribute('aria-hidden', 'true');
        }

        // Hide connection state display
        if (this.connectionState) {
            this.connectionState.classList.add('hidden');
        }

        // Close any open drawers/sections
        this.closeAllDrawers();

        const mainContent = document.querySelector('.main-content');
        switch (interfaceName) {
            case 'main':
                if (mainContent) {
                    mainContent.style.display = 'flex';
                }
                console.log('🔙 Showing main interface');
                this.updateUserInfo();
                break;
            case 'waiting':
                if (mainContent) mainContent.style.display = 'flex';
                if (this.loadingInterface) {
                    this.loadingInterface.style.display = 'flex';
                    this.loadingInterface.setAttribute('aria-hidden', 'false');
                    if (this.loadingText) {
                        this.loadingText.textContent = 'Finding partner...';
                    }
                }
                console.log('⏳ Showing waiting interface');
                break;
            case 'call':
                if (mainContent) mainContent.style.display = 'none';
                if (this.callInterface) {
                    this.callInterface.style.display = 'flex';
                    this.callInterface.setAttribute('aria-hidden', 'false');
                }
                console.log('📞 Showing call interface');
                break;
            case 'error':
                if (mainContent) mainContent.style.display = 'flex';
                if (this.errorInterface) {
                    this.errorInterface.style.display = 'flex';
                    this.errorInterface.setAttribute('aria-hidden', 'false');
                }
                console.log('❌ Showing error interface');
                break;
        }
    }

    initializeSocket() {
        console.log('🔌 Initializing Socket.IO connection...');
        console.log('Socket.IO available:', typeof io !== 'undefined');
        
        // Check if Socket.IO is available, with retry mechanism
        const initializeSocketWithRetry = (retryCount = 0) => {
            console.log(`🔍 Checking Socket.IO availability (attempt ${retryCount + 1})...`);
            
            if (typeof io === 'undefined') {
                if (retryCount < 20) { // Try up to 20 times (10 seconds total)
                    console.log(`Socket.IO not available, retrying... (${retryCount + 1}/20)`);
                    setTimeout(() => initializeSocketWithRetry(retryCount + 1), 500);
                    return;
                } else {
                    console.error('❌ Socket.IO not available after retries. Server may not be running.');
                    // Add a small delay before showing error to ensure UI is ready
                    setTimeout(() => {
                        this.showError('Connection failed. Please make sure the server is running.');
                    }, 100);
                    return;
                }
            }

            console.log('✅ Socket.IO is available, attempting connection...');

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
                    // Ensure error interface is hidden on successful connection
                    this.showInterface('main');
                    
                    // Hence Enhancement: Identify user to server
                    if (this.userId) {
                        this.socket.emit('identify-user', {
                            userId: this.userId,
                            userType: this.userType,
                            displayName: this.displayName
                        });
                        console.log('👤 User identified to server:', this.userId);
                    }
                    
                    // Update initial state
                    this.setState('connectionState', 'idle');
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
                    console.log('🎉 match-found event received:', data);
                    this.partnerId = data.partnerId;
                    this.isInitiator = data.isInitiator;
                    
                    // Hence Enhancement: Update state and start call tracking
                    this.setState('connectionState', 'matched');
                    this.startCallTracking(data.partnerId);
                    
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
                    this.endCallTracking('partner_disconnected');
                    this.handlePartnerDisconnection();
                });
                
                this.socket.on('call-ended', () => {
                    console.log('Call ended by partner');
                    this.endCallTracking('partner_ended');
                    this.handlePartnerDisconnection();
                });
                
                this.socket.on('partner-skipped', () => {
                    console.log('Partner skipped');
                    this.endCallTracking('partner_skipped');
                    this.handlePartnerDisconnection();
                });
                
                this.socket.on('return-to-queue', () => {
                    console.log('Returning to queue');
                    this.isInCall = false;
                    this.setState('connectionState', 'searching');
                    this.showInterface('waiting');
                    this.partnerId = null;
                });
                
                this.socket.on('online-count', (data) => {
                    console.log(`📊 Online users: ${data.count}`);
                    if (this.onlineCount) {
                        this.onlineCount.textContent = data.count;
                    }
                });

                // Hence Enhancement: Handle partner voice activity
                this.socket.on('partner-voice-activity', (data) => {
                    console.log('🗣️ Partner voice activity:', data);
                    if (this.partnerVoice) {
                        this.partnerVoice.classList.remove('speaking', 'muted', 'unmuted');
                        this.partnerVoice.classList.add(data.isActive ? 'speaking' : 'unmuted');
                    }
                });
                
                // Hence Enhancement: Handle user state changes from other users
                this.socket.on('user-state-changed', (data) => {
                    console.log('👥 User state changed:', data);
                    // This can be used to update UI based on partner states
                    // For privacy, we only act on our partner's state changes
                    if (data.userId === this.partnerId) {
                        this.updatePartnerState(data);
                    }
                });
                
            } catch (error) {
                console.error('❌ Error initializing socket:', error);
                this.showError('Failed to connect to server. Please refresh the page.');
            }
        };

        // Start the initialization process
        initializeSocketWithRetry();
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
                    console.log(` ICE state changed: ${last.iceConnectionState} → ${stats.iceConnectionState}`);
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
            this.showInterface('error');
            
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
        const heroSection = document.getElementById('heroSection');
        switch (interfaceName) {
            case 'main':
                if (heroSection) {
                    heroSection.style.display = '';
                    heroSection.style.visibility = 'visible';
                    heroSection.removeAttribute('aria-hidden');
                }
                console.log('🔙 Showing main interface (hero section)');
                this.updateUserInfo();
                break;
            case 'waiting':
                if (heroSection) heroSection.style.display = 'none';
                if (this.loadingInterface) {
                    this.loadingInterface.style.display = 'flex';
                    if (this.loadingText) {
                        this.loadingText.textContent = 'Finding partner...';
                    }
                    // Attach cancel button handler every time
                    const cancelBtn = document.getElementById('cancelQueueBtn');
                    if (cancelBtn) {
                        cancelBtn.onclick = () => {
                            this.leaveQueue();
                            this.showInterface('main');
                        };
                    }
                }
                break;
            case 'call':
                if (heroSection) heroSection.style.display = 'none';
                if (this.callInterface) {
                    this.callInterface.style.display = 'flex';
                }
                break;
        }
    }

    async joinQueue() {
        console.log('🚦 joinQueue called');
        console.log('📊 Pre-flight check:', {
            webrtcInitialized: this.webrtcInitialized,
            localStream: !!this.localStream,
            socket: !!this.socket,
            socketConnected: this.socket?.connected,
            isInQueue: this.isInQueue,
            isInCall: this.isInCall
        });
        
        // Prevent multiple simultaneous queue joins
        if (this.isInQueue || this.isInCall) {
            console.log('⚠️ Already in queue or call, ignoring joinQueue request');
            return;
        }
        
        // Initialize WebRTC on first user interaction
        if (!this.webrtcInitialized) {
            console.log('🎤 Initializing WebRTC...');
            try {
                await this.initializeWebRTC();
                this.webrtcInitialized = true;
                console.log('✅ WebRTC initialized successfully');
            } catch (error) {
                console.error('❌ Failed to initialize WebRTC:', error);
                this.showError('Microphone access required. Please allow microphone access and try again.', true);
                return;
            }
        }

        if (!this.localStream) {
            console.error('❌ No local stream available after WebRTC init');
            this.showError('Microphone access required. Please refresh and allow access.', true);
            return;
        }

        if (!this.socket) {
            console.error('❌ Socket not available');
            this.showError('Not connected to server. Please refresh the page.', true);
            return;
        }
        
        if (!this.socket.connected) {
            console.error('❌ Socket not connected');
            this.showError('Connection lost. Please refresh the page.', true);
            return;
        }

        console.log('🚀 All checks passed, joining queue...');
        this.isInQueue = true;
        this.userInitiatedConnection = true; // Set flag for user-initiated connection
        
        // Hence Enhancement: Update state and UI
        this.setState('connectionState', 'searching');
        this.updateUIForConnectionState('searching');
        
        this.showInterface('waiting');
        
        // Join the real queue
        this.socket.emit('join-queue');
        console.log('📤 join-queue event emitted');
    }

    leaveQueue() {
        console.log('🚪 leaveQueue called');
        this.isInQueue = false;
        this.userInitiatedConnection = false; // Reset flag
        
        // Hence Enhancement: Update state and UI
        this.setState('connectionState', 'idle');
        this.updateUIForConnectionState('idle');
        
        if (this.socket) {
            this.socket.emit('leave-queue');
        }
        this.showInterface('main');
    }

    async connectToPeer() {
        this.isInQueue = false;
        this.isInCall = true;
        
        // Hence Enhancement: Update state to connected
        this.setState('connectionState', 'connected');
        this.updateUIForConnectionState('connected');
        
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
        
        // Background sounds removed for freemium version
        
        // End analytics session
        if (this.analyticsManager && this.preferencesManager?.isAnalyticsAllowed()) {
            this.analyticsManager.endSession();
            console.log('📊 Analytics session ended due to disconnection');
        }
        
        // Don't reinitialize WebRTC here - let user trigger it
        this.webrtcInitialized = false;
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
        
        // Hence Enhancement: Update voice state
        this.setState('voiceState', this.isMuted ? 'muted' : 'unmuted');
        this.updateUIForVoiceState(this.isMuted ? 'muted' : 'unmuted');
        
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
        
        // Don't reinitialize WebRTC here - let user trigger it
        this.webrtcInitialized = false;
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
        
        // Don't reinitialize WebRTC here - let user trigger it
        this.webrtcInitialized = false;
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
        if (window.soundManager) {
            this.soundManager = window.soundManager;
            console.log('🎵 Sound system initialized');
        } else {
            console.warn('Sound manager not available');
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
        this.preferencesManager = new PreferencesManager();
        this.preferencesManager.init();
        console.log('⚙️ Preferences initialized');
    }

    // Initialize preferences button and overlay
    initializePreferencesUI() {
        // Preferences overlay is not present in the UI, so skip this entirely
        return;
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
        if (!this.cachedElements || !(this.cachedElements instanceof Map)) this.cachedElements = new Map();
        if (!this.cachedElements.has(id)) {
            const el = document.getElementById(id);
            if (el) this.cachedElements.set(id, el);
            else return null;
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
                    // Only set aria-hidden if no focusable elements are present
                    const focusableElements = element.querySelectorAll('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
                    if (focusableElements.length === 0) {
                        element.setAttribute('aria-hidden', 'true');
                    } else {
                        element.removeAttribute('aria-hidden');
                    }
                }
            });
            
            switch (interfaceName) {
                case 'main':
                    // Show the main hero section
                    const heroSection = this.getCachedElement('heroSection');
                    if (heroSection) {
                        heroSection.style.display = '';
                        heroSection.removeAttribute('aria-hidden');
                    }
                    console.log('🔙 Showing main interface (hero section)');
                    this.updateUserInfo();
                    break;
                case 'waiting':
                    const loadingElement = this.getCachedElement('loadingInterface');
                    if (loadingElement) {
                        loadingElement.style.display = 'flex';
                        loadingElement.removeAttribute('aria-hidden');
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
                        callElement.removeAttribute('aria-hidden');
                    }
                    break;
                case 'error':
                    const errorElement = this.getCachedElement('errorInterface');
                    if (errorElement) {
                        errorElement.style.display = 'flex';
                        errorElement.removeAttribute('aria-hidden');
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

    // Render background sounds in the sound panel
    renderBackgroundSounds() {
        const soundList = document.getElementById('soundList');
        const emptyState = document.getElementById('soundEmptyState');
        if (!soundList || !window.soundManager) return;
        
        soundList.innerHTML = '';
        const allSounds = window.soundManager.getAvailableSounds();
        
        if (!allSounds || allSounds.length === 0) {
            if (emptyState) emptyState.style.display = '';
            return;
        } else {
            if (emptyState) emptyState.style.display = 'none';
        }
        
        // Get all categories
        const categories = Array.from(new Set(Object.values(window.soundManager.sounds).map(s => s.category)));
        
        // Render category filter if more than one
        let selectedCategory = this.selectedSoundCategory || 'all';
        if (categories.length > 1) {
            const filterBar = document.createElement('div');
            filterBar.className = 'sound-filter-bar';
            filterBar.innerHTML = `<button class="sound-filter-btn${selectedCategory==='all'?' active':''}" data-category="all">All</button>` +
                categories.map(cat => `<button class="sound-filter-btn${selectedCategory===cat?' active':''}" data-category="${cat}">${cat.charAt(0).toUpperCase()+cat.slice(1)}</button>`).join('');
            soundList.appendChild(filterBar);
            
            filterBar.querySelectorAll('.sound-filter-btn').forEach(btn => {
                btn.addEventListener('click', e => {
                    this.selectedSoundCategory = btn.getAttribute('data-category');
                    this.renderBackgroundSounds();
                });
            });
        }
        
        // Filter sounds by category
        const soundsToShow = selectedCategory==='all' ? allSounds : allSounds.filter(s => window.soundManager.sounds[s.id].category === selectedCategory);
        
        // Render each sound as a card
        soundsToShow.forEach(sound => {
            const meta = window.soundManager.sounds[sound.id];
            const isPlaying = window.soundManager.activeSounds.has(sound.id);
            const isPremiumSound = meta.category !== 'basic';
            const card = document.createElement('div');
            card.className = 'sound-card' + (isPlaying ? ' playing' : '') + (isPremiumSound ? ' premium-sound' : '');
            card.setAttribute('tabindex', '0');
            card.setAttribute('aria-label', `${meta.name}: ${meta.description}`);
            card.innerHTML = `
                <div class="sound-icon">${this.getSoundIcon(meta.icon, sound.id)}</div>
                <div class="sound-info">
                    <div class="sound-title">
                        ${meta.name}
                        ${isPremiumSound ? '<span class="premium-badge">💎</span>' : ''}
                    </div>
                    <div class="sound-desc">${meta.description || ''}</div>
                </div>
                <button class="sound-toggle-btn" aria-label="${isPlaying ? 'Pause' : 'Play'} ${meta.name}" data-sound="${sound.id}">
                    <span class="sound-toggle-icon">${isPlaying ? '⏸️' : '▶️'}</span>
                </button>
                <input type="range" class="sound-volume-slider" data-sound="${sound.id}" min="0" max="100" value="${Math.round(sound.volume * 100)}" aria-label="${meta.name} volume">
                <div class="sound-status" aria-live="polite"></div>
            `;
            soundList.appendChild(card);
        });
        
        // Add event listeners for play/pause and volume
        soundList.querySelectorAll('.sound-toggle-btn').forEach(btn => {
            btn.addEventListener('click', async e => {
                const soundId = btn.getAttribute('data-sound');
                try {
                    await window.soundManager.resumeAudioContext(); // Ensure audio context is active
                    await window.soundManager.toggleSound(soundId);
                    setTimeout(() => this.renderBackgroundSounds(), 300); // Refresh UI after play state change
                } catch (err) {
                    const card = btn.closest('.sound-card');
                    if (err.message.includes('Premium subscription required')) {
                        // Show premium upgrade prompt
                        this.showPremiumUpgradePrompt();
                    } else {
                        if (card) card.querySelector('.sound-status').textContent = 'Failed to play';
                    }
                    console.error('Failed to toggle sound:', err);
                }
            });
        });
        
        soundList.querySelectorAll('.sound-volume-slider').forEach(slider => {
            slider.addEventListener('input', e => {
                const soundId = slider.getAttribute('data-sound');
                window.soundManager.setSoundVolume(soundId, slider.value / 100);
            });
        });
    }

    getSoundIcon(icon, fallbackId) {
        // Use emoji for now, can be replaced with SVGs
        const icons = {
            ocean: '🌊',
            rain: '🌧️',
            whiteNoise: '🔊',
            brownNoise: '📻',
            pinkNoise: '📶',
            forest: '🌲',
            fireplace: '🔥',
            cafe: '☕',
            fan: '🌪️',
        };
        return icons[icon] || icons[fallbackId] || '🎵';
    }

    // Sound panel methods
    openSoundPanel() {
        if (this.soundPanel) {
            this.soundPanel.classList.add('active');
            this.soundPanel.setAttribute('aria-hidden', 'false');
            this.renderBackgroundSounds();
        }
    }
    
    closeSoundPanel() {
        if (this.soundPanel) {
            this.soundPanel.classList.remove('active');
            this.soundPanel.setAttribute('aria-hidden', 'true');
        }
    }
    
    showPremiumUpgradePrompt() {
        // Create premium upgrade modal
        const modal = document.createElement('div');
        modal.className = 'premium-modal-overlay';
        modal.innerHTML = `
            <div class="premium-modal">
                <div class="premium-modal-header">
                    <h3>Premium Feature</h3>
                    <button class="modal-close-btn" onclick="this.closest('.premium-modal-overlay').remove()">×</button>
                </div>
                <div class="premium-modal-body">
                    <div class="premium-icon">💎</div>
                    <p>This background sound requires a Premium subscription.</p>
                    <p>Upgrade to access the full library of calming sounds and other premium features.</p>
                    <div class="modal-actions">
                        <button class="premium-upgrade-btn" onclick="window.location.href='/premium'">
                            Upgrade to Premium
                        </button>
                        <button class="modal-cancel-btn" onclick="this.closest('.premium-modal-overlay').remove()">
                            Maybe Later
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (modal.parentElement) {
                modal.remove();
            }
        }, 10000);
    }

    updateUserInfo() {
        // Update the main interface to show user info
        const userInfoElement = document.getElementById('user-info');
        if (userInfoElement) {
            const displayName = localStorage.getItem('hence_display_name');
            const userType = localStorage.getItem('hence_user_type');
            if (displayName && userType === 'profile') {
                userInfoElement.textContent = `Welcome, ${displayName}`;
            } else {
                userInfoElement.textContent = 'Welcome, Anonymous';
            }
        }
    }
}

// Global functions for UI interactions
function showProfile() {
    window.location.href = '/auth.html';
}

function showAnalytics() {
    window.location.href = '/analytics.html';
}

function upgradePremium() {
    window.location.href = '/premium';
}

function logout() {
    localStorage.removeItem('hence_auth_token');
    localStorage.removeItem('hence_user_id');
    localStorage.removeItem('hence_user_type');
    localStorage.removeItem('hence_display_name');
    localStorage.removeItem('hence_onboarding_complete');
    window.location.href = '/auth.html';
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
    alert('Premium features are disabled in this freemium version. Focus on core WebRTC voice calling features!');
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
    console.log('🌙 Initializing Co-Sleep App...');
    console.log('📋 DOM Elements Check:', {
        heroSection: !!document.getElementById('heroSection'),
        findPartnerBtn: !!document.getElementById('findPartnerBtn'),
        userInfo: !!document.getElementById('user-info'),
        loadingInterface: !!document.getElementById('loadingInterface'),
        callInterface: !!document.getElementById('callInterface'),
        errorInterface: !!document.getElementById('errorInterface')
    });
    
    try {
        window.coSleepApp = new CoSleepApp();
        window.app = window.coSleepApp; // Alias for debugging
        console.log('✅ Co-Sleep App initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize Co-Sleep App:', error);
        
        // Show fallback error message
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #ff4757;
            color: white;
            padding: 2rem;
            border-radius: 8px;
            z-index: 10000;
            text-align: center;
            font-family: Inter, sans-serif;
        `;
        errorDiv.innerHTML = `
            <h3>App Initialization Failed</h3>
            <p>Please refresh the page or contact support.</p>
            <button onclick="window.location.reload()" style="
                background: white;
                color: #ff4757;
                border: none;
                padding: 0.5rem 1rem;
                border-radius: 4px;
                margin-top: 1rem;
                cursor: pointer;
            ">Refresh Page</button>
        `;
        document.body.appendChild(errorDiv);
    }
    
    // Handle page unload
    window.addEventListener('beforeunload', () => {
        if (window.coSleepApp && typeof window.coSleepApp.handlePageUnload === 'function') {
            window.coSleepApp.handlePageUnload();
        }
    });
});

// Handle connection state changes
window.addEventListener('online', () => {
    console.log('Connection restored');
});

window.addEventListener('offline', () => {
    console.log('Connection lost');
});

// Background Sound functionality removed for freemium version
// Focus on core WebRTC voice calling features
