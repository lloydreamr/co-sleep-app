// Background Sounds System for Co-Sleep App
class SoundManager {
    constructor() {
        this.sounds = {
            // Free sounds - Using simple tones
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
            // Premium sounds
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
            
            // Use audio element with data URL
            this.audioElement.src = sound.url;
            this.audioElement.loop = true;
            
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

    // Generate realistic ambient sounds using Web Audio API
    playGeneratedTone(soundKey, fadeIn = true) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const masterGain = audioContext.createGain();
        const nodes = [];
        
        // Set volume based on user preference
        const targetVolume = (this.volume / 100) * 0.2;
        
        if (fadeIn) {
            masterGain.gain.setValueAtTime(0, audioContext.currentTime);
            masterGain.gain.linearRampToValueAtTime(targetVolume, audioContext.currentTime + 3);
        } else {
            masterGain.gain.setValueAtTime(targetVolume, audioContext.currentTime);
        }
        
        masterGain.connect(audioContext.destination);
        
        switch(soundKey) {
            case 'ocean':
                this.createOceanWaves(audioContext, masterGain, nodes);
                break;
            case 'rain':
                this.createRain(audioContext, masterGain, nodes);
                break;
            case 'whiteNoise':
                this.createWhiteNoise(audioContext, masterGain, nodes);
                break;
            case 'forest':
                this.createForest(audioContext, masterGain, nodes);
                break;
            case 'fireplace':
                this.createFireplace(audioContext, masterGain, nodes);
                break;
            case 'cafe':
                this.createCafe(audioContext, masterGain, nodes);
                break;
        }
        
        this.isPlaying = true;
        this.generatedAudio = { audioContext, nodes, masterGain };
    }
    
    // Create ocean waves sound
    createOceanWaves(audioContext, masterGain, nodes) {
        // Main wave sound (low frequency oscillator)
        const waveOsc = audioContext.createOscillator();
        const waveGain = audioContext.createGain();
        const waveFilter = audioContext.createBiquadFilter();
        
        waveOsc.frequency.setValueAtTime(0.5, audioContext.currentTime); // Very slow wave
        waveOsc.type = 'sine';
        
        waveFilter.type = 'lowpass';
        waveFilter.frequency.setValueAtTime(800, audioContext.currentTime);
        waveFilter.Q.setValueAtTime(0.5, audioContext.currentTime);
        
        waveGain.gain.setValueAtTime(0.3, audioContext.currentTime);
        
        waveOsc.connect(waveFilter);
        waveFilter.connect(waveGain);
        waveGain.connect(masterGain);
        
        // Secondary wave (higher frequency)
        const wave2Osc = audioContext.createOscillator();
        const wave2Gain = audioContext.createGain();
        const wave2Filter = audioContext.createBiquadFilter();
        
        wave2Osc.frequency.setValueAtTime(1.2, audioContext.currentTime);
        wave2Osc.type = 'sine';
        
        wave2Filter.type = 'lowpass';
        wave2Filter.frequency.setValueAtTime(600, audioContext.currentTime);
        wave2Filter.Q.setValueAtTime(0.3, audioContext.currentTime);
        
        wave2Gain.gain.setValueAtTime(0.2, audioContext.currentTime);
        
        wave2Osc.connect(wave2Filter);
        wave2Filter.connect(wave2Gain);
        wave2Gain.connect(masterGain);
        
        // Add frequency modulation for wave movement
        const waveMod = audioContext.createOscillator();
        waveMod.frequency.setValueAtTime(0.1, audioContext.currentTime);
        waveMod.connect(waveOsc.frequency);
        waveMod.connect(wave2Osc.frequency);
        
        waveOsc.start();
        wave2Osc.start();
        waveMod.start();
        
        nodes.push(waveOsc, wave2Osc, waveMod, waveGain, wave2Gain, waveFilter, wave2Filter);
    }
    
    // Create rain sound
    createRain(audioContext, masterGain, nodes) {
        // Create multiple rain drops with different frequencies
        for (let i = 0; i < 8; i++) {
            const dropOsc = audioContext.createOscillator();
            const dropGain = audioContext.createGain();
            const dropFilter = audioContext.createBiquadFilter();
            
            // Random frequency for each drop
            const freq = 200 + Math.random() * 800;
            dropOsc.frequency.setValueAtTime(freq, audioContext.currentTime);
            dropOsc.type = 'triangle';
            
            dropFilter.type = 'lowpass';
            dropFilter.frequency.setValueAtTime(1000, audioContext.currentTime);
            dropFilter.Q.setValueAtTime(0.5, audioContext.currentTime);
            
            // Random volume and timing
            const volume = 0.1 + Math.random() * 0.2;
            dropGain.gain.setValueAtTime(0, audioContext.currentTime);
            dropGain.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.1);
            dropGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
            
            dropOsc.connect(dropFilter);
            dropFilter.connect(dropGain);
            dropGain.connect(masterGain);
            
            // Start with random delay
            const delay = Math.random() * 2;
            dropOsc.start(audioContext.currentTime + delay);
            dropOsc.stop(audioContext.currentTime + delay + 0.3);
            
            nodes.push(dropOsc, dropGain, dropFilter);
        }
        
        // Background rain noise
        const rainNoise = audioContext.createOscillator();
        const rainNoiseGain = audioContext.createGain();
        const rainNoiseFilter = audioContext.createBiquadFilter();
        
        rainNoise.frequency.setValueAtTime(100, audioContext.currentTime);
        rainNoise.type = 'sawtooth';
        
        rainNoiseFilter.type = 'lowpass';
        rainNoiseFilter.frequency.setValueAtTime(500, audioContext.currentTime);
        
        rainNoiseGain.gain.setValueAtTime(0.05, audioContext.currentTime);
        
        rainNoise.connect(rainNoiseFilter);
        rainNoiseFilter.connect(rainNoiseGain);
        rainNoiseGain.connect(masterGain);
        
        rainNoise.start();
        nodes.push(rainNoise, rainNoiseGain, rainNoiseFilter);
    }
    
