/**
 * Socket Signaling - Handles WebRTC signaling over Socket.IO
 * Extracted from SocketManager.js for better separation of concerns
 */
export class SocketSignaling {
    constructor(connection) {
        this.connection = connection;
        this.listeners = new Map();
    }

    initialize() {
        console.log('📡 SocketSignaling initializing...');
        this.setupSignalingHandlers();
    }

    setupSignalingHandlers() {
        const socket = this.connection.getSocket();
        if (!socket) {
            console.warn('⚠️ No socket available for signaling handlers');
            return;
        }

        // WebRTC signaling events
        socket.on('offer', (data) => this.handleOffer(data));
        socket.on('answer', (data) => this.handleAnswer(data));
        socket.on('ice-candidate', (data) => this.handleIceCandidate(data));
        
        console.log('📡 WebRTC signaling handlers registered');
    }

    handleOffer(data) {
        console.log('📥 Received offer from:', data.from);
        this.incrementMessageCount();
        this.emit('offer', data);
    }

    handleAnswer(data) {
        console.log('📥 Received answer from:', data.from);
        this.incrementMessageCount();
        this.emit('answer', data);
    }

    handleIceCandidate(data) {
        console.log('📥 Received ICE candidate from:', data.from);
        this.incrementMessageCount();
        this.emit('iceCandidate', data);
    }

    sendOffer(offer, targetId) {
        if (!this.connection.isSocketConnected()) {
            console.warn('⚠️ Cannot send offer: socket not connected');
            return false;
        }

        console.log('📤 Sending offer to:', targetId);
        const socket = this.connection.getSocket();
        socket.emit('offer', {
            offer: offer,
            target: targetId
        });
        
        this.incrementSentCount();
        return true;
    }

    sendAnswer(answer, targetId) {
        if (!this.connection.isSocketConnected()) {
            console.warn('⚠️ Cannot send answer: socket not connected');
            return false;
        }

        console.log('📤 Sending answer to:', targetId);
        const socket = this.connection.getSocket();
        socket.emit('answer', {
            answer: answer,
            target: targetId
        });
        
        this.incrementSentCount();
        return true;
    }

    sendIceCandidate(candidate, targetId) {
        if (!this.connection.isSocketConnected()) {
            console.warn('⚠️ Cannot send ICE candidate: socket not connected');
            return false;
        }

        console.log('📤 Sending ICE candidate to:', targetId);
        const socket = this.connection.getSocket();
        socket.emit('ice-candidate', {
            candidate: candidate,
            target: targetId
        });
        
        this.incrementSentCount();
        return true;
    }

    incrementMessageCount() {
        const stats = this.connection.getConnectionStats();
        stats.messagesReceived++;
    }

    incrementSentCount() {
        const stats = this.connection.getConnectionStats();
        stats.messagesSent++;
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
                    console.error(`Error in Socket Signaling ${event} handler:`, error);
                }
            });
        }
    }
} 