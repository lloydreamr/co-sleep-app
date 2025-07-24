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
        
        this.eventManager.on('navigate', (data) => {
            console.log('🎯 Navigate event received by App:', data.section);
            this.handleNavigation(data);
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
    
    async handleNavigation(data) {
        const { section, element } = data;
        console.log(`🧭 Navigation to ${section} requested`);
        
        try {
            // Update active navigation button
            this.updateActiveNavButton(element);
            
            // Handle different navigation sections
            switch (section) {
                case 'connect':
                    this.showMainInterface();
                    break;
                case 'preferences':
                    this.showPreferencesDrawer();
                    break;
                case 'history':
                    this.showHistorySection();
                    break;
                case 'info':
                    this.showInfoSection();
                    break;
                default:
                    console.warn(`Unknown navigation section: ${section}`);
            }
            
        } catch (error) {
            console.error('❌ Error handling navigation:', error);
            this.interfaceManager.showError('Navigation failed');
        }
    }
    
    updateActiveNavButton(activeElement) {
        // Remove active class from all nav items
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => item.classList.remove('active'));
        
        // Add active class to clicked item
        if (activeElement) {
            activeElement.classList.add('active');
        }
    }
    
    showMainInterface() {
        // Hide all overlays
        this.hideAllOverlays();
        
        // Ensure main interface is visible
        this.interfaceManager.showInterface('main');
        
        console.log('🏠 Main interface shown');
    }
    
    showPreferencesDrawer() {
        const preferencesDrawer = document.getElementById('preferencesDrawer');
        if (preferencesDrawer) {
            preferencesDrawer.style.display = 'block';
            preferencesDrawer.removeAttribute('aria-hidden');
            preferencesDrawer.classList.add('open');
            
            // Set up close button handler
            this.setupCloseHandler('closeDrawer', () => this.hidePreferencesDrawer());
            
            console.log('⚙️ Preferences drawer shown');
        }
    }
    
    hidePreferencesDrawer() {
        const preferencesDrawer = document.getElementById('preferencesDrawer');
        if (preferencesDrawer) {
            preferencesDrawer.classList.remove('open');
            preferencesDrawer.style.display = 'none';
            preferencesDrawer.setAttribute('aria-hidden', 'true');
        }
    }
    
    showHistorySection() {
        // Only show for verified users
        if (!this.isVerified) {
            this.interfaceManager.showToast('History is only available for profile users', 'info');
            return;
        }
        
        const historySection = document.getElementById('historySection');
        if (historySection) {
            historySection.style.display = 'block';
            historySection.removeAttribute('aria-hidden');
            
            // Set up close button handler
            this.setupCloseHandler('closeHistory', () => this.hideHistorySection());
            
            // Load history data (placeholder for now)
            this.loadHistoryData();
            
            console.log('🕐 History section shown');
        }
    }
    
    hideHistorySection() {
        const historySection = document.getElementById('historySection');
        if (historySection) {
            historySection.style.display = 'none';
            historySection.setAttribute('aria-hidden', 'true');
        }
    }
    
    showInfoSection() {
        const infoSection = document.getElementById('infoSection');
        if (infoSection) {
            infoSection.style.display = 'block';
            infoSection.removeAttribute('aria-hidden');
            
            // Set up close button handler
            this.setupCloseHandler('closeInfo', () => this.hideInfoSection());
            
            console.log('ℹ️ Info section shown');
        }
    }
    
    hideInfoSection() {
        const infoSection = document.getElementById('infoSection');
        if (infoSection) {
            infoSection.style.display = 'none';
            infoSection.setAttribute('aria-hidden', 'true');
        }
    }
    
    hideAllOverlays() {
        this.hidePreferencesDrawer();
        this.hideHistorySection();
        this.hideInfoSection();
    }
    
    setupCloseHandler(buttonId, callback) {
        const closeButton = document.getElementById(buttonId);
        if (closeButton) {
            // Remove existing listeners to prevent duplicates
            const newButton = closeButton.cloneNode(true);
            closeButton.parentNode.replaceChild(newButton, closeButton);
            
            // Add new listener
            newButton.addEventListener('click', callback);
        }
    }
    
    loadHistoryData() {
        const historyBody = document.getElementById('historyBody');
        if (historyBody) {
            // Placeholder - in real implementation this would fetch from API
            historyBody.innerHTML = `
                <p class="history-placeholder">No call history available. Complete voice calls to see your history here.</p>
            `;
        }
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