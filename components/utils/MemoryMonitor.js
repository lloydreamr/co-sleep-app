/**
 * Memory Monitor - Handles memory usage tracking and leak detection
 * Extracted from MemoryManager.js for better separation of concerns
 */
export class MemoryMonitor {
    constructor() {
        this.memoryThreshold = 50 * 1024 * 1024; // 50MB threshold
        this.monitoringInterval = null;
        this.listeners = new Map();
        
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
        console.log('📊 MemoryMonitor initializing...');
        
        // Record initial memory usage
        if (performance.memory) {
            this.memoryStats.initialHeap = performance.memory.usedJSHeapSize;
            this.memoryStats.currentHeap = performance.memory.usedJSHeapSize;
            this.memoryStats.peakHeap = performance.memory.usedJSHeapSize;
        }
        
        console.log('📊 Memory monitoring initialized');
    }

    startMonitoring() {
        this.monitoringInterval = setInterval(() => {
            this.checkMemoryUsage();
        }, 10000); // Check every 10 seconds
        
        console.log('📊 Memory monitoring started');
    }

    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
            console.log('📊 Memory monitoring stopped');
        }
    }

    checkMemoryUsage() {
        if (!performance.memory) {
            return;
        }

        const currentHeap = performance.memory.usedJSHeapSize;
        this.memoryStats.currentHeap = currentHeap;
        
        // Track peak memory usage
        if (currentHeap > this.memoryStats.peakHeap) {
            this.memoryStats.peakHeap = currentHeap;
        }
        
        // Check for memory threshold breach
        if (currentHeap > this.memoryThreshold) {
            console.warn('⚠️ Memory usage above threshold:', this.formatBytes(currentHeap));
            this.emit('memoryThresholdExceeded', { currentHeap, threshold: this.memoryThreshold });
        }
        
        // Detect potential memory leaks (rapid growth)
        const growthRate = currentHeap / this.memoryStats.initialHeap;
        if (growthRate > 2) { // 200% growth
            console.warn('🚨 Potential memory leak detected');
            this.memoryStats.leakDetections++;
            this.emit('potentialMemoryLeak', { growthRate, currentHeap });
        }
    }

    performAutomaticCleanup() {
        console.log('🧹 Performing automatic memory cleanup...');
        
        this.memoryStats.cleanupCount++;
        
        // Trigger garbage collection if available
        if (window.gc) {
            try {
                window.gc();
                console.log('🗑️ Manual garbage collection triggered');
            } catch (error) {
                console.warn('⚠️ Manual garbage collection failed:', error);
            }
        }
        
        // Clean up weak references
        this.performLeakCleanup();
        
        this.emit('automaticCleanupPerformed');
    }

    performLeakCleanup() {
        // Clean up common leak sources
        
        // Clean up orphaned event listeners
        const elements = document.querySelectorAll('*');
        elements.forEach(element => {
            if (element._henceListeners) {
                element._henceListeners = null;
            }
        });
        
        // Clean up orphaned timers (check for common patterns)
        for (let i = 1; i < 10000; i++) {
            try {
                clearTimeout(i);
                clearInterval(i);
            } catch (e) {
                // Ignore errors
            }
        }
    }

    cleanupDOMReferences() {
        // Remove cached DOM references that might prevent GC
        const elements = document.querySelectorAll('[data-hence-cached]');
        elements.forEach(element => {
            element.removeAttribute('data-hence-cached');
            if (element._henceCache) {
                element._henceCache = null;
            }
        });
    }

    forceGarbageCollection() {
        if (window.gc) {
            try {
                window.gc();
                console.log('🗑️ Forced garbage collection');
                return true;
            } catch (error) {
                console.warn('⚠️ Forced garbage collection failed:', error);
            }
        }
        return false;
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getMemoryStats() {
        const current = performance.memory ? performance.memory.usedJSHeapSize : 0;
        
        return {
            ...this.memoryStats,
            currentHeap: current,
            formattedStats: {
                initial: this.formatBytes(this.memoryStats.initialHeap),
                current: this.formatBytes(current),
                peak: this.formatBytes(this.memoryStats.peakHeap),
                growth: current > 0 ? ((current / this.memoryStats.initialHeap - 1) * 100).toFixed(1) + '%' : '0%'
            }
        };
    }

    cleanup() {
        console.log('🧹 Cleaning up MemoryMonitor...');
        
        this.stopMonitoring();
        
        // Final cleanup attempt
        this.performLeakCleanup();
        this.cleanupDOMReferences();
        
        console.log('✅ MemoryMonitor cleanup completed');
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
                    console.error(`Error in Memory Monitor ${event} handler:`, error);
                }
            });
        }
    }
} 