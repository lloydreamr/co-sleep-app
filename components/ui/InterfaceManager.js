/**
 * Interface Manager - Centralized UI state management
 * Handles all interface transitions and UI updates
 */
export class InterfaceManager {
    constructor() {
        this.currentInterface = 'main';
        this.elements = new Map();
        this.animationQueue = [];
        this.isTransitioning = false;
        
        // UI performance tracking
        this.renderStats = {
            totalUpdates: 0,
            fastUpdates: 0,
            slowUpdates: 0,
            averageRenderTime: 0
        };
    }
    
    initialize() {
        this.cacheElements();
        this.setupInitialState();
        console.log('🎨 InterfaceManager initialized');
    }
    
    cacheElements() {
        // Cache frequently accessed elements
        const elementSelectors = {
            // Main interfaces
            mainInterface: '#heroSection',
            loadingInterface: '#loadingInterface',
            callInterface: '#callInterface',
            errorInterface: '#errorInterface',
            
            // Main components
            findPartnerBtn: '#findPartnerBtn',
            muteBtn: '#muteBtn',
            endCallBtn: '#endCallBtn',
            
            // Status elements
            onlineCount: '#onlineCount',
            connectionState: '#connectionState',
            statusText: '#statusText',
            errorText: '#errorText',
            loadingText: '#loadingText',
            
            // Navigation
            footerNav: '.footer-nav',
            navItems: '.nav-item',
            
            // Drawers and modals
            preferencesDrawer: '#preferencesDrawer',
            historySection: '#historySection',
            infoSection: '#infoSection',
            
            // User elements
            userInfo: '#user-info',
            userAvatar: '#userAvatar',
            partnerAvatar: '#partnerAvatar',
            userVoice: '#userVoice',
            partnerVoice: '#partnerVoice'
        };
        
        for (const [key, selector] of Object.entries(elementSelectors)) {
            const element = document.querySelector(selector);
            if (element) {
                this.elements.set(key, element);
                element.setAttribute('data-hence-cached', 'true');
            } else {
                console.warn(`⚠️ Element not found: ${selector}`);
            }
        }
        
        console.log(`📦 Cached ${this.elements.size} UI elements`);
    }
    
    getElement(key) {
        return this.elements.get(key);
    }
    
    setupInitialState() {
        // Hide all interfaces except main
        this.hideAllInterfaces();
        this.showInterface('main');
        
        // Set up initial UI state
        this.updateOnlineCount(0);
        this.updateConnectionState('idle');
    }
    
    hideAllInterfaces() {
        const interfaces = ['loadingInterface', 'callInterface', 'errorInterface'];
        interfaces.forEach(interfaceKey => {
            const element = this.getElement(interfaceKey);
            if (element) {
                element.style.display = 'none';
                element.setAttribute('aria-hidden', 'true');
            }
        });
    }
    
    async showInterface(interfaceName, options = {}) {
        if (this.isTransitioning && !options.force) {
            this.animationQueue.push({ interfaceName, options });
            return;
        }
        
        this.isTransitioning = true;
        const startTime = performance.now();
        
        try {
            console.log(`🎨 Transitioning to ${interfaceName} interface`);
            
            // Hide current interface
            await this.hideCurrentInterface();
            
            // Show new interface
            await this.displayInterface(interfaceName);
            
            this.currentInterface = interfaceName;
            
            // Track performance
            const renderTime = performance.now() - startTime;
            this.trackRenderPerformance(renderTime);
            
        } catch (error) {
            console.error('❌ Interface transition failed:', error);
        } finally {
            this.isTransitioning = false;
            this.processAnimationQueue();
        }
    }
    
    async hideCurrentInterface() {
        const currentElement = this.getCurrentInterfaceElement();
        if (currentElement) {
            currentElement.style.display = 'none';
            currentElement.setAttribute('aria-hidden', 'true');
        }
    }
    
    async displayInterface(interfaceName) {
        switch (interfaceName) {
            case 'main':
                await this.showMainInterface();
                break;
            case 'waiting':
                await this.showWaitingInterface();
                break;
            case 'call':
                await this.showCallInterface();
                break;
            case 'error':
                await this.showErrorInterface();
                break;
            default:
                console.warn(`Unknown interface: ${interfaceName}`);
        }
    }
    
    async showMainInterface() {
        const heroSection = this.getElement('mainInterface');
        if (heroSection) {
            heroSection.style.display = '';
            heroSection.style.visibility = 'visible';
            heroSection.removeAttribute('aria-hidden');
        }
        
        // Update user info
        this.updateUserInfo();
    }
    
    async showWaitingInterface() {
        const loadingInterface = this.getElement('loadingInterface');
        const loadingText = this.getElement('loadingText');
        
        if (loadingInterface) {
            loadingInterface.style.display = 'flex';
            loadingInterface.removeAttribute('aria-hidden');
        }
        
        if (loadingText) {
            loadingText.textContent = 'Finding partner...';
        }
        
        // Set up cancel button
        this.setupCancelButton();
    }
    
    async showCallInterface() {
        const callInterface = this.getElement('callInterface');
        
        if (callInterface) {
            callInterface.style.display = 'flex';
            callInterface.removeAttribute('aria-hidden');
        }
        
        // Show connection state
        this.showConnectionState();
    }
    
