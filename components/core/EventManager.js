/**
 * Event Manager - Centralized event handling and delegation
 * Replaces scattered event listeners with efficient delegation
 */
export class EventManager {
    constructor() {
        this.listeners = new Map();
        this.delegatedEvents = new Map();
        this.globalListeners = new Set();
        this.debounceTimers = new Map();
        this.throttleTimers = new Map();
        
        // Event performance tracking
        this.eventStats = {
            totalEvents: 0,
            delegatedEvents: 0,
            debouncedEvents: 0,
            throttledEvents: 0
        };
    }
    
    initialize() {
        this.setupGlobalListeners();
        console.log('🎯 EventManager initialized');
    }
    
    setupGlobalListeners() {
        // Global click delegation
        this.addGlobalListener('click', this.handleGlobalClick.bind(this));
        
        // Global form handling
        this.addGlobalListener('submit', this.handleGlobalSubmit.bind(this));
        
        // Global input handling with debouncing
        this.addGlobalListener('input', this.debounce(this.handleGlobalInput.bind(this), 300));
        
        // Global keyboard handling
        this.addGlobalListener('keydown', this.handleGlobalKeydown.bind(this));
        
        // Touch events for mobile
        this.addGlobalListener('touchstart', this.handleGlobalTouch.bind(this));
        
        // Window events
        this.addWindowListener('resize', this.throttle(this.handleWindowResize.bind(this), 100));
        this.addWindowListener('beforeunload', this.handleBeforeUnload.bind(this));
        
        console.log('🌐 Global event listeners established');
    }
    
    addGlobalListener(event, handler) {
        document.addEventListener(event, handler, { passive: true });
        this.globalListeners.add({ element: document, event, handler });
    }
    
    addWindowListener(event, handler) {
        window.addEventListener(event, handler, { passive: true });
        this.globalListeners.add({ element: window, event, handler });
    }
    
    // Global event handlers
    handleGlobalClick(event) {
        this.eventStats.totalEvents++;
        this.eventStats.delegatedEvents++;
        
        const target = event.target;
        
        // Handle button clicks with data attributes
        if (target.matches('[data-action]')) {
            event.preventDefault();
            const action = target.dataset.action;
            const data = this.extractDataAttributes(target);
            this.emit(action, { event, target, data });
            return;
        }
        
        // Handle specific button types
        if (target.matches('#findPartnerBtn, .find-partner-btn')) {
            event.preventDefault();
            this.emit('findPartner', { event, target });
        } else if (target.matches('#muteBtn, .mute-btn')) {
            event.preventDefault();
            this.emit('toggleMute', { event, target });
        } else if (target.matches('#endCallBtn, .end-call-btn')) {
            event.preventDefault();
            this.emit('endCall', { event, target });
        } else if (target.matches('.cancel-queue-btn')) {
            event.preventDefault();
            this.emit('cancelQueue', { event, target });
        } else if (target.matches('.nav-item')) {
            event.preventDefault();
            const section = target.dataset.section;
            this.emit('navigate', { event, target, section });
        } else if (target.matches('.close-drawer, .close-modal')) {
            event.preventDefault();
            this.emit('closeDrawer', { event, target });
        } else if (target.matches('.retry-btn')) {
            event.preventDefault();
            this.emit('retry', { event, target });
        }
    }
    
    handleGlobalSubmit(event) {
        this.eventStats.totalEvents++;
        
        const form = event.target;
        const action = form.dataset.action || form.action;
        
        // Prevent default and emit custom event
        event.preventDefault();
        this.emit('formSubmit', { event, form, action });
    }
    
    handleGlobalInput(event) {
        this.eventStats.totalEvents++;
        this.eventStats.debouncedEvents++;
        
        const input = event.target;
        const value = input.value;
        const name = input.name || input.id;
        
        this.emit('inputChange', { event, input, value, name });
    }
    
