// Background Sounds System for Co-Sleep App - Multi-Sound Support
class SoundManager {
    constructor() {
        this.sounds = {
            // All sounds are now free - Real ambient audio files with fallbacks
            ocean: {
                name: "Ocean Waves",
                icon: "waves",
                url: "https://www.soundjay.com/nature/sounds/ocean-wave-1.mp3",
                fallbackUrl: "https://www.soundjay.com/mechanical/sounds/ocean-wave-2.mp3",
                category: "nature",
                premium: false,
                description: "Gentle ocean waves for peaceful sleep"
            },
            rain: {
                name: "Rain",
                icon: "rain",
                url: "https://www.soundjay.com/nature/sounds/rain-01.mp3",
                fallbackUrl: "https://www.soundjay.com/mechanical/sounds/rain-02.mp3",
                category: "nature",
                premium: false,
                description: "Soft rain sounds for relaxation"
            },
            whiteNoise: {
                name: "White Noise",
                icon: "noise",
                url: "https://www.soundjay.com/mechanical/sounds/white-noise-1.mp3",
                fallbackUrl: "https://www.soundjay.com/mechanical/sounds/white-noise-2.mp3",
                category: "ambient",
                premium: false,
                description: "Consistent white noise for focus"
            },
            forest: {
                name: "Forest Night",
                icon: "forest",
                url: "https://www.soundjay.com/nature/sounds/forest-night-1.mp3",
                fallbackUrl: "https://www.soundjay.com/mechanical/sounds/forest-night-2.mp3",
                category: "nature",
                premium: false,
                description: "Peaceful forest sounds at night"
            },
            fireplace: {
                name: "Fireplace",
                icon: "fire",
                url: "https://www.soundjay.com/mechanical/sounds/fireplace-1.mp3",
                fallbackUrl: "https://www.soundjay.com/mechanical/sounds/fireplace-2.mp3",
                category: "ambient",
                premium: false,
                description: "Crackling fireplace for warmth"
            },
            cafe: {
                name: "Cafe Ambience",
                icon: "cafe",
                url: "https://www.soundjay.com/mechanical/sounds/cafe-ambience-1.mp3",
                fallbackUrl: "https://www.soundjay.com/mechanical/sounds/cafe-ambience-2.mp3",
                category: "ambient",
                premium: false,
                description: "Soft cafe background sounds"
            }
        };
        
        // Multi-sound support - Map of active sounds
        this.activeSounds = new Map(); // soundKey -> { audioElement, volume, isPlaying }
        this.defaultVolume = 0.5;
        this.fadeInterval = null;
    }

    // Initialize sound manager
    init() {
        this.setupEventListeners();
        console.log('🎵 Multi-Sound Manager initialized');
    }

