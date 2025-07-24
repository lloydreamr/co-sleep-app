/**
 * Resource Manager - Handles timers, intervals, event listeners, and object pools
 * Extracted from MemoryManager.js for better separation of concerns
 */
export class ResourceManager {
    constructor() {
        this.activeTimers = new Set();
        this.activeIntervals = new Set();
        this.eventListeners = new Map();
        this.objectPools = new Map();
        this.cleanupCallbacks = new Set();
        this.listeners = new Map();
    }

    initialize() {
        console.log('🔧 ResourceManager initializing...');
        
        // Initialize object pools
        this.initializeObjectPools();
        
        console.log('🔧 Resource management initialized');
    }

    initializeObjectPools() {
        // Audio context pool (limit to 3 contexts)
        this.objectPools.set('audioContexts', {
            pool: [],
            maxSize: 3,
            active: new Set(),
            create: () => new (window.AudioContext || window.webkitAudioContext)(),
            cleanup: (context) => {
                if (context.state !== 'closed') {
                    context.close();
                }
            }
        });

        // WebRTC peer connection pool
        this.objectPools.set('peerConnections', {
            pool: [],
            maxSize: 5,
            active: new Set(),
            create: () => new RTCPeerConnection(),
            cleanup: (connection) => {
                if (connection.connectionState !== 'closed') {
                    connection.close();
                }
            }
        });
    }

    // Timer management
    createTimer(callback, delay, ...args) {
        const timerId = setTimeout((...timerArgs) => {
            this.activeTimers.delete(timerId);
            callback(...timerArgs);
        }, delay, ...args);
        
        this.activeTimers.add(timerId);
        return timerId;
    }

    createInterval(callback, interval, ...args) {
        const intervalId = setInterval(callback, interval, ...args);
        this.activeIntervals.add(intervalId);
        return intervalId;
    }

    clearTimer(timerId) {
        clearTimeout(timerId);
        this.activeTimers.delete(timerId);
    }

    clearInterval(intervalId) {
        clearInterval(intervalId);
        this.activeIntervals.delete(intervalId);
    }

    clearAllTimers() {
        this.activeTimers.forEach(timerId => clearTimeout(timerId));
        this.activeTimers.clear();
    }

    clearAllIntervals() {
        this.activeIntervals.forEach(intervalId => clearInterval(intervalId));
        this.activeIntervals.clear();
    }

    // Object pool management
    borrowFromPool(poolName) {
        const pool = this.objectPools.get(poolName);
        if (!pool) return null;

        let object;
        if (pool.pool.length > 0) {
            object = pool.pool.pop();
        } else {
            object = pool.create();
        }

        pool.active.add(object);
        return object;
    }

    returnToPool(poolName, object) {
        const pool = this.objectPools.get(poolName);
        if (!pool) return;

        pool.active.delete(object);
        if (pool.pool.length < pool.maxSize) {
            pool.pool.push(object);
        } else {
            pool.cleanup(object);
        }
    }

    cleanupObjectPools(force = false) {
        for (const [poolName, pool] of this.objectPools) {
            // Clean up active objects if forcing
            if (force) {
                pool.active.forEach(object => {
                    pool.cleanup(object);
                });
                pool.active.clear();
            }

            // Clean up pooled objects
            pool.pool.forEach(object => {
                pool.cleanup(object);
            });
            pool.pool.length = 0;
        }
    }

    // Event listener management
    addEventListener(element, event, handler, options = {}) {
        const listenerInfo = {
            element,
            event,
            handler,
            options
        };

        element.addEventListener(event, handler, options);

        // Track for cleanup
        const key = `${element.tagName || 'UNKNOWN'}_${event}`;
        if (!this.eventListeners.has(key)) {
            this.eventListeners.set(key, []);
        }
        this.eventListeners.get(key).push(listenerInfo);

        return listenerInfo;
    }

    removeEventListener(listenerInfo) {
        const { element, event, handler, options } = listenerInfo;
        element.removeEventListener(event, handler, options);

        // Remove from tracking
        for (const [key, listeners] of this.eventListeners) {
            const index = listeners.indexOf(listenerInfo);
            if (index > -1) {
                listeners.splice(index, 1);
                if (listeners.length === 0) {
                    this.eventListeners.delete(key);
                }
                break;
            }
        }
    }

    removeAllEventListeners() {
        for (const [key, listeners] of this.eventListeners) {
            listeners.forEach(listenerInfo => {
                const { element, event, handler, options } = listenerInfo;
                element.removeEventListener(event, handler, options);
            });
        }
        this.eventListeners.clear();
    }

    // Cleanup callback management
    registerCleanupCallback(callback) {
        this.cleanupCallbacks.add(callback);
    }

    unregisterCleanupCallback(callback) {
        this.cleanupCallbacks.delete(callback);
    }

    runCleanupCallbacks() {
        this.cleanupCallbacks.forEach(callback => {
            try {
                callback();
            } catch (error) {
                console.error('Cleanup callback error:', error);
            }
        });
    }

    getPoolStats() {
        const stats = {};
        for (const [poolName, pool] of this.objectPools) {
            stats[poolName] = {
                pooled: pool.pool.length,
                active: pool.active.size,
                maxSize: pool.maxSize
            };
        }
        return stats;
    }

    getResourceStats() {
        return {
            activeTimers: this.activeTimers.size,
            activeIntervals: this.activeIntervals.size,
            eventListeners: Array.from(this.eventListeners.values()).reduce((sum, arr) => sum + arr.length, 0),
            objectPools: this.getPoolStats(),
            cleanupCallbacks: this.cleanupCallbacks.size
        };
    }

    cleanup() {
        console.log('🧹 Cleaning up ResourceManager...');
        
        // Run cleanup callbacks first
        this.runCleanupCallbacks();
        
        // Clear all resources
        this.clearAllTimers();
        this.clearAllIntervals();
        this.removeAllEventListeners();
        this.cleanupObjectPools(true); // Force cleanup
        
        // Clear callbacks
        this.cleanupCallbacks.clear();
        
        console.log('✅ ResourceManager cleanup completed');
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
                    console.error(`Error in Resource Manager ${event} handler:`, error);
                }
            });
        }
    }
} 