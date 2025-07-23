/**
 * Memory Manager - Prevents memory leaks and optimizes resource usage
 * Centralized cleanup system for the Hence app
 */
export class MemoryManager {
    constructor() {
        this.activeTimers = new Set();
        this.activeIntervals = new Set();
        this.activeContexts = new WeakMap();
        this.eventListeners = new Map();
        this.objectPools = new Map();
        this.memoryThreshold = 50 * 1024 * 1024; // 50MB threshold
        this.monitoringInterval = null;
        this.cleanupCallbacks = new Set();
        
        // Performance monitoring
        this.memoryStats = {
            initialHeap: 0,
            currentHeap: 0,
            peakHeap: 0,
            cleanupCount: 0,
            leakDetections: 0
        };
    }
    
    initialize() {
        // Record initial memory usage
        if (performance.memory) {
            this.memoryStats.initialHeap = performance.memory.usedJSHeapSize;
            this.memoryStats.currentHeap = performance.memory.usedJSHeapSize;
            this.memoryStats.peakHeap = performance.memory.usedJSHeapSize;
        }
        
        // Initialize object pools
        this.initializeObjectPools();
        
        console.log('🧠 MemoryManager initialized');
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
        
        // WebRTC connection pool
        this.objectPools.set('rtcConnections', {
            pool: [],
            maxSize: 5,
            active: new Set(),
            create: () => new RTCPeerConnection(),
            cleanup: (connection) => {
                connection.close();
            }
        });
    }
    
    // Timer management
    createTimer(callback, delay, ...args) {
        const timerId = setTimeout(() => {
            this.activeTimers.delete(timerId);
            callback(...args);
        }, delay);
        
        this.activeTimers.add(timerId);
        return timerId;
    }
    
    createInterval(callback, interval, ...args) {
        const intervalId = setInterval(() => {
            callback(...args);
        }, interval);
        
        this.activeIntervals.add(intervalId);
        return intervalId;
    }
    
    clearTimer(timerId) {
        if (this.activeTimers.has(timerId)) {
            clearTimeout(timerId);
            this.activeTimers.delete(timerId);
        }
    }
    
    clearInterval(intervalId) {
        if (this.activeIntervals.has(intervalId)) {
            clearInterval(intervalId);
            this.activeIntervals.delete(intervalId);
        }
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
        if (!pool || !pool.active.has(object)) return;
        
        pool.active.delete(object);
        
        if (pool.pool.length < pool.maxSize) {
            pool.pool.push(object);
        } else {
            // Pool is full, cleanup the object
            pool.cleanup(object);
        }
    }
    
    // Event listener management
    addEventListener(element, event, handler, options = {}) {
        const key = `${element.constructor.name}_${event}`;
        
        if (!this.eventListeners.has(key)) {
            this.eventListeners.set(key, []);
        }
        
        const listenerInfo = { element, event, handler, options };
        this.eventListeners.get(key).push(listenerInfo);
        
        element.addEventListener(event, handler, options);
        
        return listenerInfo;
    }
    
