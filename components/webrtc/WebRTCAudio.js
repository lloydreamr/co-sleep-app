/**
 * WebRTC Audio Manager - Handles audio playback, processing, and controls
 * Extracted from WebRTCManager.js for better separation of concerns
 */
export class WebRTCAudio {
    constructor(connection) {
        this.connection = connection;
        this.audioContext = null;
        this.audioNodes = null;
        this.isMuted = false;
        this.audioElement = null;
        this.listeners = new Map();
    }

    initialize() {
        console.log('🔊 WebRTC Audio initializing...');
        
        // Set up audio processing if available
        this.setupAudioContext();
    }

    setupAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log('🎵 Audio context created');
        } catch (error) {
            console.warn('⚠️ Audio context not available:', error);
        }
    }

    playRemoteAudio(remoteStream) {
        if (!remoteStream) {
            console.warn('⚠️ No remote stream to play');
            return;
        }

        // Remove existing audio element
        const existingAudio = document.querySelector('#remote-audio');
        if (existingAudio) {
            existingAudio.remove();
        }

        // Create audio element for remote stream
        this.audioElement = document.createElement('audio');
        this.audioElement.id = 'remote-audio';
        this.audioElement.srcObject = remoteStream;
        this.audioElement.autoplay = true;
        this.audioElement.style.display = 'none';
        this.audioElement.volume = 0.8; // Slightly lower volume for comfort
        this.audioElement.preload = 'auto';
        
        // Add to DOM
        document.body.appendChild(this.audioElement);
        
        // Set up audio processing
        this.setupAudioProcessing(this.audioElement);
        
        console.log('🔊 Remote audio playing');
        this.emit('audioStarted', { type: 'remote' });
    }

    setupAudioProcessing(audioElement) {
        if (!this.audioContext || !audioElement) {
            console.log('⚠️ Audio processing unavailable');
            return;
        }

        try {
            // Create audio nodes
            const source = this.audioContext.createMediaElementSource(audioElement);
            const gainNode = this.audioContext.createGain();
            
            // Connect nodes: source -> gain -> destination
            source.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            this.audioNodes = {
                source,
                gainNode
            };
            
            console.log('🎛️ Audio processing pipeline established');
            
        } catch (error) {
            console.warn('⚠️ Failed to set up audio processing:', error);
        }
    }

    toggleMute() {
        const localStream = this.connection.getLocalStream();
        
        if (localStream) {
            const audioTracks = localStream.getAudioTracks();
            audioTracks.forEach(track => {
                track.enabled = this.isMuted;
            });
            
            this.isMuted = !this.isMuted;
            
            console.log(`🔇 Microphone ${this.isMuted ? 'muted' : 'unmuted'}`);
            this.emit('muteToggled', { isMuted: this.isMuted });
        }
        
        return this.isMuted;
    }

    setVolume(volume) {
        if (this.audioNodes && this.audioNodes.gainNode) {
            this.audioNodes.gainNode.gain.value = Math.max(0, Math.min(1, volume));
            console.log(`🔊 Volume set to ${Math.round(volume * 100)}%`);
        } else if (this.audioElement) {
            this.audioElement.volume = Math.max(0, Math.min(1, volume));
            console.log(`🔊 Audio element volume set to ${Math.round(volume * 100)}%`);
        }
    }

    cleanup() {
        console.log('🧹 Cleaning up WebRTC audio...');
        
        // Clean up audio element
        if (this.audioElement) {
            this.audioElement.remove();
            this.audioElement = null;
        }
        
        // Clean up audio context
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        this.audioNodes = null;
        this.isMuted = false;
        
        console.log('✅ WebRTC audio cleanup completed');
        this.emit('audioStopped');
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
                    console.error(`Error in WebRTC Audio ${event} handler:`, error);
                }
            });
        }
    }

    // Getters
    getMuteStatus() {
        return this.isMuted;
    }

    getAudioContext() {
        return this.audioContext;
    }
} 