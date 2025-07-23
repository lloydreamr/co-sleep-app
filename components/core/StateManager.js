/**
 * State Manager - Centralized state management for the Hence app
 * Handles connection states, user states, and session metadata
 */
export class StateManager {
    constructor() {
        this.state = {
            // Connection states
            connectionState: 'idle', // idle, searching, matched, connected
            voiceState: 'unmuted', // muted, unmuted, speaking
            
            // User information
            userId: null,
            userType: null,
            displayName: null,
            isVerified: false,
            
            // Session data
            sessionMetadata: {
                startTime: null,
                partnerId: null,
                connectionQuality: null,
                callId: null
            },
            
            // UI states
            isInQueue: false,
            isInCall: false,
            currentInterface: 'main'
        };
        
        // Event listeners for state changes
        this.listeners = new Map();
        
        // State change history for debugging
        this.stateHistory = [];
        this.maxHistoryLength = 50;
        
        // Activity tracking
        this.activityInterval = null;
        this.lastActivity = Date.now();
    }
    
    initialize(initialState = {}) {
        // Set initial state
        this.setState(initialState);
        
        // Start activity tracking
        this.startActivityTracking();
        
        console.log('🔧 StateManager initialized');
    }
    
    // Core state management
    setState(newState) {
        const previousState = { ...this.state };
        this.state = { ...this.state, ...newState };
        
        // Record state change
        this.recordStateChange(previousState, this.state);
        
        // Emit state change events
        this.emit('stateChange', this.state);
        
        // Emit specific state change events
        Object.keys(newState).forEach(key => {
            if (previousState[key] !== this.state[key]) {
                this.emit(`${key}Changed`, this.state[key], previousState[key]);
            }
        });
    }
    
    getState() {
        return { ...this.state };
    }
    
    // Specific state updaters
    updateConnectionState(newState) {
        console.log(`🔄 Connection state: ${this.state.connectionState} → ${newState}`);
        this.setState({ connectionState: newState });
        
        // Update related states
        if (newState === 'searching') {
            this.setState({ isInQueue: true });
        } else if (newState === 'connected') {
            this.setState({ isInCall: true, isInQueue: false });
        } else if (newState === 'idle') {
            this.setState({ isInCall: false, isInQueue: false });
        }
    }
    
    updateVoiceState(newState) {
        console.log(`🎤 Voice state: ${this.state.voiceState} → ${newState}`);
        this.setState({ voiceState: newState });
    }
    
    updateSessionMetadata(metadata) {
        this.setState({
            sessionMetadata: { ...this.state.sessionMetadata, ...metadata }
        });
    }
    
    updateInterface(interfaceName) {
        this.setState({ currentInterface: interfaceName });
    }
    
    // Activity tracking
    startActivityTracking() {
        // Update activity every 30 seconds
        this.activityInterval = setInterval(() => {
            this.updateActivity();
        }, 30000);
        
        // Track user interactions
        ['click', 'keypress', 'touchstart'].forEach(event => {
            document.addEventListener(event, () => {
                this.updateActivity();
            }, { passive: true });
        });
    }
    
    updateActivity() {
        this.lastActivity = Date.now();
        this.emit('activityUpdate', this.lastActivity);
    }
    
    // Session management
    startSession(partnerId) {
        const sessionData = {
            sessionMetadata: {
                startTime: Date.now(),
                partnerId: partnerId,
                callId: this.generateCallId(),
                connectionQuality: null
            }
        };
        
        this.setState(sessionData);
        console.log('📞 Session started:', sessionData.sessionMetadata);
    }
    
    endSession(endReason = 'completed') {
        const session = this.state.sessionMetadata;
        if (session.startTime) {
            const sessionData = {
                ...session,
                endTime: Date.now(),
                duration: Math.floor((Date.now() - session.startTime) / 1000),
                endReason: endReason
            };
            
            console.log('📞 Session ended:', sessionData);
            this.emit('sessionEnded', sessionData);
        }
        
        // Reset session metadata
        this.setState({
            sessionMetadata: {
                startTime: null,
                partnerId: null,
                connectionQuality: null,
                callId: null
            }
        });
    }
    
    generateCallId() {
        return `call_${this.state.userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
    
    emit(event, ...args) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(...args);
                } catch (error) {
                    console.error(`Error in ${event} listener:`, error);
                }
            });
        }
    }
    
    // State history management
    recordStateChange(previousState, newState) {
        this.stateHistory.push({
            timestamp: Date.now(),
            previous: previousState,
            current: newState,
            changes: this.getStateChanges(previousState, newState)
        });
        
        // Limit history size
        if (this.stateHistory.length > this.maxHistoryLength) {
            this.stateHistory = this.stateHistory.slice(-this.maxHistoryLength);
        }
    }
    
    getStateChanges(oldState, newState) {
        const changes = {};
        Object.keys(newState).forEach(key => {
            if (oldState[key] !== newState[key]) {
                changes[key] = {
                    from: oldState[key],
                    to: newState[key]
                };
            }
        });
        return changes;
    }
    
    // Debugging helpers
    getStateHistory() {
        return this.stateHistory;
    }
    
    logCurrentState() {
        console.log('Current State:', this.state);
    }
    
    // Cleanup
    cleanup() {
        if (this.activityInterval) {
            clearInterval(this.activityInterval);
        }
        
        this.listeners.clear();
        this.emit('cleanup');
        
        console.log('🧹 StateManager cleaned up');
    }
} 