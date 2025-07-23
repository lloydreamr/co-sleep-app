/**
 * Main App Controller - Coordinates all components
 * Replaces the monolithic CoSleepApp class
 */
import { StateManager } from './StateManager.js';
import { EventManager } from './EventManager.js';
import { WebRTCManager } from '../webrtc/WebRTCManager.js';
import { SocketManager } from '../utils/SocketManager.js';
import { InterfaceManager } from '../ui/InterfaceManager.js';
import { MemoryManager } from '../utils/MemoryManager.js';

export class App {
    constructor() {
        console.log('🚀 Hence App initializing...');
        
        // Initialize core managers
        this.memoryManager = new MemoryManager();
        this.stateManager = new StateManager();
        this.eventManager = new EventManager();
        this.interfaceManager = new InterfaceManager();
        this.socketManager = new SocketManager();
        this.webrtcManager = new WebRTCManager();
        
        // Core state properties
        this.isInitialized = false;
        this.userId = localStorage.getItem('hence_user_id');
        this.userType = localStorage.getItem('hence_user_type');
        this.displayName = localStorage.getItem('hence_display_name');
        this.isVerified = this.userType === 'profile' && this.displayName;
        
        this.initialize();
    }
    
    async initialize() {
        try {
            // Initialize in proper order
            await this.initializeCore();
            await this.initializeManagers();
            await this.setupEventListeners();
            await this.startServices();
            
            this.isInitialized = true;
            console.log('✅ Hence App initialized successfully');
            
        } catch (error) {
            console.error('❌ App initialization failed:', error);
            this.handleInitializationError(error);
        }
    }
    
    async initializeCore() {
        // Initialize memory management first
        this.memoryManager.initialize();
        
        // Initialize state management
        this.stateManager.initialize({
            userId: this.userId,
            userType: this.userType,
            displayName: this.displayName,
            isVerified: this.isVerified
        });
        
        // Initialize UI
        this.interfaceManager.initialize();
    }
    
    async initializeManagers() {
        // Initialize WebRTC manager
        await this.webrtcManager.initialize();
        
        // Initialize Socket manager
        await this.socketManager.initialize(this.userId);
        
        // Set up cross-manager communication
        this.setupManagerCommunication();
    }
    
    setupManagerCommunication() {
        // State changes trigger UI updates
        this.stateManager.on('stateChange', (state) => {
            this.interfaceManager.updateInterface(state);
        });
        
        // Socket events trigger state changes
        this.socketManager.on('match-found', (data) => {
            this.stateManager.updateConnectionState('matched');
            this.webrtcManager.initiateConnection(data);
        });
        
        // WebRTC events trigger state changes
        this.webrtcManager.on('connectionEstablished', () => {
            this.stateManager.updateConnectionState('connected');
        });
        
        // Memory cleanup on state changes
        this.stateManager.on('cleanup', () => {
            this.memoryManager.performCleanup();
        });
    }
    
    async setupEventListeners() {
        // Global event delegation
        this.eventManager.setupGlobalListeners();
        
        // App-specific events
        this.eventManager.on('findPartner', () => this.startMatching());
        this.eventManager.on('endCall', () => this.endCall());
        this.eventManager.on('toggleMute', () => this.toggleMute());
    }
    
    async startServices() {
        // Start background services
        this.memoryManager.startMonitoring();
        this.stateManager.startActivityTracking();
        
        // Initialize WebRTC capabilities
        await this.webrtcManager.requestPermissions();
    }
    
    // Main app actions
    async startMatching() {
        try {
            this.stateManager.updateConnectionState('searching');
            await this.socketManager.joinQueue();
        } catch (error) {
            console.error('Failed to start matching:', error);
            this.stateManager.updateConnectionState('idle');
        }
    }
    
    async endCall() {
        try {
            this.webrtcManager.endCall();
            this.socketManager.leaveCall();
            this.stateManager.updateConnectionState('idle');
            this.memoryManager.performCleanup();
        } catch (error) {
            console.error('Failed to end call:', error);
        }
    }
    
    toggleMute() {
        const isMuted = this.webrtcManager.toggleMute();
        this.stateManager.updateVoiceState(isMuted ? 'muted' : 'unmuted');
    }
    
    handleInitializationError(error) {
        console.error('Initialization error:', error);
        this.interfaceManager.showError('Failed to initialize app. Please refresh the page.');
    }
    
    // Cleanup method for page unload
    cleanup() {
        console.log('🧹 Cleaning up app...');
        this.memoryManager.cleanup();
        this.stateManager.cleanup();
        this.webrtcManager.cleanup();
        this.socketManager.cleanup();
        this.eventManager.cleanup();
    }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Check onboarding completion first
    const onboardingComplete = localStorage.getItem('hence_onboarding_complete');
    const userId = localStorage.getItem('hence_user_id');
    const userType = localStorage.getItem('hence_user_type');
    
    if (!onboardingComplete || !userId || !userType) {
        console.log('❌ Onboarding not complete, redirecting to /onboarding');
        window.location.href = '/onboarding';
        return;
    }
    
    // Initialize the app
    window.henceApp = new App();
    
    // Handle page unload
    window.addEventListener('beforeunload', () => {
        if (window.henceApp) {
            window.henceApp.cleanup();
        }
    });
}); 