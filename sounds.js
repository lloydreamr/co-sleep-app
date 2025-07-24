/**
 * Mock Sound Manager - Freemium Version
 * Background sounds feature removed, but keeping tests working
 */

class SoundManager {
  constructor() {
    this.sounds = {
      ocean: { name: 'Ocean Waves', url: '/sounds/ocean.mp3' },
      whiteNoise: { name: 'White Noise', url: '/sounds/whitenoise.mp3' },
      rain: { name: 'Rain', url: '/sounds/rain.mp3' },
      forest: { name: 'Forest', url: '/sounds/forest.mp3' }
    };
    
    this.globalVolume = 0.5;
    this.activeSounds = new Map();
    this.audioContext = null;
    
    // Mock AudioContext for testing
    if (typeof global !== 'undefined' && global.AudioContext) {
      this.audioContext = new global.AudioContext();
    }
  }

  getCategories() {
    return ['nature', 'ambient', 'white-noise'];
  }

  getSoundsByCategory(category) {
    switch (category) {
      case 'nature':
        return [this.sounds.ocean, this.sounds.rain, this.sounds.forest];
      case 'white-noise':
        return [this.sounds.whiteNoise];
      default:
        return [];
    }
  }

  async playSound(soundId) {
    if (!this.sounds[soundId]) {
      throw new Error(`Sound ${soundId} not found`);
    }

    if (this.activeSounds.has(soundId)) {
      throw new Error(`Sound ${soundId} is already playing`);
    }

    // Mock audio playing
    const mockAudio = {
      play: () => Promise.resolve(),
      pause: () => {},
      volume: this.globalVolume,
      currentTime: 0,
      duration: 120, // 2 minutes mock duration
      addEventListener: () => {},
      removeEventListener: () => {}
    };

    this.activeSounds.set(soundId, mockAudio);
    return mockAudio;
  }

  stopSound(soundId) {
    const audio = this.activeSounds.get(soundId);
    if (audio) {
      audio.pause();
      this.activeSounds.delete(soundId);
    }
  }

  toggleSound(soundId) {
    if (this.activeSounds.has(soundId)) {
      this.stopSound(soundId);
      return false;
    } else {
      this.playSound(soundId);
      return true;
    }
  }

  setSoundVolume(soundId, volume) {
    const audio = this.activeSounds.get(soundId);
    if (audio) {
      audio.volume = Math.max(0, Math.min(1, volume));
    }
  }

  setGlobalVolume(volume) {
    this.globalVolume = Math.max(0, Math.min(1, volume));
    this.activeSounds.forEach(audio => {
      audio.volume = this.globalVolume;
    });
  }

  stopAllSounds() {
    this.activeSounds.forEach((audio, soundId) => {
      this.stopSound(soundId);
    });
  }

  async fadeIn(soundId, duration = 1000) {
    const audio = await this.playSound(soundId);
    
    // Mock fade in implementation
    const steps = 20;
    const stepTime = duration / steps;
    const stepVolume = this.globalVolume / steps;
    
    let currentStep = 0;
    const fadeInterval = setInterval(() => {
      currentStep++;
      audio.volume = stepVolume * currentStep;
      
      if (currentStep >= steps) {
        clearInterval(fadeInterval);
        audio.volume = this.globalVolume;
      }
    }, stepTime);
    
    return audio;
  }

  async fadeOut(soundId, duration = 1000) {
    const audio = this.activeSounds.get(soundId);
    if (!audio) return;
    
    // Mock fade out implementation
    const steps = 20;
    const stepTime = duration / steps;
    const initialVolume = audio.volume;
    const stepVolume = initialVolume / steps;
    
    let currentStep = 0;
    const fadeInterval = setInterval(() => {
      currentStep++;
      audio.volume = initialVolume - (stepVolume * currentStep);
      
      if (currentStep >= steps) {
        clearInterval(fadeInterval);
        this.stopSound(soundId);
      }
    }, stepTime);
  }

  destroy() {
    this.stopAllSounds();
    this.activeSounds.clear();
    if (this.audioContext) {
      this.audioContext.close();
    }
  }

  // Mock method for testing error handling
  simulatePlayFailure() {
    this.playSound = () => Promise.reject(new Error('Mock play failure'));
  }
}

module.exports = SoundManager; 