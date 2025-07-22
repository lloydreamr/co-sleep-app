// Sound Management System for Co-Sleep App
class SoundManager {
    constructor() {
        this.sounds = {
            // Nature sounds
            ocean: {
                name: 'Ocean Waves',
                description: 'Gentle ocean waves for peaceful sleep',
                url: '/public/sounds/ocean.mp3',
                category: 'nature',
                icon: 'ocean',
                volume: 0.3
            },
            rain: {
                name: 'Rain Sounds',
                description: 'Soft rainfall for relaxation',
                url: '/public/sounds/rain.mp3',
                category: 'nature',
                icon: 'rain',
                volume: 0.3
            },
            forest: {
                name: 'Forest Ambience',
                description: 'Peaceful forest sounds with birds',
                url: '/public/sounds/forest.mp3',
                category: 'nature',
                icon: 'forest',
                volume: 0.3
            },
            
            // White noise variants (basic - free)
            whiteNoise: {
                name: 'White Noise',
                description: 'Classic white noise for focus',
                url: '/public/sounds/white-noise.mp3',
                category: 'basic',
                icon: 'whiteNoise',
                volume: 0.2
            },
            brownNoise: {
                name: 'Brown Noise',
                description: 'Deep, low-frequency noise',
                url: '/public/sounds/brown-noise.mp3',
                category: 'noise',
                icon: 'brownNoise',
                volume: 0.2
            },
            pinkNoise: {
                name: 'Pink Noise',
                description: 'Balanced frequency noise',
                url: '/public/sounds/pink-noise.mp3',
                category: 'noise',
                icon: 'pinkNoise',
                volume: 0.2
            },
            
            // Indoor ambience
            fireplace: {
                name: 'Fireplace',
                description: 'Cozy fireplace crackling',
                url: '/public/sounds/fireplace.mp3',
                category: 'indoor',
                icon: 'fireplace',
                volume: 0.3
            },
            cafe: {
                name: 'Café Ambience',
                description: 'Soft café background noise',
                url: '/public/sounds/cafe.mp3',
                category: 'indoor',
                icon: 'cafe',
                volume: 0.2
            },
            fan: {
                name: 'Fan Noise',
                description: 'Steady fan white noise',
                url: '/public/sounds/fan.mp3',
                category: 'indoor',
                icon: 'fan',
                volume: 0.2
            }
        };
        
        this.activeSounds = new Map(); // Currently playing sounds
        this.audioContext = null;
        this.masterGainNode = null;
        this.globalVolume = 0.5;
        this.currentSound = null; // Currently selected sound
        
        this.init();
    }
    
    async init() {
        try {
            // Initialize Web Audio API
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGainNode = this.audioContext.createGain();
            this.masterGainNode.connect(this.audioContext.destination);
            this.masterGainNode.gain.setValueAtTime(this.globalVolume, this.audioContext.currentTime);
            
            console.log('🎵 Sound Manager initialized');
        } catch (error) {
            console.error('Failed to initialize sound manager:', error);
        }
    }
    
    // Get all available sounds
    getAvailableSounds() {
        return Object.keys(this.sounds).map(id => ({
            id,
            ...this.sounds[id],
            isPlaying: this.activeSounds.has(id),
            volume: this.activeSounds.get(id)?.gainNode?.gain?.value || this.sounds[id].volume
        }));
    }
    
    // Check if user has premium access
    async checkPremiumAccess() {
        const token = localStorage.getItem('hence_auth_token');
        if (!token) return false;
        
        try {
            const response = await fetch('/api/premium/status', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                return data.isPremium;
            }
        } catch (error) {
            console.error('Error checking premium status:', error);
        }
        return false;
    }
    
    // Play a sound
    async playSound(soundId) {
        if (!this.sounds[soundId]) {
            throw new Error(`Sound ${soundId} not found`);
        }
        
        if (this.activeSounds.has(soundId)) {
            console.log(`Sound ${soundId} is already playing`);
            return;
        }
        
        // Check premium access for premium sounds
        const isPremium = await this.checkPremiumAccess();
        const soundConfig = this.sounds[soundId];
        
        if (soundConfig.category !== 'basic' && !isPremium) {
            throw new Error('Premium subscription required for this sound');
        }
        
        try {
            const soundConfig = this.sounds[soundId];
            
            // Create audio element for easier management
            const audio = new Audio(soundConfig.url);
            audio.loop = true;
            audio.volume = 0; // We'll control volume through Web Audio API
            
            // Create audio nodes
            const source = this.audioContext.createMediaElementSource(audio);
            const gainNode = this.audioContext.createGain();
            
            // Connect audio graph
            source.connect(gainNode);
            gainNode.connect(this.masterGainNode);
            
            // Set initial volume
            gainNode.gain.setValueAtTime(soundConfig.volume, this.audioContext.currentTime);
            
            // Store sound data
            this.activeSounds.set(soundId, {
                audio,
                source,
                gainNode,
                config: soundConfig
            });
            
            // Start playing
            await audio.play();
            this.currentSound = soundId;
            
            console.log(`🎵 Playing sound: ${soundConfig.name}`);
            
            // Handle audio ended (shouldn't happen with loop, but just in case)
            audio.addEventListener('ended', () => {
                this.stopSound(soundId);
            });
            
        } catch (error) {
            console.error(`Failed to play sound ${soundId}:`, error);
            this.activeSounds.delete(soundId);
            throw error;
        }
    }
    