    // Setup event listeners for sound controls
    setupEventListeners() {
        // Main play button
        const mainPlayBtn = document.getElementById('main-play-btn');
        if (mainPlayBtn) {
            mainPlayBtn.addEventListener('click', () => {
                this.toggleSoundPanel();
            });
        }

        // Sound count button
        const soundCountBtn = document.querySelector('.sound-count-btn');
        if (soundCountBtn) {
            soundCountBtn.addEventListener('click', () => {
                this.toggleSoundPanel();
            });
        }

        // Close sound panel - use event delegation for better reliability
        document.addEventListener('click', (e) => {
            if (e.target.closest('#close-sound-panel')) {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔒 Close button clicked');
                this.hideSoundPanel();
            }
        });

        // Keyboard escape to close sound panel
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const soundPanel = document.getElementById('sound-panel');
                if (soundPanel && !soundPanel.classList.contains('hidden')) {
                    console.log('🔒 Escape key pressed - closing sound panel');
                    this.hideSoundPanel();
                }
            }
        });

        // Click outside to close sound panel
        document.addEventListener('click', (e) => {
            const soundPanel = document.getElementById('sound-panel');
            if (soundPanel && !soundPanel.classList.contains('hidden')) {
                // Check if click is outside the sound panel
                if (!soundPanel.contains(e.target) && !e.target.closest('#main-play-btn') && !e.target.closest('.sound-count-btn')) {
                    console.log('🔒 Clicked outside - closing sound panel');
                    this.hideSoundPanel();
                }
            }
        });

        // Setup individual sound controls
        this.setupSoundControls();
    }

    // Setup individual sound controls
    setupSoundControls() {
        const soundItems = document.querySelectorAll('.sound-item');
        soundItems.forEach(item => {
            const soundKey = item.dataset.sound;
            const toggleBtn = item.querySelector('.sound-toggle');
            const volumeSlider = item.querySelector('.sound-volume');

            if (toggleBtn) {
                toggleBtn.addEventListener('click', () => {
                    this.toggleSound(soundKey);
                });
            }

            if (volumeSlider) {
                volumeSlider.addEventListener('input', (e) => {
                    this.setSoundVolume(soundKey, e.target.value / 100);
                });
            }
        });
    }

    // Toggle sound panel visibility
    toggleSoundPanel() {
        const soundPanel = document.getElementById('sound-panel');
        if (soundPanel) {
            soundPanel.classList.toggle('hidden');
            if (!soundPanel.classList.contains('hidden')) {
                this.showSoundPanel();
            }
        }
    }

    // Show sound panel
    showSoundPanel() {
        const soundPanel = document.getElementById('sound-panel');
        if (soundPanel) {
            soundPanel.classList.remove('hidden');
            // Update UI to reflect current state
            this.updateAllSoundUI();
        }
    }

    // Hide sound panel
    hideSoundPanel() {
        const soundPanel = document.getElementById('sound-panel');
        if (soundPanel) {
            soundPanel.classList.add('hidden');
            console.log('🎵 Sound panel hidden');
        } else {
            console.error('❌ Sound panel not found');
        }
    }

    // Toggle individual sound
    async toggleSound(soundKey) {
        if (this.activeSounds.has(soundKey)) {
            await this.stopSound(soundKey);
        } else {
            await this.playSound(soundKey);
        }
        this.updateSoundUI(soundKey);
    }

    // Play individual sound
    async playSound(soundKey) {
        if (!this.sounds[soundKey]) {
            console.error('Sound not found:', soundKey);
            return;
        }

        const sound = this.sounds[soundKey];
        
        // Check premium access for premium sounds
        if (sound.premium && !this.hasPremiumAccess()) {
            this.showPremiumUpgrade();
            return;
        }

        try {
            // Create new audio element for this sound
            const audioElement = document.createElement('audio');
            audioElement.src = sound.url;
            audioElement.loop = true;
            audioElement.preload = 'auto';
            audioElement.volume = this.defaultVolume;
            
            // Store in active sounds
            this.activeSounds.set(soundKey, {
                audioElement: audioElement,
                volume: this.defaultVolume,
                isPlaying: false
            });
            
            // Play the sound
            await audioElement.play();
            this.activeSounds.get(soundKey).isPlaying = true;
            
            console.log(`🎵 Playing: ${sound.name}`);
            
        } catch (error) {
            console.error('Error playing sound:', error);
            // Try fallback URL
            await this.playFallbackSound(soundKey);
        }
    }

    // Stop individual sound
    async stopSound(soundKey) {
        const soundData = this.activeSounds.get(soundKey);
        if (!soundData) return;

        try {
            soundData.audioElement.pause();
            soundData.audioElement.remove();
            this.activeSounds.delete(soundKey);
            console.log(`🎵 Stopped: ${this.sounds[soundKey]?.name || soundKey}`);
        } catch (error) {
            console.error('Error stopping sound:', error);
        }
    }

    // Set volume for individual sound
    setSoundVolume(soundKey, volume) {
        const soundData = this.activeSounds.get(soundKey);
        if (soundData) {
            soundData.volume = volume;
            soundData.audioElement.volume = volume;
            console.log(`🔊 Volume set for ${soundKey}: ${Math.round(volume * 100)}%`);
        }
    }

    // Get volume for individual sound
    getSoundVolume(soundKey) {
        const soundData = this.activeSounds.get(soundKey);
        return soundData ? soundData.volume : this.defaultVolume;
    }

    // Play fallback sound if main URL fails
    async playFallbackSound(soundKey) {
        const sound = this.sounds[soundKey];
        if (!sound || !sound.fallbackUrl) {
            console.error('No fallback URL available for:', soundKey);
            return;
        }

        try {
            console.log(`🔄 Trying fallback URL for ${sound.name}`);
            const audioElement = document.createElement('audio');
            audioElement.src = sound.fallbackUrl;
            audioElement.loop = true;
            audioElement.preload = 'auto';
            audioElement.volume = this.defaultVolume;
            
            this.activeSounds.set(soundKey, {
                audioElement: audioElement,
                volume: this.defaultVolume,
                isPlaying: false
            });
            
            await audioElement.play();
            this.activeSounds.get(soundKey).isPlaying = true;
            console.log(`🎵 Playing fallback: ${sound.name}`);
            
        } catch (fallbackError) {
            console.error('Fallback sound also failed:', fallbackError);
            this.activeSounds.delete(soundKey);
        }
    }

    // Update UI for specific sound
    updateSoundUI(soundKey) {
        const soundItem = document.querySelector(`[data-sound="${soundKey}"]`);
        if (!soundItem) return;

        const toggleBtn = soundItem.querySelector('.sound-toggle');
        const volumeSlider = soundItem.querySelector('.sound-volume');
        const isPlaying = this.activeSounds.has(soundKey);

        if (toggleBtn) {
            toggleBtn.classList.toggle('playing', isPlaying);
        }

        if (volumeSlider) {
            volumeSlider.value = this.getSoundVolume(soundKey) * 100;
        }
    }

    // Update UI for all sounds
    updateAllSoundUI() {
        Object.keys(this.sounds).forEach(soundKey => {
            this.updateSoundUI(soundKey);
        });
    }

    // Get all available sounds
    getSounds(category = null, premiumOnly = false) {
        let sounds = Object.entries(this.sounds);
        
        if (category) {
            sounds = sounds.filter(([key, sound]) => sound.category === category);
        }
        
        if (premiumOnly) {
            sounds = sounds.filter(([key, sound]) => sound.premium);
        }
        
        return Object.fromEntries(sounds);
    }

    // Get free sounds only
    getFreeSounds() {
        return this.getSounds(null, false);
    }

    // Check if user has premium access
    hasPremiumAccess() {
        // For now, all sounds are free
        return true;
    }

    // Show premium upgrade modal
    showPremiumUpgrade() {
        console.log('Premium upgrade required');
        // Implement premium upgrade UI
    }

    // Stop all sounds
    async stopAllSounds() {
        for (const [soundKey, soundData] of this.activeSounds) {
            await this.stopSound(soundKey);
        }
        this.updateAllSoundUI();
    }

    // Get currently playing sounds
    getActiveSounds() {
        return Array.from(this.activeSounds.keys());
    }

    // Check if any sounds are playing
    isAnySoundPlaying() {
        return this.activeSounds.size > 0;
    }

    // Destroy sound manager
    destroy() {
        this.stopAllSounds();
        this.activeSounds.clear();
        console.log('🎵 Sound Manager destroyed');
    }
} 