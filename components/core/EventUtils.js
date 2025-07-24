/**
 * Event Utils - Handles debouncing, throttling, and event utility functions
 * Extracted from EventManager.js for better separation of concerns
 */
export class EventUtils {
    constructor() {
        this.debounceTimers = new Map();
        this.throttleTimers = new Map();
        this.listeners = new Map();
        
        // Performance tracking
        this.utilStats = {
            debouncedEvents: 0,
            throttledEvents: 0
        };
    }

    // Debouncing utility
    debounce(func, delay, immediate = false) {
        const key = func.toString();
        
        return (...args) => {
            this.utilStats.debouncedEvents++;
            
            const callNow = immediate && !this.debounceTimers.has(key);
            
            if (this.debounceTimers.has(key)) {
                clearTimeout(this.debounceTimers.get(key));
            }
            
            this.debounceTimers.set(key, setTimeout(() => {
                this.debounceTimers.delete(key);
                if (!immediate) func.apply(this, args);
            }, delay));
            
            if (callNow) func.apply(this, args);
        };
    }

    // Throttling utility
    throttle(func, limit) {
        const key = func.toString();
        
        return (...args) => {
            this.utilStats.throttledEvents++;
            
            if (!this.throttleTimers.has(key)) {
                func.apply(this, args);
                this.throttleTimers.set(key, setTimeout(() => {
                    this.throttleTimers.delete(key);
                }, limit));
            }
        };
    }

    // Input handling with debouncing
    handleGlobalInput(event) {
        const input = event.target;
        
        // Handle different input types
        if (input.matches('[data-search]')) {
            this.emit('searchInput', { input, value: input.value, event });
        } else if (input.matches('[data-filter]')) {
            this.emit('filterInput', { input, value: input.value, event });
        } else {
            this.emit('globalInput', { input, value: input.value, event });
        }
    }

    // Window resize handling with throttling
    handleWindowResize(event) {
        const { innerWidth, innerHeight } = window;
        
        this.emit('windowResize', { 
            width: innerWidth, 
            height: innerHeight, 
            event 
        });
    }

    // Event delegation helpers
    findClosestElement(element, selector) {
        let current = element;
        while (current && current !== document) {
            if (current.matches(selector)) {
                return current;
            }
            current = current.parentElement;
        }
        return null;
    }

    isInteractiveElement(element) {
        const interactiveSelectors = [
            'button',
            'input',
            'select',
            'textarea',
            'a[href]',
            '[tabindex]',
            '[role="button"]',
            '[role="link"]',
            '[contenteditable]'
        ];
        
        return interactiveSelectors.some(selector => element.matches(selector));
    }

    // Performance helpers
    requestAnimationFrame(callback) {
        return window.requestAnimationFrame(callback);
    }

    cancelAnimationFrame(id) {
        window.cancelAnimationFrame(id);
    }

    // Safe event handler wrapper
    safeEventHandler(handler) {
        return (event) => {
            try {
                handler(event);
            } catch (error) {
                console.error('Event handler error:', error);
                this.emit('eventHandlerError', { error, event });
            }
        };
    }

    // Cleanup utilities
    clearAllTimers() {
        console.log('🧹 Clearing event utility timers...');
        
        // Clear debounce timers
        this.debounceTimers.forEach(timerId => clearTimeout(timerId));
        this.debounceTimers.clear();
        
        // Clear throttle timers
        this.throttleTimers.forEach(timerId => clearTimeout(timerId));
        this.throttleTimers.clear();
    }

    cleanup() {
        console.log('🧹 Cleaning up EventUtils...');
        
        this.clearAllTimers();
        
        console.log('✅ EventUtils cleanup completed');
    }

    getUtilStats() {
        return {
            ...this.utilStats,
            activeDebounceTimers: this.debounceTimers.size,
            activeThrottleTimers: this.throttleTimers.size
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
                    console.error(`Error in Event Utils ${event} handler:`, error);
                }
            });
        }
    }
} 