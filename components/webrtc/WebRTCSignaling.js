/**
 * WebRTC Signaling Manager - Handles offer/answer/ICE candidate exchange
 * Extracted from WebRTCManager.js for better separation of concerns
 */
export class WebRTCSignaling {
    constructor(connection) {
        this.connection = connection;
        this.listeners = new Map();
    }

    async createOffer() {
        try {
            const peerConnection = this.connection.getPeerConnection();
            if (!peerConnection) {
                throw new Error('Peer connection not established');
            }

            const offer = await peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: false
            });
            
            await peerConnection.setLocalDescription(offer);
            
            this.emit('offer', {
                offer: offer,
                target: this.connection.partnerId
            });
            
            console.log('📤 Offer created and sent');
            
        } catch (error) {
            console.error('❌ Failed to create offer:', error);
            throw error;
        }
    }

    async handleOffer(offer, fromId) {
        try {
            const peerConnection = this.connection.getPeerConnection();
            if (!peerConnection) {
                throw new Error('Peer connection not established');
            }
            
            await peerConnection.setRemoteDescription(offer);
            
            const answer = await peerConnection.createAnswer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: false
            });
            
            await peerConnection.setLocalDescription(answer);
            
            this.emit('answer', {
                answer: answer,
                target: fromId
            });
            
            console.log('📥 Offer handled, answer sent');
            
        } catch (error) {
            console.error('❌ Failed to handle offer:', error);
            this.emit('signalingError', error);
        }
    }

    async handleAnswer(answer) {
        try {
            const peerConnection = this.connection.getPeerConnection();
            if (!peerConnection) {
                throw new Error('Peer connection not established');
            }

            await peerConnection.setRemoteDescription(answer);
            console.log('✅ Answer processed successfully');
            
        } catch (error) {
            console.error('❌ Failed to handle answer:', error);
            this.emit('signalingError', error);
        }
    }

    async handleIceCandidate(candidate) {
        try {
            const peerConnection = this.connection.getPeerConnection();
            if (!peerConnection) {
                console.warn('⚠️ Cannot add ICE candidate: peer connection not established');
                return;
            }

            await peerConnection.addIceCandidate(candidate);
            
        } catch (error) {
            console.error('❌ Failed to add ICE candidate:', error);
        }
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
                    console.error(`Error in WebRTC Signaling ${event} handler:`, error);
                }
            });
        }
    }
} 