    // Create white noise
    createWhiteNoise(audioContext, masterGain, nodes) {
        // Create multiple noise generators
        for (let i = 0; i < 3; i++) {
            const noiseOsc = audioContext.createOscillator();
            const noiseGain = audioContext.createGain();
            const noiseFilter = audioContext.createBiquadFilter();
            
            noiseOsc.frequency.setValueAtTime(50 + i * 100, audioContext.currentTime);
            noiseOsc.type = 'sawtooth';
            
            noiseFilter.type = 'lowpass';
            noiseFilter.frequency.setValueAtTime(2000 + i * 500, audioContext.currentTime);
            noiseFilter.Q.setValueAtTime(0.3, audioContext.currentTime);
            
            noiseGain.gain.setValueAtTime(0.1, audioContext.currentTime);
            
            noiseOsc.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(masterGain);
            
            noiseOsc.start();
            nodes.push(noiseOsc, noiseGain, noiseFilter);
        }
    }
    
    // Create forest night sounds
    createForest(audioContext, masterGain, nodes) {
        // Cricket sounds
        for (let i = 0; i < 4; i++) {
            const cricketOsc = audioContext.createOscillator();
            const cricketGain = audioContext.createGain();
            const cricketFilter = audioContext.createBiquadFilter();
            
            cricketOsc.frequency.setValueAtTime(2000 + Math.random() * 1000, audioContext.currentTime);
            cricketOsc.type = 'sine';
            
            cricketFilter.type = 'bandpass';
            cricketFilter.frequency.setValueAtTime(2500, audioContext.currentTime);
            cricketFilter.Q.setValueAtTime(2, audioContext.currentTime);
            
            cricketGain.gain.setValueAtTime(0.05, audioContext.currentTime);
            
            cricketOsc.connect(cricketFilter);
            cricketFilter.connect(cricketGain);
            cricketGain.connect(masterGain);
            
            cricketOsc.start();
            nodes.push(cricketOsc, cricketGain, cricketFilter);
        }
        
        // Wind through trees
        const windOsc = audioContext.createOscillator();
        const windGain = audioContext.createGain();
        const windFilter = audioContext.createBiquadFilter();
        
        windOsc.frequency.setValueAtTime(0.5, audioContext.currentTime);
        windOsc.type = 'sine';
        
        windFilter.type = 'lowpass';
        windFilter.frequency.setValueAtTime(300, audioContext.currentTime);
        
        windGain.gain.setValueAtTime(0.1, audioContext.currentTime);
        
        windOsc.connect(windFilter);
        windFilter.connect(windGain);
        windGain.connect(masterGain);
        
        windOsc.start();
        nodes.push(windOsc, windGain, windFilter);
    }
    
    // Create fireplace sound
    createFireplace(audioContext, masterGain, nodes) {
        // Crackling fire
        for (let i = 0; i < 6; i++) {
            const crackleOsc = audioContext.createOscillator();
            const crackleGain = audioContext.createGain();
            const crackleFilter = audioContext.createBiquadFilter();
            
            crackleOsc.frequency.setValueAtTime(100 + Math.random() * 200, audioContext.currentTime);
            crackleOsc.type = 'triangle';
            
            crackleFilter.type = 'highpass';
            crackleFilter.frequency.setValueAtTime(800, audioContext.currentTime);
            
            crackleGain.gain.setValueAtTime(0, audioContext.currentTime);
            crackleGain.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + 0.05);
            crackleGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2);
            
            crackleOsc.connect(crackleFilter);
            crackleFilter.connect(crackleGain);
            crackleGain.connect(masterGain);
            
            const delay = Math.random() * 3;
            crackleOsc.start(audioContext.currentTime + delay);
            crackleOsc.stop(audioContext.currentTime + delay + 0.2);
            
