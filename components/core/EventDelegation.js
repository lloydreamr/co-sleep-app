/**
 * Event Delegation - Handles global event delegation and routing
 * Extracted from EventManager.js for better separation of concerns
 */
export class EventDelegation {
    constructor() {
        this.delegatedEvents = new Map();
        this.globalListeners = new Set();
        this.listeners = new Map();
        
        // Event performance tracking
        this.eventStats = {
            totalEvents: 0,
            delegatedEvents: 0
        };
    }

    initialize() {
        console.log('🎯 EventDelegation initializing...');
        this.setupGlobalListeners();
        console.log('🌐 Global event listeners established');
    }

    setupGlobalListeners() {
        // Global click delegation - NOT passive since we need preventDefault
        this.addGlobalListener('click', this.handleGlobalClick.bind(this), false);
        
        // Global form handling - NOT passive since we need preventDefault
        this.addGlobalListener('submit', this.handleGlobalSubmit.bind(this), false);
        
        // Global keyboard handling - NOT passive since we might need preventDefault
        this.addGlobalListener('keydown', this.handleGlobalKeydown.bind(this), false);
        
        // Touch events for mobile - can be passive
        this.addGlobalListener('touchstart', this.handleGlobalTouch.bind(this), true);
        
        // Window events - can be passive
        this.addWindowListener('beforeunload', this.handleBeforeUnload.bind(this), true);
    }

    addGlobalListener(event, handler, passive = false) {
        const options = { passive, capture: false };
        const listenerInfo = { event, handler, options, target: document };
        
        document.addEventListener(event, handler, options);
        this.globalListeners.add(listenerInfo);
    }

    addWindowListener(event, handler, passive = false) {
        const options = { passive };
        const listenerInfo = { event, handler, options, target: window };
        
        window.addEventListener(event, handler, options);
        this.globalListeners.add(listenerInfo);
    }

    handleGlobalClick(event) {
        this.eventStats.totalEvents++;
        
        const target = event.target;
        let element = target;
        
        // Traverse up the DOM tree to find relevant elements
        while (element && element !== document) {
            // Handle buttons
            if (element.matches('button, [role="button"]')) {
                this.handleButtonClick(element, event);
                break;
            }
            
            // Handle navigation items
            if (element.matches('[data-nav]')) {
                this.handleNavigation(element, event);
                break;
            }
            
            // Handle toggles and switches
            if (element.matches('[data-toggle]')) {
                this.handleToggle(element, event);
                break;
            }
            
            element = element.parentElement;
        }
        
        this.emit('globalClick', { target, originalEvent: event });
    }

    handleGlobalSubmit(event) {
        this.eventStats.totalEvents++;
        
        const form = event.target;
        if (form.tagName === 'FORM') {
            // Prevent default submission unless explicitly allowed
            if (!form.hasAttribute('data-allow-default')) {
                event.preventDefault();
            }
            
            this.emit('formSubmit', { form, event });
        }
    }

    handleGlobalKeydown(event) {
        this.eventStats.totalEvents++;
        
        // Handle escape key globally
        if (event.key === 'Escape') {
            this.emit('escapePressed', { event });
        }
        
        // Handle enter key on interactive elements
        if (event.key === 'Enter' && event.target.matches('[role="button"], [tabindex]')) {
            event.target.click();
        }
        
        this.emit('globalKeydown', { event });
    }

    handleGlobalTouch(event) {
        this.eventStats.totalEvents++;
        this.emit('globalTouch', { event });
    }

    handleBeforeUnload(event) {
        this.emit('beforeUnload', { event });
    }

    handleButtonClick(button, event) {
        this.eventStats.delegatedEvents++;
        
        // Handle different button types
        const buttonType = button.dataset.action || button.type || 'button';
        
        switch (buttonType) {
            case 'find-partner':
                this.emit('findPartner', { button, event });
                break;
            case 'end-call':
                this.emit('endCall', { button, event });
                break;
            case 'mute':
            case 'toggle-mute':
                this.emit('toggleMute', { button, event });
                break;
            case 'cancel-queue':
                this.emit('cancelQueue', { button, event });
                break;
            default:
                this.emit('buttonClick', { button, event, buttonType });
        }
    }

    handleNavigation(element, event) {
        this.eventStats.delegatedEvents++;
        
        const section = element.dataset.nav || element.dataset.section;
        if (section) {
            this.emit('navigate', { section, element, event });
        }
    }

    handleToggle(element, event) {
        this.eventStats.delegatedEvents++;
        
        const toggleType = element.dataset.toggle;
        this.emit('toggle', { toggleType, element, event });
    }

    cleanup() {
        console.log('🧹 Cleaning up EventDelegation...');
        
        // Remove all global listeners
        this.globalListeners.forEach(listenerInfo => {
            const { target, event, handler, options } = listenerInfo;
            target.removeEventListener(event, handler, options);
        });
        
        this.globalListeners.clear();
        this.delegatedEvents.clear();
        
        console.log('✅ EventDelegation cleanup completed');
    }

    getEventStats() {
        return { ...this.eventStats };
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
                    console.error(`Error in Event Delegation ${event} handler:`, error);
                }
            });
        }
    }
} 