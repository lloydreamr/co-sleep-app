// Background Sounds System for Co-Sleep App
class SoundManager {
    constructor() {
                this.sounds = {
            // All sounds are now free - Real ambient audio files
            ocean: {
                name: "Ocean Waves",
                icon: "waves",
                url: "https://www.soundjay.com/nature/sounds/ocean-wave-1.mp3",
                category: "nature",
                premium: false,
                description: "Gentle ocean waves for peaceful sleep"
            },
            rain: {
                name: "Rain",
                icon: "rain",
                url: "https://www.soundjay.com/nature/sounds/rain-01.mp3",
                category: "nature",
                premium: false,
                description: "Soft rain sounds for relaxation"
            },
            whiteNoise: {
                name: "White Noise",
                icon: "noise",
                url: "https://www.soundjay.com/mechanical/sounds/white-noise-1.mp3",
                category: "ambient",
                premium: false,
                description: "Consistent white noise for focus"
            },
            forest: {
                name: "Forest Night",
                icon: "forest",
                url: "https://www.soundjay.com/nature/sounds/forest-night-1.mp3",
                category: "nature",
                premium: false,
                description: "Peaceful forest sounds at night"
            },
            fireplace: {
                name: "Fireplace",
                icon: "fire",
                url: "https://www.soundjay.com/mechanical/sounds/fireplace-1.mp3",
                category: "ambient",
                premium: false,
                description: "Crackling fireplace for warmth"
            },
            cafe: {
                name: "Cafe Ambience",
                icon: "cafe",
                url: "https://www.soundjay.com/mechanical/sounds/cafe-ambience-1.mp3",
                category: "ambient",
                premium: false,
                description: "Soft cafe background sounds"
            }
        };

        this.currentSound = null;
        this.audioElement = null;
        this.volume = 0.3; // Default volume (30%)
        this.isPlaying = false;
        this.fadeInterval = null;
    }



    // Initialize sound manager
    init() {
        this.createAudioElement();
        this.setupVolumeControl();
        console.log('🎵 Sound Manager initialized');
    }

    // Create audio element for background sounds
    createAudioElement() {
        this.audioElement = document.createElement('audio');
        this.audioElement.loop = true;
        this.audioElement.volume = this.volume;
        this.audioElement.preload = 'auto';
        document.body.appendChild(this.audioElement);
    }

