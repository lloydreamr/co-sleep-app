/**
 * Event Manager - Main coordinator for event handling and delegation
 * Refactored to use focused modules for better separation of concerns
 */
import { EventDelegation } from './EventDelegation.js';
import { EventUtils } from './EventUtils.js';

export class EventManager {
    constructor() {
        // Initialize modules
        this.delegation = new EventDelegation();
        this.utils = new EventUtils();

        // Event listeners for coordination
        this.listeners = new Map();

        this.setupModuleEventHandlers();
    }

    initialize() {
        console.log('🎯 EventManager initializing...');
        
        try {
            this.delegation.initialize();
            this.setupInputHandling();
            this.setupWindowHandling();
            
            console.log('✅ EventManager initialized successfully');
            
        } catch (error) {
            console.error('❌ EventManager initialization failed:', error);
            throw error;
        }
    }

    setupModuleEventHandlers() {
        // Delegation events
        this.delegation.on('findPartner', (data) => {
            this.emit('findPartner', data);
        });

        this.delegation.on('endCall', (data) => {
            this.emit('endCall', data);
        });

        this.delegation.on('toggleMute', (data) => {
            this.emit('toggleMute', data);
        });

        this.delegation.on('cancelQueue', (data) => {
            this.emit('cancelQueue', data);
        });

        this.delegation.on('navigate', (data) => {
            this.emit('navigate', data);
        });

        this.delegation.on('formSubmit', (data) => {
            this.emit('formSubmit', data);
        });

        this.delegation.on('escapePressed', (data) => {
            this.emit('escapePressed', data);
        });

        // Utils events
        this.utils.on('searchInput', (data) => {
            this.emit('searchInput', data);
        });

        this.utils.on('filterInput', (data) => {
            this.emit('filterInput', data);
        });

        this.utils.on('windowResize', (data) => {
            this.emit('windowResize', data);
        });

        this.utils.on('eventHandlerError', (data) => {
            this.emit('eventHandlerError', data);
        });
    }

    setupInputHandling() {
        // Global input handling with debouncing
        this.delegation.addGlobalListener('input', 
            this.utils.debounce(this.utils.handleGlobalInput.bind(this.utils), 300), 
            true
        );
    }

    setupWindowHandling() {
        // Window resize handling with throttling
        this.delegation.addWindowListener('resize', 
            this.utils.throttle(this.utils.handleWindowResize.bind(this.utils), 100), 
            true
        );
    }

    // Utility method delegation
    debounce(func, delay, immediate = false) {
        return this.utils.debounce(func, delay, immediate);
    }

    throttle(func, limit) {
        return this.utils.throttle(func, limit);
    }

    findClosestElement(element, selector) {
        return this.utils.findClosestElement(element, selector);
    }

    isInteractiveElement(element) {
        return this.utils.isInteractiveElement(element);
    }

    // Convenience methods for common event subscriptions
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
        this.on('searchInput', callback);
        this.on('filterInput', callback);
    }

    cleanup() {
        console.log('🧹 Cleaning up EventManager...');
        
        this.delegation.cleanup();
        this.utils.cleanup();
        
        console.log('✅ EventManager cleanup completed');
    }

    // Stats aggregation
    getEventStats() {
        const delegationStats = this.delegation.getEventStats();
        const utilStats = this.utils.getUtilStats();
        
        return {
            ...delegationStats,
            ...utilStats,
            totalProcessed: delegationStats.totalEvents + utilStats.debouncedEvents + utilStats.throttledEvents
        };
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
                    console.error(`Error in EventManager ${event} handler:`, error);
                }
            });
        }
    }
} 