            nodes.push(crackleOsc, crackleGain, crackleFilter);
        }
        
        // Fire base sound
        const fireOsc = audioContext.createOscillator();
        const fireGain = audioContext.createGain();
        const fireFilter = audioContext.createBiquadFilter();
        
        fireOsc.frequency.setValueAtTime(80, audioContext.currentTime);
        fireOsc.type = 'sawtooth';
        
        fireFilter.type = 'lowpass';
        fireFilter.frequency.setValueAtTime(400, audioContext.currentTime);
        
        fireGain.gain.setValueAtTime(0.2, audioContext.currentTime);
        
        fireOsc.connect(fireFilter);
        fireFilter.connect(fireGain);
        fireGain.connect(masterGain);
        
        fireOsc.start();
        nodes.push(fireOsc, fireGain, fireFilter);
    }
    
    // Create cafe ambience
    createCafe(audioContext, masterGain, nodes) {
        // Background chatter (low frequency noise)
        const chatterOsc = audioContext.createOscillator();
        const chatterGain = audioContext.createGain();
        const chatterFilter = audioContext.createBiquadFilter();
        
        chatterOsc.frequency.setValueAtTime(150, audioContext.currentTime);
        chatterOsc.type = 'sawtooth';
        
        chatterFilter.type = 'lowpass';
        chatterFilter.frequency.setValueAtTime(800, audioContext.currentTime);
        
        chatterGain.gain.setValueAtTime(0.1, audioContext.currentTime);
        
        chatterOsc.connect(chatterFilter);
        chatterFilter.connect(chatterGain);
        chatterGain.connect(masterGain);
        
        chatterOsc.start();
        nodes.push(chatterOsc, chatterGain, chatterFilter);
        
        // Coffee machine sounds
        for (let i = 0; i < 3; i++) {
            const coffeeOsc = audioContext.createOscillator();
            const coffeeGain = audioContext.createGain();
            const coffeeFilter = audioContext.createBiquadFilter();
            
            coffeeOsc.frequency.setValueAtTime(300 + Math.random() * 200, audioContext.currentTime);
            coffeeOsc.type = 'square';
            
            coffeeFilter.type = 'bandpass';
            coffeeFilter.frequency.setValueAtTime(400, audioContext.currentTime);
            coffeeFilter.Q.setValueAtTime(1, audioContext.currentTime);
            
            coffeeGain.gain.setValueAtTime(0, audioContext.currentTime);
            coffeeGain.gain.linearRampToValueAtTime(0.08, audioContext.currentTime + 0.1);
            coffeeGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
            
            coffeeOsc.connect(coffeeFilter);
            coffeeFilter.connect(coffeeGain);
            coffeeGain.connect(masterGain);
            
            const delay = Math.random() * 4;
            coffeeOsc.start(audioContext.currentTime + delay);
            coffeeOsc.stop(audioContext.currentTime + delay + 0.5);
            
            nodes.push(coffeeOsc, coffeeGain, coffeeFilter);
        }
    }

    // Simple tone fallback for when Web Audio API fails
    playSimpleTone(soundKey, fadeIn = true) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        // Set frequency and type based on sound
        let frequency = 200;
        let type = 'sine';
        
        switch(soundKey) {
            case 'ocean':
                frequency = 150;
                type = 'sine';
                break;
            case 'rain':
                frequency = 300;
                type = 'triangle';
                break;
            case 'whiteNoise':
                frequency = 100;
                type = 'sawtooth';
                break;
            case 'forest':
                frequency = 250;
                type = 'sine';
                break;
            case 'fireplace':
                frequency = 180;
                type = 'triangle';
                break;
            case 'cafe':
                frequency = 400;
                type = 'square';
                break;
        }
        
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        oscillator.type = type;
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        const targetVolume = (this.volume / 100) * 0.1;
        
        if (fadeIn) {
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(targetVolume, audioContext.currentTime + 2);
        } else {
            gainNode.gain.setValueAtTime(targetVolume, audioContext.currentTime);
        }
        
        oscillator.start();
        this.isPlaying = true;
        this.generatedAudio = { audioContext, nodes: [oscillator], masterGain: gainNode };
    }

    // Stop current sound
    async stopSound(fadeOut = true) {
        if (!this.isPlaying) return;

        // Stop generated audio if playing
        if (this.generatedAudio) {
            if (fadeOut) {
                this.generatedAudio.masterGain.gain.linearRampToValueAtTime(0, this.generatedAudio.audioContext.currentTime + 2);
                setTimeout(() => {
                    this.generatedAudio.nodes.forEach(node => {
                        if (node.stop) node.stop();
                    });
                    this.generatedAudio.audioContext.close();
                    this.generatedAudio = null;
                }, 2000);
            } else {
                this.generatedAudio.nodes.forEach(node => {
                    if (node.stop) node.stop();
                });
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
            this.generatedAudio.nodes.forEach(node => {
                if (node.stop) node.stop();
            });
            this.generatedAudio.audioContext.close();
            this.generatedAudio = null;
        }
    }
}

// Global sound manager instance
window.soundManager = new SoundManager(); 