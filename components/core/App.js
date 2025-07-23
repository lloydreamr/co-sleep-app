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
        // Initialize global event delegation first
        this.eventManager.initialize();
        
        // App-specific events - connect EventManager to App methods
        this.eventManager.on('findPartner', () => {
            console.log('🎯 Find Partner event received by App');
            this.startMatching();
        });
        
        this.eventManager.on('endCall', () => {
            console.log('🎯 End Call event received by App');
            this.endCall();
        });
        
        this.eventManager.on('toggleMute', () => {
            console.log('🎯 Toggle Mute event received by App');
            this.toggleMute();
        });
        
        this.eventManager.on('cancelQueue', () => {
            console.log('🎯 Cancel Queue event received by App');
            this.cancelQueue();
        });
        
        console.log('✅ Event listeners connected to App methods');
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
            console.log('🔍 Starting partner matching...');
            this.stateManager.updateConnectionState('searching');
            await this.socketManager.joinQueue();
        } catch (error) {
            console.error('Failed to start matching:', error);
            this.stateManager.updateConnectionState('idle');
        }
    }
    
    async endCall() {
        try {
            console.log('📞 Ending call...');
            this.webrtcManager.endCall();
            this.socketManager.leaveCall();
            this.stateManager.updateConnectionState('idle');
            this.memoryManager.performCleanup();
        } catch (error) {
            console.error('Failed to end call:', error);
        }
    }
    
    async cancelQueue() {
        try {
            console.log('❌ Canceling queue...');
            this.socketManager.leaveQueue();
            this.stateManager.updateConnectionState('idle');
        } catch (error) {
            console.error('Failed to cancel queue:', error);
        }
    }
    
    toggleMute() {
        console.log('🔇 Toggling mute...');
        const isMuted = this.webrtcManager.toggleMute();
        this.stateManager.updateVoiceState(isMuted ? 'muted' : 'unmuted');
        return isMuted;
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