    // Setup volume control
    setupVolumeControl() {
        const volumeSlider = document.getElementById('sound-volume');
        if (volumeSlider) {
            volumeSlider.value = this.volume * 100;
            volumeSlider.addEventListener('input', (e) => {
                this.setVolume(e.target.value / 100);
            });
        }
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

    // Play a specific sound
    async playSound(soundKey, fadeIn = true) {
        const sound = this.sounds[soundKey];
        if (!sound) {
            console.error('Sound not found:', soundKey);
            return;
        }

        // Check if premium sound and user has access
        if (sound.premium && !this.hasPremiumAccess()) {
            console.log('Premium sound requires upgrade');
            this.showPremiumUpgrade();
            return;
        }

        try {
            // Stop current sound if playing
            if (this.isPlaying) {
                await this.stopSound();
            }

            // Set new sound
            this.currentSound = soundKey;
            
            // Play real ambient sounds with seamless looping
            this.audioElement.src = sound.url;
            this.audioElement.loop = true;
            
            // Ensure seamless looping by setting crossfade
            this.audioElement.addEventListener('ended', () => {
                if (this.isPlaying) {
                    this.audioElement.currentTime = 0;
                    this.audioElement.play();
                }
            });
            
            if (fadeIn) {
                this.fadeIn();
            } else {
                this.audioElement.volume = this.volume;
                this.audioElement.play();
                this.isPlaying = true;
            }

            this.updateSoundUI(soundKey);
            console.log(`🎵 Playing: ${sound.name}`);
            
        } catch (error) {
            console.error('Error playing sound:', error);
        }
    }


    

    


    // Stop current sound
    async stopSound(fadeOut = true) {
        if (!this.isPlaying) return;

        // Stop audio element
        if (fadeOut) {
            await this.fadeOut();
        } else {
            this.audioElement.pause();
            this.isPlaying = false;
        }

        this.currentSound = null;
        this.updateSoundUI(null);
        console.log('🎵 Sound stopped');
    }

    // Fade in sound
    fadeIn(duration = 2000) {
        this.audioElement.volume = 0;
        this.audioElement.play();
        this.isPlaying = true;

        const steps = 20;
        const stepDuration = duration / steps;
        const volumeStep = this.volume / steps;
        let currentStep = 0;

        this.fadeInterval = setInterval(() => {
            currentStep++;
            this.audioElement.volume = Math.min(volumeStep * currentStep, this.volume);
            
            if (currentStep >= steps) {
                clearInterval(this.fadeInterval);
                this.fadeInterval = null;
            }
        }, stepDuration);
    }

    // Fade out sound
    async fadeOut(duration = 2000) {
        const steps = 20;
        const stepDuration = duration / steps;
        const volumeStep = this.audioElement.volume / steps;
        let currentStep = 0;

        return new Promise((resolve) => {
            this.fadeInterval = setInterval(() => {
                currentStep++;
                this.audioElement.volume = Math.max(this.audioElement.volume - volumeStep, 0);
                
                if (currentStep >= steps) {
                    clearInterval(this.fadeInterval);
                    this.fadeInterval = null;
                    this.audioElement.pause();
                    this.isPlaying = false;
                    resolve();
                }
            }, stepDuration);
        });
    }

    // Set volume
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        if (this.audioElement) {
            this.audioElement.volume = this.volume;
        }
        
        // Update volume slider if exists
        const volumeSlider = document.getElementById('sound-volume');
        if (volumeSlider) {
            volumeSlider.value = this.volume * 100;
        }
        
        console.log(`🔊 Volume set to: ${Math.round(this.volume * 100)}%`);
    }

    // Get current volume
    getVolume() {
        return this.volume;
    }

    // Check if user has premium access
    hasPremiumAccess() {
        // TODO: Implement premium check from user profile
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        return user.isPremium || false;
    }

    // Show premium upgrade prompt
    showPremiumUpgrade() {
        const modal = document.createElement('div');
        modal.className = 'premium-modal';
        modal.innerHTML = `
            <div class="premium-content">
                <h3>🌟 Premium Feature</h3>
                <p>Upgrade to Premium to access exclusive background sounds!</p>
                <div class="premium-features">
                    <div>🔥 Fireplace</div>
                    <div>☕ Cafe Ambience</div>
                    <div>🎵 Custom Sounds</div>
                </div>
                <button onclick="upgradePremium()" class="upgrade-btn">
                    <i class="fas fa-crown"></i> Upgrade Now
                </button>
                <button onclick="this.parentElement.parentElement.remove()" class="close-btn">
                    <i class="fas fa-times"></i> Maybe Later
                </button>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // Update sound UI
    updateSoundUI(soundKey) {
        const soundName = document.getElementById('current-sound-name');
        const soundIcon = document.getElementById('current-sound-icon');
        
        if (soundName && soundIcon) {
            if (soundKey && this.sounds[soundKey]) {
                const sound = this.sounds[soundKey];
                soundName.textContent = sound.name;
                soundIcon.textContent = sound.icon;
                soundIcon.className = 'sound-icon active';
            } else {
                soundName.textContent = 'No sound';
                soundIcon.textContent = '🔇';
                soundIcon.className = 'sound-icon';
            }
        }
    }

    // Cleanup
    destroy() {
        if (this.fadeInterval) {
            clearInterval(this.fadeInterval);
        }
        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.remove();
        }
    }
}

// Global sound manager instance
window.soundManager = new SoundManager(); 