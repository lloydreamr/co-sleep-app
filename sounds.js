// Background Sounds System for Co-Sleep App
class SoundManager {
    constructor() {
        this.sounds = {
            // Free sounds - Using generated tones (guaranteed to work)
            ocean: {
                name: "Ocean Waves",
                icon: "🌊",
                url: "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT",
                category: "nature",
                premium: false,
                description: "Gentle ocean waves for peaceful sleep"
            },
            rain: {
                name: "Rain",
                icon: "🌧️",
                url: "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT",
                category: "nature",
                premium: false,
                description: "Soft rain sounds for relaxation"
            },
            whiteNoise: {
                name: "White Noise",
                icon: "🤫",
                url: "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT",
                category: "ambient",
                premium: false,
                description: "Consistent white noise for focus"
            },
            forest: {
                name: "Forest Night",
                icon: "🌲",
                url: "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT",
                category: "nature",
                premium: false,
                description: "Peaceful forest sounds at night"
            },
            // Premium sounds (placeholder URLs)
            fireplace: {
                name: "Fireplace",
                icon: "🔥",
                url: "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT",
                category: "ambient",
                premium: true,
                description: "Crackling fireplace for warmth"
            },
            cafe: {
                name: "Cafe Ambience",
                icon: "☕",
                url: "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT",
                category: "ambient",
                premium: true,
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
            
            // Use Web Audio API to generate tones directly
            this.playGeneratedTone(soundKey, fadeIn);

            this.updateSoundUI(soundKey);
            console.log(`🎵 Playing: ${sound.name}`);
            
        } catch (error) {
            console.error('Error playing sound:', error);
        }
    }

    // Generate a tone as fallback
    playGeneratedTone(soundKey, fadeIn = true) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const gainNode = audioContext.createGain();
        
        // Create multiple oscillators for richer sounds
        const oscillators = [];
        
        // Set frequencies and types based on sound type
        let frequencies = [200];
        let types = ['sine'];
        
        switch(soundKey) {
            case 'ocean':
                frequencies = [150, 180, 220];
                types = ['sine', 'sine', 'triangle'];
                break;
            case 'rain':
                frequencies = [300, 350, 400];
                types = ['sine', 'triangle', 'sine'];
                break;
            case 'whiteNoise':
                frequencies = [100, 200, 300, 400, 500];
                types = ['sawtooth', 'sawtooth', 'sawtooth', 'sawtooth', 'sawtooth'];
                break;
            case 'forest':
                frequencies = [250, 300, 350];
                types = ['sine', 'triangle', 'sine'];
                break;
            case 'fireplace':
                frequencies = [180, 220, 260];
                types = ['sine', 'sine', 'triangle'];
                break;
            case 'cafe':
                frequencies = [400, 450, 500];
                types = ['sine', 'triangle', 'sine'];
                break;
        }
        
        // Create oscillators
        frequencies.forEach((freq, index) => {
            const oscillator = audioContext.createOscillator();
            oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
            oscillator.type = types[index];
            
            // Add slight frequency modulation for more natural sound
            if (soundKey !== 'whiteNoise') {
                oscillator.frequency.setValueAtTime(freq * 0.98, audioContext.currentTime + 0.5);
                oscillator.frequency.setValueAtTime(freq * 1.02, audioContext.currentTime + 1.0);
            }
            
            oscillator.connect(gainNode);
            oscillators.push(oscillator);
        });
        
        gainNode.connect(audioContext.destination);
        
        // Set volume based on user preference
        const targetVolume = (this.volume / 100) * 0.15; // Reduce overall volume
        
        if (fadeIn) {
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(targetVolume, audioContext.currentTime + 2);
        } else {
            gainNode.gain.setValueAtTime(targetVolume, audioContext.currentTime);
        }
        
        // Start all oscillators
        oscillators.forEach(osc => osc.start());
        this.isPlaying = true;
        
        // Store for cleanup
        this.generatedAudio = { audioContext, oscillators, gainNode };
    }

    // Stop current sound
    async stopSound(fadeOut = true) {
        if (!this.isPlaying) return;

        // Stop generated audio if playing
        if (this.generatedAudio) {
            if (fadeOut) {
                this.generatedAudio.gainNode.gain.linearRampToValueAtTime(0, this.generatedAudio.audioContext.currentTime + 2);
                setTimeout(() => {
                    this.generatedAudio.oscillators.forEach(osc => osc.stop());
                    this.generatedAudio.audioContext.close();
                    this.generatedAudio = null;
                }, 2000);
            } else {
                this.generatedAudio.oscillators.forEach(osc => osc.stop());
                this.generatedAudio.audioContext.close();
                this.generatedAudio = null;
            }
            this.isPlaying = false;
        } else {
            // Stop regular audio
            if (fadeOut) {
                await this.fadeOut();
            } else {
                this.audioElement.pause();
                this.isPlaying = false;
            }
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
        if (this.generatedAudio) {
            this.generatedAudio.oscillators.forEach(osc => osc.stop());
            this.generatedAudio.audioContext.close();
            this.generatedAudio = null;
        }
    }
}

// Global sound manager instance
window.soundManager = new SoundManager(); 