    // Stop a sound
    stopSound(soundId) {
        const soundData = this.activeSounds.get(soundId);
        if (!soundData) {
            console.log(`Sound ${soundId} is not playing`);
            return;
        }
        
        try {
            soundData.audio.pause();
            soundData.audio.currentTime = 0;
            soundData.source.disconnect();
            soundData.gainNode.disconnect();
            
            this.activeSounds.delete(soundId);
            
            if (this.currentSound === soundId) {
                this.currentSound = null;
            }
            
            console.log(`🔇 Stopped sound: ${soundData.config.name}`);
        } catch (error) {
            console.error(`Error stopping sound ${soundId}:`, error);
        }
    }
    
    // Toggle sound on/off
    async toggleSound(soundId) {
        if (this.activeSounds.has(soundId)) {
            this.stopSound(soundId);
            return false; // Now stopped
        } else {
            await this.playSound(soundId);
            return true; // Now playing
        }
    }
    
    // Set volume for specific sound
    setSoundVolume(soundId, volume) {
        const soundData = this.activeSounds.get(soundId);
        if (!soundData) {
            console.log(`Sound ${soundId} is not playing`);
            return;
        }
        
        // Clamp volume between 0 and 1
        volume = Math.max(0, Math.min(1, volume));
        
        try {
            soundData.gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
            soundData.config.volume = volume; // Update stored volume
            console.log(`🔊 Set volume for ${soundData.config.name}: ${Math.round(volume * 100)}%`);
        } catch (error) {
            console.error(`Error setting volume for ${soundId}:`, error);
        }
    }
    
    // Set global volume
    setGlobalVolume(volume) {
        volume = Math.max(0, Math.min(1, volume));
        this.globalVolume = volume;
        
        if (this.masterGainNode) {
            this.masterGainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
        }
        
        console.log(`🔊 Set global volume: ${Math.round(volume * 100)}%`);
    }
    
    // Stop all sounds
    stopAllSounds() {
        for (const soundId of this.activeSounds.keys()) {
            this.stopSound(soundId);
        }
        console.log('🔇 Stopped all sounds');
    }
    
    // Check if any sounds are playing
    isAnySoundPlaying() {
        return this.activeSounds.size > 0;
    }
    
    // Get currently playing sounds
    getPlayingSounds() {
        return Array.from(this.activeSounds.keys());
    }
    
    // Fade in a sound
    async fadeInSound(soundId, duration = 2000) {
        await this.playSound(soundId);
        const soundData = this.activeSounds.get(soundId);
        if (!soundData) return;
        
        const targetVolume = soundData.config.volume;
        soundData.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        soundData.gainNode.gain.linearRampToValueAtTime(targetVolume, this.audioContext.currentTime + duration / 1000);
        
        console.log(`🎵 Fading in ${soundData.config.name} over ${duration}ms`);
    }
    
    // Fade out a sound
    fadeOutSound(soundId, duration = 2000) {
        const soundData = this.activeSounds.get(soundId);
        if (!soundData) return;
        
        soundData.gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + duration / 1000);
        
        // Stop the sound after fade completes
        setTimeout(() => {
            this.stopSound(soundId);
        }, duration);
        
        console.log(`🔇 Fading out ${soundData.config.name} over ${duration}ms`);
    }
    
    // Get sound categories
    getCategories() {
        const categories = new Set();
        Object.values(this.sounds).forEach(sound => {
            categories.add(sound.category);
        });
        return Array.from(categories);
    }
    
    // Get sounds by category
    getSoundsByCategory(category) {
        return Object.keys(this.sounds)
            .filter(id => this.sounds[id].category === category)
            .map(id => ({ id, ...this.sounds[id] }));
    }
    
    // Cleanup resources
    destroy() {
        this.stopAllSounds();
        
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }
        
        this.activeSounds.clear();
        this.audioContext = null;
        this.masterGainNode = null;
        
        console.log('🎵 Sound Manager destroyed');
    }
    
    // Resume audio context (needed after user interaction)
    async resumeAudioContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
            console.log('🎵 Audio context resumed');
        }
    }
}

// Initialize global sound manager
window.soundManager = new SoundManager();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SoundManager;
} 