    removeEventListener(listenerInfo) {
        const { element, event, handler } = listenerInfo;
        element.removeEventListener(event, handler);
        
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
    
    // Memory monitoring
    startMonitoring() {
        this.monitoringInterval = this.createInterval(() => {
            this.checkMemoryUsage();
        }, 30000); // Check every 30 seconds
        
        console.log('📊 Memory monitoring started');
    }
    
    checkMemoryUsage() {
        if (!performance.memory) return;
        
        const currentHeap = performance.memory.usedJSHeapSize;
        this.memoryStats.currentHeap = currentHeap;
        
        if (currentHeap > this.memoryStats.peakHeap) {
            this.memoryStats.peakHeap = currentHeap;
        }
        
        // Check for memory threshold breach
        if (currentHeap > this.memoryThreshold) {
            console.warn(`⚠️ High memory usage detected: ${Math.round(currentHeap / 1024 / 1024)}MB`);
            this.performAutomaticCleanup();
        }
        
        // Detect potential memory leaks
        const growthRate = (currentHeap - this.memoryStats.initialHeap) / this.memoryStats.initialHeap;
        if (growthRate > 2) { // 200% growth
            console.warn('🚨 Potential memory leak detected');
            this.memoryStats.leakDetections++;
            this.performLeakCleanup();
        }
    }
    
    performAutomaticCleanup() {
        console.log('🧹 Performing automatic cleanup...');
        
        // Clear unused object pools
        this.cleanupObjectPools();
        
        // Force garbage collection if available
        if (window.gc) {
            window.gc();
        }
        
        // Run registered cleanup callbacks
        this.cleanupCallbacks.forEach(callback => {
            try {
                callback();
            } catch (error) {
                console.error('Cleanup callback error:', error);
            }
        });
        
        this.memoryStats.cleanupCount++;
    }
    
    performLeakCleanup() {
        console.log('🔍 Performing leak cleanup...');
        
        // More aggressive cleanup for potential leaks
        this.clearAllTimers();
        this.clearAllIntervals();
        this.cleanupObjectPools(true); // Force cleanup
        
        // Clear DOM references that might be holding memory
        this.cleanupDOMReferences();
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
    
    cleanupDOMReferences() {
        // Remove any cached DOM elements that might be stale
        const elements = document.querySelectorAll('[data-hence-cached]');
        elements.forEach(el => {
            el.removeAttribute('data-hence-cached');
        });
    }
    
    // Cleanup methods
    clearAllTimers() {
        this.activeTimers.forEach(timerId => {
            clearTimeout(timerId);
        });
        this.activeTimers.clear();
    }
    
    clearAllIntervals() {
        this.activeIntervals.forEach(intervalId => {
            clearInterval(intervalId);
        });
        this.activeIntervals.clear();
    }
    
    removeAllEventListeners() {
        for (const listeners of this.eventListeners.values()) {
            listeners.forEach(listenerInfo => {
                const { element, event, handler } = listenerInfo;
                element.removeEventListener(event, handler);
            });
        }
        this.eventListeners.clear();
    }
    
    registerCleanupCallback(callback) {
        this.cleanupCallbacks.add(callback);
    }
    
    unregisterCleanupCallback(callback) {
        this.cleanupCallbacks.delete(callback);
    }
    
    // Performance methods
    performCleanup() {
        this.performAutomaticCleanup();
    }
    
    getMemoryStats() {
        const current = performance.memory ? performance.memory.usedJSHeapSize : 0;
        
        return {
            ...this.memoryStats,
            currentHeap: current,
            currentHeapMB: Math.round(current / 1024 / 1024),
            peakHeapMB: Math.round(this.memoryStats.peakHeap / 1024 / 1024),
            activeTimers: this.activeTimers.size,
            activeIntervals: this.activeIntervals.size,
            activeListeners: Array.from(this.eventListeners.values()).reduce((sum, arr) => sum + arr.length, 0),
            poolStats: this.getPoolStats()
        };
    }
    
    getPoolStats() {
        const stats = {};
        for (const [poolName, pool] of this.objectPools) {
            stats[poolName] = {
                available: pool.pool.length,
                active: pool.active.size,
                maxSize: pool.maxSize
            };
        }
        return stats;
    }
    
    // Main cleanup method
    cleanup() {
        console.log('🧹 MemoryManager cleanup initiated...');
        
        // Stop monitoring
        if (this.monitoringInterval) {
            this.clearInterval(this.monitoringInterval);
        }
        
        // Clear all tracked resources
        this.clearAllTimers();
        this.clearAllIntervals();
        this.removeAllEventListeners();
        this.cleanupObjectPools(true);
        
        // Run cleanup callbacks
        this.cleanupCallbacks.forEach(callback => {
            try {
                callback();
            } catch (error) {
                console.error('Final cleanup callback error:', error);
            }
        });
        this.cleanupCallbacks.clear();
        
        // Final garbage collection hint
        if (window.gc) {
            window.gc();
        }
        
        const finalStats = this.getMemoryStats();
        console.log('📊 Final memory stats:', finalStats);
        console.log('✅ MemoryManager cleanup completed');
    }
} 