/**
 * WebRTC Monitor - Handles connection monitoring, quality tracking, and failure handling
 * Extracted from WebRTCManager.js for better separation of concerns
 */
export class WebRTCMonitor {
    constructor(connection) {
        this.connection = connection;
        this.connectionMonitor = null;
        this.connectionTimeout = null;
        this.retryCount = 0;
        this.maxRetries = 3;
        this.listeners = new Map();
        
        this.connectionStats = {
            startTime: null,
            endTime: null,
            quality: 'unknown'
        };
    }

    startConnectionMonitoring() {
        if (!this.connection.getPeerConnection()) {
            console.warn('⚠️ Cannot start monitoring: no peer connection');
            return;
        }

        this.connectionMonitor = setInterval(() => {
            const state = this.connection.getPeerConnection().connectionState;
            const iceState = this.connection.getPeerConnection().iceConnectionState;
            
            if (state === 'failed' || iceState === 'failed') {
                this.handleConnectionFailure();
            }
        }, 2000);
        
        console.log('📊 Connection monitoring started');
        this.connectionStats.startTime = Date.now();
    }

    stopConnectionMonitoring() {
        if (this.connectionMonitor) {
            clearInterval(this.connectionMonitor);
            this.connectionMonitor = null;
            console.log('📊 Connection monitoring stopped');
        }
    }

    updateConnectionQuality(iceState) {
        let quality = 'unknown';
        
        switch (iceState) {
            case 'connected':
            case 'completed':
                quality = 'excellent';
                break;
            case 'checking':
                quality = 'good';
                break;
            case 'disconnected':
                quality = 'poor';
                break;
            case 'failed':
                quality = 'failed';
                break;
            default:
                quality = 'unknown';
        }
        
        this.connectionStats.quality = quality;
        this.emit('qualityUpdate', { quality, iceState });
    }

    handleConnectionEstablished() {
        console.log('🎉 WebRTC connection established successfully');
        
        // Clear connection timeout
        if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
        }
        
        // Reset retry count
        this.retryCount = 0;
        
        this.emit('connectionEstablished');
    }

    handleConnectionFailure() {
        console.error('❌ WebRTC connection failed');
        
        if (this.retryCount < this.maxRetries) {
            this.retryCount++;
            console.log(`🔄 Retrying connection (${this.retryCount}/${this.maxRetries})...`);
            
            setTimeout(() => {
                this.retryConnection();
            }, 2000 * this.retryCount); // Exponential backoff
            
        } else {
            console.error('❌ Max retries reached, giving up');
            this.emit('connectionFailed', { reason: 'max_retries_reached' });
        }
    }

    async retryConnection() {
        try {
            console.log('🔄 Attempting connection retry...');
            
            if (this.connection.isInitiator) {
                // Recreate offer for initiator
                this.emit('retrySignaling', { type: 'offer' });
            }
            
        } catch (error) {
            console.error('❌ Retry failed:', error);
            this.handleConnectionFailure();
        }
    }

    handleConnectionDisruption() {
        console.warn('⚠️ Connection disrupted, attempting to reconnect...');
        this.emit('connectionDisrupted');
    }

    setConnectionTimeout(timeout = 30000) {
        if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
        }
        
        this.connectionTimeout = setTimeout(() => {
            if (!this.connection.isConnected()) {
                console.log('⏰ Connection timeout triggered');
                this.handleConnectionFailure();
            }
        }, timeout);
    }

    endConnection() {
        console.log('📞 Ending WebRTC connection...');
        
        this.connectionStats.endTime = Date.now();
        this.stopConnectionMonitoring();
        
        if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
        }
        
        this.emit('connectionEnded', this.getConnectionStats());
    }

    cleanup() {
        console.log('🧹 Cleaning up WebRTC monitor...');
        
        this.stopConnectionMonitoring();
        
        if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
        }
        
        this.retryCount = 0;
        this.connectionStats = {
            startTime: null,
            endTime: null,
            quality: 'unknown'
        };
        
        console.log('✅ WebRTC monitor cleanup completed');
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
                    console.error(`Error in WebRTC Monitor ${event} handler:`, error);
                }
            });
        }
    }

    // Getters
    getConnectionStats() {
        const stats = { ...this.connectionStats };
        
        if (stats.startTime && stats.endTime) {
            stats.duration = stats.endTime - stats.startTime;
        } else if (stats.startTime) {
            stats.duration = Date.now() - stats.startTime;
        }
        
        return stats;
    }

    getConnectionQuality() {
        return this.connectionStats.quality;
    }

    getRetryCount() {
        return this.retryCount;
    }
} 