    handleGlobalKeydown(event) {
        this.eventStats.totalEvents++;
        
        // Handle keyboard shortcuts
        if (event.ctrlKey || event.metaKey) {
            switch (event.key) {
                case 'k':
                    event.preventDefault();
                    this.emit('shortcut:search');
                    break;
                case 'm':
                    event.preventDefault();
                    this.emit('shortcut:mute');
                    break;
                case 'Escape':
                    event.preventDefault();
                    this.emit('shortcut:escape');
                    break;
            }
        }
        
        // Handle escape key
        if (event.key === 'Escape') {
            this.emit('escape', { event });
        }
        
        // Handle enter key in specific contexts
        if (event.key === 'Enter' && event.target.matches('input[type="text"], textarea')) {
            this.emit('enterKey', { event, target: event.target });
        }
    }
    
    handleGlobalTouch(event) {
        this.eventStats.totalEvents++;
        
        // Basic touch handling for mobile responsiveness
        const touch = event.touches[0];
        this.emit('touch', { event, touch, target: event.target });
    }
    
    handleWindowResize(event) {
        this.eventStats.totalEvents++;
        this.eventStats.throttledEvents++;
        
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        this.emit('windowResize', { event, width, height });
    }
    
    handleBeforeUnload(event) {
        this.emit('beforeUnload', { event });
    }
    
    // Utility methods
    extractDataAttributes(element) {
        const data = {};
        for (const [key, value] of Object.entries(element.dataset)) {
            if (key !== 'action') {
                data[key] = value;
            }
        }
        return data;
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
                    console.error(`Error in ${event} handler:`, error);
                }
            });
        }
    }
    
    // Performance utilities
    debounce(func, wait) {
        return (...args) => {
            const key = func.name || 'anonymous';
            
            if (this.debounceTimers.has(key)) {
                clearTimeout(this.debounceTimers.get(key));
            }
            
            this.debounceTimers.set(key, setTimeout(() => {
                func.apply(this, args);
                this.debounceTimers.delete(key);
            }, wait));
        };
    }
    
    throttle(func, limit) {
        return (...args) => {
            const key = func.name || 'anonymous';
            
            if (!this.throttleTimers.has(key)) {
                func.apply(this, args);
                this.throttleTimers.set(key, setTimeout(() => {
                    this.throttleTimers.delete(key);
                }, limit));
            }
        };
    }
    
    // Specific event registration methods
    onFindPartner(callback) {
        this.on('findPartner', callback);
    }
    
    onToggleMute(callback) {
        this.on('toggleMute', callback);
    }
    
    onEndCall(callback) {
        this.on('endCall', callback);
    }
    
    onNavigate(callback) {
        this.on('navigate', callback);
    }
    
    onFormSubmit(callback) {
        this.on('formSubmit', callback);
    }
    
    onInputChange(callback) {
        this.on('inputChange', callback);
    }
    
    // Performance monitoring
    getEventStats() {
        return {
            ...this.eventStats,
            activeListeners: this.listeners.size,
            totalCallbacks: Array.from(this.listeners.values()).reduce((sum, arr) => sum + arr.length, 0),
            globalListeners: this.globalListeners.size,
            debounceTimers: this.debounceTimers.size,
            throttleTimers: this.throttleTimers.size
        };
    }
    
    // Cleanup
    cleanup() {
        console.log('🧹 EventManager cleanup initiated...');
        
        // Clear all debounce and throttle timers
        this.debounceTimers.forEach(timer => clearTimeout(timer));
        this.debounceTimers.clear();
        
        this.throttleTimers.forEach(timer => clearTimeout(timer));
        this.throttleTimers.clear();
        
        // Remove global listeners
        this.globalListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.globalListeners.clear();
        
        // Clear event listeners
        this.listeners.clear();
        this.delegatedEvents.clear();
        
        const finalStats = this.getEventStats();
        console.log('📊 Final event stats:', finalStats);
        console.log('✅ EventManager cleanup completed');
    }
} 