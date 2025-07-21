// Tone Generator for Ambient Sounds
class ToneGenerator {
    constructor() {
        this.sampleRate = 44100;
        this.duration = 10; // 10 seconds
    }

    // Generate a simple sine wave tone
    generateSineWave(frequency, duration = this.duration) {
        const samples = Math.floor(this.sampleRate * duration);
        const audioData = new Float32Array(samples);
        
        for (let i = 0; i < samples; i++) {
            audioData[i] = Math.sin(2 * Math.PI * frequency * i / this.sampleRate) * 0.3;
        }
        
        return this.convertToWav(audioData);
    }

    // Generate white noise
    generateWhiteNoise(duration = this.duration) {
        const samples = Math.floor(this.sampleRate * duration);
        const audioData = new Float32Array(samples);
        
        for (let i = 0; i < samples; i++) {
            audioData[i] = (Math.random() * 2 - 1) * 0.1;
        }
        
        return this.convertToWav(audioData);
    }

    // Generate pink noise (filtered white noise)
    generatePinkNoise(duration = this.duration) {
        const samples = Math.floor(this.sampleRate * duration);
        const audioData = new Float32Array(samples);
        
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        
        for (let i = 0; i < samples; i++) {
            const white = (Math.random() * 2 - 1) * 0.1;
            
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            
            audioData[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
            b6 = white * 0.115926;
        }
        
        return this.convertToWav(audioData);
    }

    // Convert Float32Array to WAV format
    convertToWav(audioData) {
        const buffer = new ArrayBuffer(44 + audioData.length * 2);
        const view = new DataView(buffer);
        
        // WAV header
        const writeString = (offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };
        
        writeString(0, 'RIFF');
        view.setUint32(4, 36 + audioData.length * 2, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, this.sampleRate, true);
        view.setUint32(28, this.sampleRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        writeString(36, 'data');
        view.setUint32(40, audioData.length * 2, true);
        
        // Convert audio data to 16-bit PCM
        let offset = 44;
        for (let i = 0; i < audioData.length; i++) {
            const sample = Math.max(-1, Math.min(1, audioData[i]));
            view.setInt16(offset, sample * 0x7FFF, true);
            offset += 2;
        }
        
        // Convert to base64
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        
        return 'data:audio/wav;base64,' + btoa(binary);
    }

    // Generate specific ambient sounds
    generateOceanWaves() {
        // Low frequency sine wave for ocean waves
        return this.generateSineWave(0.5); // 0.5 Hz for very slow waves
    }

    generateRain() {
        // Higher frequency noise for rain
        return this.generatePinkNoise();
    }

    generateWhiteNoise() {
        return this.generateWhiteNoise();
    }

    generateForest() {
        // Medium frequency sine wave for forest ambience
        return this.generateSineWave(2); // 2 Hz for gentle forest sounds
    }

    generateFireplace() {
        // Low frequency noise for fireplace
        return this.generatePinkNoise();
    }

    generateCafe() {
        // Medium frequency noise for cafe ambience
        return this.generatePinkNoise();
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ToneGenerator;
} else {
    window.ToneGenerator = ToneGenerator;
} 