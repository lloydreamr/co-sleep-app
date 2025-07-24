/**
 * Memory Manager - Main coordinator for memory and resource management
 * Refactored to use focused modules for better separation of concerns
 */
import { MemoryMonitor } from './MemoryMonitor.js';
import { ResourceManager } from './ResourceManager.js';

export class MemoryManager {
    constructor() {
        // Initialize modules
        this.monitor = new MemoryMonitor();
        this.resources = new ResourceManager();

        // Event listeners for coordination
        this.listeners = new Map();

        this.setupModuleEventHandlers();
    }

    initialize() {
        console.log('🧠 MemoryManager initializing...');
        
        try {
            this.monitor.initialize();
            this.resources.initialize();
            
            console.log('✅ MemoryManager initialized successfully');
            
        } catch (error) {
            console.error('❌ MemoryManager initialization failed:', error);
            throw error;
        }
    }

    setupModuleEventHandlers() {
        // Monitor events
        this.monitor.on('memoryThresholdExceeded', () => {
            this.performCleanup();
            this.emit('memoryThresholdExceeded');
        });

        this.monitor.on('potentialMemoryLeak', (data) => {
            this.performCleanup();
            this.emit('potentialMemoryLeak', data);
        });

        this.monitor.on('automaticCleanupPerformed', () => {
            this.emit('automaticCleanupPerformed');
        });
    }

    startMonitoring() {
        this.monitor.startMonitoring();
    }

    // Resource management delegation
    createTimer(callback, delay, ...args) {
        return this.resources.createTimer(callback, delay, ...args);
    }

    createInterval(callback, interval, ...args) {
        return this.resources.createInterval(callback, interval, ...args);
    }

    clearTimer(timerId) {
        this.resources.clearTimer(timerId);
    }

    clearInterval(intervalId) {
        this.resources.clearInterval(intervalId);
    }

    // Object pool delegation
    borrowFromPool(poolName) {
        return this.resources.borrowFromPool(poolName);
    }

    returnToPool(poolName, object) {
        this.resources.returnToPool(poolName, object);
    }

    // Event listener delegation
    addEventListener(element, event, handler, options = {}) {
        return this.resources.addEventListener(element, event, handler, options);
    }

    removeEventListener(listenerInfo) {
        this.resources.removeEventListener(listenerInfo);
    }

    // Cleanup callback delegation
    registerCleanupCallback(callback) {
        this.resources.registerCleanupCallback(callback);
    }

    unregisterCleanupCallback(callback) {
        this.resources.unregisterCleanupCallback(callback);
    }

    performCleanup() {
        console.log('🧹 Performing comprehensive cleanup...');
        
        // Run resource cleanup
        this.resources.runCleanupCallbacks();
        
        // Trigger automatic cleanup in monitor
        this.monitor.performAutomaticCleanup();
        
        this.emit('cleanupPerformed');
    }

    cleanup() {
        console.log('🧹 Cleaning up MemoryManager...');
        
        this.monitor.cleanup();
        this.resources.cleanup();
        
        console.log('✅ MemoryManager cleanup completed');
    }

    // Stats aggregation
    getMemoryStats() {
        return this.monitor.getMemoryStats();
    }

    getResourceStats() {
        return this.resources.getResourceStats();
    }

    getPoolStats() {
        return this.resources.getPoolStats();
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
                    console.error(`Error in MemoryManager ${event} handler:`, error);
                }
            });
        }
    }
} 