    async showErrorInterface() {
        const errorInterface = this.getElement('errorInterface');
        
        if (errorInterface) {
            errorInterface.style.display = 'flex';
            errorInterface.removeAttribute('aria-hidden');
        }
    }
    
    getCurrentInterfaceElement() {
        switch (this.currentInterface) {
            case 'main':
                return this.getElement('mainInterface');
            case 'waiting':
                return this.getElement('loadingInterface');
            case 'call':
                return this.getElement('callInterface');
            case 'error':
                return this.getElement('errorInterface');
            default:
                return null;
        }
    }
    
    setupCancelButton() {
        // This is handled by the EventManager through delegation
        // Just ensure the button is visible and accessible
        const cancelBtn = document.getElementById('cancelQueueBtn');
        if (cancelBtn) {
            cancelBtn.style.display = 'block';
            cancelBtn.removeAttribute('disabled');
        }
    }
    
    showConnectionState() {
        const connectionState = this.getElement('connectionState');
        if (connectionState) {
            connectionState.classList.remove('hidden');
            connectionState.style.display = 'block';
        }
    }
    
    // State update methods
    updateInterface(state) {
        const { connectionState, currentInterface } = state;
        
        // Update interface based on connection state
        if (currentInterface && currentInterface !== this.currentInterface) {
            this.showInterface(currentInterface);
        }
        
        // Update UI elements based on state
        this.updateConnectionState(connectionState);
        this.updateVoiceState(state.voiceState);
        
        if (state.isInQueue) {
            this.updateQueueState();
        }
        
        if (state.isInCall) {
            this.updateCallState();
        }
    }
    
    updateConnectionState(state) {
        const connectBtn = this.getElement('findPartnerBtn');
        if (!connectBtn) return;
        
        // Remove existing state classes
        connectBtn.classList.remove('idle', 'searching', 'matched', 'connected');
        connectBtn.classList.add(state);
        
        // Update button appearance based on state
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
                this.showConnectionState();
                break;
        }
    }
    
    updateVoiceState(state) {
        const muteBtn = this.getElement('muteBtn');
        const userVoice = this.getElement('userVoice');
        
        if (muteBtn) {
            muteBtn.classList.remove('muted', 'unmuted', 'speaking');
            muteBtn.classList.add(state);
        }
        
        if (userVoice) {
            userVoice.classList.remove('muted', 'unmuted', 'speaking');
            userVoice.classList.add(state);
        }
    }
    
    updateOnlineCount(count) {
        const onlineCount = this.getElement('onlineCount');
        if (onlineCount) {
            onlineCount.textContent = count.toString();
        }
    }
    
    updateUserInfo() {
        const userInfo = this.getElement('userInfo');
        if (!userInfo) return;
        
        const userType = localStorage.getItem('hence_user_type');
        const displayName = localStorage.getItem('hence_display_name');
        
        if (userType === 'profile' && displayName) {
            userInfo.textContent = `Welcome, ${displayName}`;
        } else if (userType === 'anonymous') {
            userInfo.textContent = 'Welcome, Anonymous';
        } else {
            userInfo.textContent = 'Welcome';
        }
    }
    
    updateQueueState() {
        // Additional queue-specific UI updates
        this.updateConnectionState('searching');
    }
    
    updateCallState() {
        // Additional call-specific UI updates
        this.updateConnectionState('connected');
    }
    
    // Error handling
    showError(message, isRecoverable = true) {
        console.error('❌ Error:', message);
        
        const errorText = this.getElement('errorText');
        if (errorText) {
            errorText.textContent = message;
        }
        
        this.showInterface('error');
        
        // Show/hide retry button based on recoverability
        const retryBtn = document.getElementById('retryBtn');
        if (retryBtn) {
            retryBtn.style.display = isRecoverable ? 'block' : 'none';
        }
    }
    
    showSuccess(message, duration = 3000) {
        this.showToast(message, 'success', duration);
    }
    
    showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'success' ? '#48bb78' : type === 'error' ? '#f56565' : '#4299e1'};
            color: white;
            padding: 1rem 2rem;
            border-radius: 8px;
            font-size: 0.9rem;
            z-index: 1000;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
            animation: slideInDown 0.3s ease-out;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOutUp 0.3s ease-in forwards';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
    
    // Performance tracking
    trackRenderPerformance(renderTime) {
        this.renderStats.totalUpdates++;
        
        if (renderTime < 16) { // 60fps threshold
            this.renderStats.fastUpdates++;
        } else {
            this.renderStats.slowUpdates++;
        }
        
        // Update average
        this.renderStats.averageRenderTime = 
            (this.renderStats.averageRenderTime * (this.renderStats.totalUpdates - 1) + renderTime) 
            / this.renderStats.totalUpdates;
    }
    
    processAnimationQueue() {
        if (this.animationQueue.length > 0) {
            const next = this.animationQueue.shift();
            this.showInterface(next.interfaceName, next.options);
        }
    }
    
    getRenderStats() {
        return {
            ...this.renderStats,
            queueLength: this.animationQueue.length,
            cachedElements: this.elements.size
        };
    }
    
    // Cleanup
    cleanup() {
        console.log('🧹 InterfaceManager cleanup...');
        
        // Clear animation queue
        this.animationQueue.length = 0;
        
        // Remove cached element markers
        this.elements.forEach(element => {
            element.removeAttribute('data-hence-cached');
        });
        
        this.elements.clear();
        
        console.log('✅ InterfaceManager cleanup completed');
    }
} 